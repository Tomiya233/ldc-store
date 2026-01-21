/**
 * Telegram 机器人通知模块
 * - 用于发送催补货通知到 Telegram 群组/频道
 * - 采用 fire-and-forget 模式，不阻塞主流程
 */

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface RestockNotificationPayload {
  productId: string;
  productName: string;
  availableStock: number;
  username: string;
  timestamp: Date;
}

export interface TelegramSendResult {
  success: boolean;
  message: string;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";
const REQUEST_TIMEOUT_MS = 10000;

/**
 * 转义 HTML 特殊字符，防止注入
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 格式化时间为本地时间字符串
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: process.env.STATS_TIMEZONE || "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 构建催补货通知消息（HTML 格式）
 */
function buildRestockMessage(payload: RestockNotificationPayload): string {
  const { productId, productName, availableStock, username, timestamp } = payload;

  return `📦 <b>催补货通知</b>

<b>商品:</b> ${escapeHtml(productName)}
<b>商品 ID:</b> <code>${escapeHtml(productId)}</code>
<b>当前库存:</b> ${availableStock} 件
<b>请求用户:</b> ${escapeHtml(username)}
<b>请求时间:</b> ${formatTimestamp(timestamp)}`;
}

/**
 * 脱敏 Bot Token 用于日志输出
 */
function maskBotToken(token: string): string {
  if (!token || token.length < 10) return "***";
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

/**
 * 发送消息到 Telegram
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<TelegramSendResult> {
  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const errorDesc = data.description || `HTTP ${response.status}`;
      console.error(
        `[Telegram] 发送失败: ${errorDesc} (token: ${maskBotToken(botToken)}, chatId: ${chatId})`
      );
      return { success: false, message: errorDesc };
    }

    return { success: true, message: "发送成功" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error(
      `[Telegram] 请求异常: ${errorMessage} (token: ${maskBotToken(botToken)}, chatId: ${chatId})`
    );
    return { success: false, message: errorMessage };
  }
}

/**
 * 发送催补货通知
 * - 如果配置未启用或不完整，静默跳过
 * - 发送失败仅记录日志，不抛出异常
 */
export async function sendRestockNotification(
  config: TelegramConfig,
  payload: RestockNotificationPayload
): Promise<TelegramSendResult> {
  // 配置未启用，静默跳过
  if (!config.enabled) {
    return { success: false, message: "Telegram 通知未启用" };
  }

  // 配置不完整，静默跳过
  if (!config.botToken || !config.chatId) {
    console.warn("[Telegram] 配置不完整，跳过发送催补货通知");
    return { success: false, message: "配置不完整" };
  }

  const message = buildRestockMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(
      `[Telegram] 催补货通知已发送: 商品=${payload.productName}, 用户=${payload.username}`
    );
  }

  return result;
}

/**
 * 测试 Telegram 连接
 * - 发送一条测试消息验证配置是否正确
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<TelegramSendResult> {
  if (!botToken || !chatId) {
    return { success: false, message: "请填写 Bot Token 和 Chat ID" };
  }

  const testMessage = `✅ <b>Telegram 通知测试</b>

连接测试成功！
时间: ${formatTimestamp(new Date())}

此消息由 LDC Store 发送。`;

  return sendTelegramMessage(botToken, chatId, testMessage);
}
