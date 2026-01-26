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

// ============================================
// 订单通知相关接口
// ============================================

/**
 * 订单通知基础字段
 */
export interface OrderNotificationBase {
  orderNo: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  paymentMethod: string;
  username?: string | null;
}

/**
 * 新订单通知
 */
export interface NewOrderNotificationPayload extends OrderNotificationBase {
  createdAt: Date;
  expiredAt: Date;
}

/**
 * 支付成功通知
 */
export interface PaymentSuccessNotificationPayload extends OrderNotificationBase {
  tradeNo: string;
  paidAt: Date;
}

/**
 * 退款申请通知
 */
export interface RefundRequestNotificationPayload extends OrderNotificationBase {
  tradeNo?: string | null;
  refundReason: string;
  refundRequestedAt: Date;
}

/**
 * 退款成功通知
 */
export interface RefundApprovedNotificationPayload extends OrderNotificationBase {
  tradeNo?: string | null;
  refundedAt: Date;
  adminRemark?: string | null;
}

/**
 * 退款拒绝通知
 */
export interface RefundRejectedNotificationPayload extends OrderNotificationBase {
  refundReason?: string | null;
  adminRemark?: string | null;
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
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
  } finally {
    // 确保任何路径都清理定时器，避免资源泄漏
    clearTimeout(timeoutId);
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ldc: "Linux DO Credit",
  alipay: "支付宝",
  wechat: "微信支付",
  usdt: "USDT",
};

function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] || method;
}

function buildNewOrderMessage(p: NewOrderNotificationPayload): string {
  return `🧾 <b>新订单</b>

<b>订单号:</b> <code>${escapeHtml(p.orderNo)}</code>
<b>商品:</b> ${escapeHtml(p.productName)}
<b>数量:</b> ${p.quantity}
<b>金额:</b> ¥${escapeHtml(p.totalAmount)}
<b>支付方式:</b> ${getPaymentMethodLabel(p.paymentMethod)}
<b>用户:</b> ${escapeHtml(p.username || "未知")}
<b>下单时间:</b> ${formatTimestamp(p.createdAt)}
<b>过期时间:</b> ${formatTimestamp(p.expiredAt)}`;
}

function buildPaymentSuccessMessage(p: PaymentSuccessNotificationPayload): string {
  return `✅ <b>支付成功</b>

<b>订单号:</b> <code>${escapeHtml(p.orderNo)}</code>
<b>流水号:</b> <code>${escapeHtml(p.tradeNo)}</code>
<b>商品:</b> ${escapeHtml(p.productName)}
<b>数量:</b> ${p.quantity}
<b>金额:</b> ¥${escapeHtml(p.totalAmount)}
<b>支付方式:</b> ${getPaymentMethodLabel(p.paymentMethod)}
<b>用户:</b> ${escapeHtml(p.username || "未知")}
<b>支付时间:</b> ${formatTimestamp(p.paidAt)}`;
}

function buildRefundRequestMessage(p: RefundRequestNotificationPayload): string {
  return `🔄 <b>退款申请</b>

<b>订单号:</b> <code>${escapeHtml(p.orderNo)}</code>${p.tradeNo ? `\n<b>流水号:</b> <code>${escapeHtml(p.tradeNo)}</code>` : ""}
<b>商品:</b> ${escapeHtml(p.productName)}
<b>数量:</b> ${p.quantity}
<b>金额:</b> ¥${escapeHtml(p.totalAmount)}
<b>用户:</b> ${escapeHtml(p.username || "未知")}
<b>退款原因:</b> ${escapeHtml(p.refundReason)}
<b>申请时间:</b> ${formatTimestamp(p.refundRequestedAt)}`;
}

function buildRefundApprovedMessage(p: RefundApprovedNotificationPayload): string {
  return `💰 <b>退款成功</b>

<b>订单号:</b> <code>${escapeHtml(p.orderNo)}</code>${p.tradeNo ? `\n<b>流水号:</b> <code>${escapeHtml(p.tradeNo)}</code>` : ""}
<b>商品:</b> ${escapeHtml(p.productName)}
<b>数量:</b> ${p.quantity}
<b>金额:</b> ¥${escapeHtml(p.totalAmount)}
<b>用户:</b> ${escapeHtml(p.username || "未知")}${p.adminRemark ? `\n<b>备注:</b> ${escapeHtml(p.adminRemark)}` : ""}
<b>退款时间:</b> ${formatTimestamp(p.refundedAt)}`;
}

function buildRefundRejectedMessage(p: RefundRejectedNotificationPayload): string {
  return `❌ <b>退款拒绝</b>

<b>订单号:</b> <code>${escapeHtml(p.orderNo)}</code>
<b>商品:</b> ${escapeHtml(p.productName)}
<b>数量:</b> ${p.quantity}
<b>金额:</b> ¥${escapeHtml(p.totalAmount)}
<b>用户:</b> ${escapeHtml(p.username || "未知")}${p.refundReason ? `\n<b>退款原因:</b> ${escapeHtml(p.refundReason)}` : ""}${p.adminRemark ? `\n<b>拒绝原因:</b> ${escapeHtml(p.adminRemark)}` : ""}`;
}

export interface TelegramConfigWithToggles extends TelegramConfig {
  notifyOrderCreated: boolean;
  notifyPaymentSuccess: boolean;
  notifyRefundRequested: boolean;
  notifyRefundApproved: boolean;
  notifyRefundRejected: boolean;
}

function checkConfigAndToggle(
  config: TelegramConfigWithToggles,
  toggleKey: keyof Omit<TelegramConfigWithToggles, keyof TelegramConfig>,
  notificationType: string
): TelegramSendResult | null {
  if (!config.enabled) {
    return { success: false, message: "Telegram 通知未启用" };
  }
  if (!config.botToken || !config.chatId) {
    console.warn(`[Telegram] 配置不完整，跳过发送${notificationType}通知`);
    return { success: false, message: "配置不完整" };
  }
  if (!config[toggleKey]) {
    return { success: false, message: `${notificationType}通知未启用` };
  }
  return null;
}

export async function sendNewOrderNotification(
  config: TelegramConfigWithToggles,
  payload: NewOrderNotificationPayload
): Promise<TelegramSendResult> {
  const skipResult = checkConfigAndToggle(config, "notifyOrderCreated", "新订单");
  if (skipResult) return skipResult;

  const message = buildNewOrderMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(`[Telegram] 新订单通知已发送: 订单号=${payload.orderNo}`);
  }
  return result;
}

export async function sendPaymentSuccessNotification(
  config: TelegramConfigWithToggles,
  payload: PaymentSuccessNotificationPayload
): Promise<TelegramSendResult> {
  const skipResult = checkConfigAndToggle(config, "notifyPaymentSuccess", "支付成功");
  if (skipResult) return skipResult;

  const message = buildPaymentSuccessMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(`[Telegram] 支付成功通知已发送: 订单号=${payload.orderNo}`);
  }
  return result;
}

export async function sendRefundRequestNotification(
  config: TelegramConfigWithToggles,
  payload: RefundRequestNotificationPayload
): Promise<TelegramSendResult> {
  const skipResult = checkConfigAndToggle(config, "notifyRefundRequested", "退款申请");
  if (skipResult) return skipResult;

  const message = buildRefundRequestMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(`[Telegram] 退款申请通知已发送: 订单号=${payload.orderNo}`);
  }
  return result;
}

export async function sendRefundApprovedNotification(
  config: TelegramConfigWithToggles,
  payload: RefundApprovedNotificationPayload
): Promise<TelegramSendResult> {
  const skipResult = checkConfigAndToggle(config, "notifyRefundApproved", "退款成功");
  if (skipResult) return skipResult;

  const message = buildRefundApprovedMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(`[Telegram] 退款成功通知已发送: 订单号=${payload.orderNo}`);
  }
  return result;
}

export async function sendRefundRejectedNotification(
  config: TelegramConfigWithToggles,
  payload: RefundRejectedNotificationPayload
): Promise<TelegramSendResult> {
  const skipResult = checkConfigAndToggle(config, "notifyRefundRejected", "退款拒绝");
  if (skipResult) return skipResult;

  const message = buildRefundRejectedMessage(payload);
  const result = await sendTelegramMessage(config.botToken, config.chatId, message);

  if (result.success) {
    console.log(`[Telegram] 退款拒绝通知已发送: 订单号=${payload.orderNo}`);
  }
  return result;
}
