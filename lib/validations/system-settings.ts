import { z } from "zod";

export const SITE_ICON_OPTIONS = [
  "Store",
  "Sparkles",
  "ShoppingCart",
  "Package",
  "CreditCard",
  "Gem",
  "Rocket",
  "Shield",
  "Zap",
] as const;

export type SiteIconOption = (typeof SITE_ICON_OPTIONS)[number];

export const systemSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, "请输入网站名称")
    .max(50, "网站名称最多 50 个字符"),
  siteDescription: z
    .string()
    .trim()
    .max(200, "网站描述最多 200 个字符")
    .default(""),
  siteIcon: z.enum(SITE_ICON_OPTIONS).default("Store"),
  orderExpireMinutes: z
    .number({ error: "请输入数字" })
    .int("必须为整数")
    .min(1, "至少 1 分钟")
    .max(1440, "最大 1440 分钟"),
});

export type SystemSettingsInput = z.input<typeof systemSettingsSchema>;
export type SystemSettings = z.output<typeof systemSettingsSchema>;
