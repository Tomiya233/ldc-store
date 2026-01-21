"use server";

import { db, settings } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { revalidateAllStoreCache } from "@/lib/cache";
import { getOrderExpireMinutes } from "@/lib/order-config";
import { systemSettingsSchema, type SystemSettings, type SystemSettingsInput } from "@/lib/validations/system-settings";
import { inArray, sql } from "drizzle-orm";

const SYSTEM_SETTING_KEYS = {
  siteName: "site.name",
  siteDescription: "site.description",
  siteIcon: "site.icon",
  orderExpireMinutes: "order.expire_minutes",
  telegramEnabled: "telegram.enabled",
  telegramBotToken: "telegram.bot_token",
  telegramChatId: "telegram.chat_id",
} as const;

export async function getSystemSettings(): Promise<SystemSettings> {
  const envSiteName = process.env.NEXT_PUBLIC_SITE_NAME || "LDC Store";
  const envSiteDescription =
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "基于 Linux DO Credit 的虚拟商品自动发卡平台";

  const keys = Object.values(SYSTEM_SETTING_KEYS);
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys));

  const map = new Map<string, string | null>(rows.map((row) => [row.key, row.value]));

  const rawExpireMinutes = map.get(SYSTEM_SETTING_KEYS.orderExpireMinutes);
  const parsedExpireMinutes = Number.parseInt(String(rawExpireMinutes ?? ""), 10);
  const expireMinutes = Number.isFinite(parsedExpireMinutes)
    ? parsedExpireMinutes
    : getOrderExpireMinutes();

  const candidate = {
    siteName: (map.get(SYSTEM_SETTING_KEYS.siteName) ?? envSiteName) || envSiteName,
    siteDescription:
      (map.get(SYSTEM_SETTING_KEYS.siteDescription) ?? envSiteDescription) ||
      envSiteDescription,
    siteIcon: map.get(SYSTEM_SETTING_KEYS.siteIcon) ?? "Store",
    orderExpireMinutes: expireMinutes,
    // Telegram 配置
    telegramEnabled: map.get(SYSTEM_SETTING_KEYS.telegramEnabled) === "true",
    telegramBotToken: map.get(SYSTEM_SETTING_KEYS.telegramBotToken) ?? "",
    telegramChatId: map.get(SYSTEM_SETTING_KEYS.telegramChatId) ?? "",
  };

  // 为什么这样做：DB 配置是运行时数据，可能被写入非法值；这里用 safeParse 兜底，避免因“单个脏字段”导致整站 500。
  const parsed = systemSettingsSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  console.warn("系统配置存在非法值，已回退到默认配置:", parsed.error.issues);
  return {
    siteName: envSiteName,
    siteDescription: envSiteDescription,
    siteIcon: "Store",
    orderExpireMinutes: getOrderExpireMinutes(),
    telegramEnabled: false,
    telegramBotToken: "",
    telegramChatId: "",
  };
}

export async function updateSystemSettings(input: SystemSettingsInput): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, message: "需要管理员权限" };
  }

  const validationResult = systemSettingsSchema.safeParse(input);
  if (!validationResult.success) {
    return {
      success: false,
      message: validationResult.error.issues[0]?.message || "参数错误",
    };
  }

  const now = new Date();
  const {
    siteName,
    siteDescription,
    siteIcon,
    orderExpireMinutes,
    telegramEnabled,
    telegramBotToken,
    telegramChatId,
  } = validationResult.data;

  try {
    // 为什么这样做：系统配置需要"可覆盖 + 可回滚"；用 key-value 做幂等 upsert，避免多次保存产生重复记录。
    await db
      .insert(settings)
      .values([
        {
          key: SYSTEM_SETTING_KEYS.siteName,
          value: siteName,
          description: "网站名称",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.siteDescription,
          value: siteDescription,
          description: "网站描述",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.siteIcon,
          value: siteIcon,
          description: "网站图标（Lucide icon name）",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.orderExpireMinutes,
          value: String(orderExpireMinutes),
          description: "订单过期时间（分钟）",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.telegramEnabled,
          value: String(telegramEnabled),
          description: "Telegram 通知开关",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.telegramBotToken,
          value: telegramBotToken,
          description: "Telegram Bot Token",
          updatedAt: now,
        },
        {
          key: SYSTEM_SETTING_KEYS.telegramChatId,
          value: telegramChatId,
          description: "Telegram Chat ID",
          updatedAt: now,
        },
      ])
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: sql`excluded.value`,
          description: sql`excluded.description`,
          updatedAt: now,
        },
      });

    // 为什么这样做：前台页面包含 ISR 缓存；配置更新后需要主动清理，确保用户“马上看到”新配置。
    await revalidateAllStoreCache();

    return { success: true, message: "系统配置已更新（已热生效）" };
  } catch (error) {
    console.error("更新系统配置失败:", error);
    return { success: false, message: "更新失败，请稍后重试" };
  }
}

/**
 * 获取 Telegram 配置（供通知模块内部调用）
 * - 不需要管理员权限，因为只在服务端内部使用
 */
export async function getTelegramConfig(): Promise<{
  enabled: boolean;
  botToken: string;
  chatId: string;
}> {
  const keys = [
    SYSTEM_SETTING_KEYS.telegramEnabled,
    SYSTEM_SETTING_KEYS.telegramBotToken,
    SYSTEM_SETTING_KEYS.telegramChatId,
  ];

  try {
    const rows = await db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(inArray(settings.key, keys));

    const map = new Map<string, string | null>(rows.map((row) => [row.key, row.value]));

    return {
      enabled: map.get(SYSTEM_SETTING_KEYS.telegramEnabled) === "true",
      botToken: map.get(SYSTEM_SETTING_KEYS.telegramBotToken) ?? "",
      chatId: map.get(SYSTEM_SETTING_KEYS.telegramChatId) ?? "",
    };
  } catch (error) {
    console.error("[getTelegramConfig] 获取 Telegram 配置失败:", error);
    return { enabled: false, botToken: "", chatId: "" };
  }
}
