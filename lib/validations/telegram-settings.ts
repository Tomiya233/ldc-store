import { z } from "zod";

/**
 * Telegram 机器人配置校验 Schema
 * - 用于后台系统配置中的 Telegram 通知功能
 */
export const telegramSettingsSchema = z.object({
  telegramEnabled: z.boolean().default(false),
  telegramBotToken: z
    .string()
    .trim()
    .max(100, "Bot Token 最多 100 个字符")
    .default("")
    .refine(
      (val) => !val || /^\d+:[A-Za-z0-9_-]+$/.test(val),
      "Bot Token 格式不正确（应为 123456:ABC-DEF...）"
    ),
  telegramChatId: z
    .string()
    .trim()
    .max(50, "Chat ID 最多 50 个字符")
    .default("")
    .refine(
      (val) => !val || /^-?\d+$/.test(val) || /^@\w+$/.test(val),
      "Chat ID 格式不正确（应为数字或 @username）"
    ),
});

export type TelegramSettingsInput = z.input<typeof telegramSettingsSchema>;
export type TelegramSettings = z.output<typeof telegramSettingsSchema>;
