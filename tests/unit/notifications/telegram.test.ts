import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendRestockNotification,
  testTelegramConnection,
  sendNewOrderNotification,
  sendPaymentSuccessNotification,
  sendRefundRequestNotification,
  sendRefundApprovedNotification,
  sendRefundRejectedNotification,
  type TelegramConfig,
  type TelegramConfigWithToggles,
  type RestockNotificationPayload,
  type NewOrderNotificationPayload,
  type PaymentSuccessNotificationPayload,
  type RefundRequestNotificationPayload,
  type RefundApprovedNotificationPayload,
  type RefundRejectedNotificationPayload,
} from "@/lib/notifications/telegram";

describe("Telegram 通知模块", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sendRestockNotification", () => {
    const validConfig: TelegramConfig = {
      enabled: true,
      botToken: "123456:ABC-DEF",
      chatId: "-1001234567890",
    };

    const validPayload: RestockNotificationPayload = {
      productId: "prod-123",
      productName: "测试商品",
      availableStock: 0,
      username: "testuser",
      timestamp: new Date("2026-01-21T10:00:00Z"),
    };

    it("enabled=false 时跳过发送", async () => {
      const config = { ...validConfig, enabled: false };
      const result = await sendRestockNotification(config, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Telegram 通知未启用");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("配置不完整时跳过发送（无 botToken）", async () => {
      const config = { ...validConfig, botToken: "" };
      const result = await sendRestockNotification(config, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("配置不完整");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("配置不完整时跳过发送（无 chatId）", async () => {
      const config = { ...validConfig, chatId: "" };
      const result = await sendRestockNotification(config, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("配置不完整");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("正确调用 Telegram API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await sendRestockNotification(validConfig, validPayload);

      expect(result.success).toBe(true);
      expect(result.message).toBe("发送成功");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.telegram.org/bot123456:ABC-DEF/sendMessage");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.parse(options.body);
      expect(body.chat_id).toBe("-1001234567890");
      expect(body.parse_mode).toBe("HTML");
      expect(body.text).toContain("催补货通知");
      expect(body.text).toContain("测试商品");
      expect(body.text).toContain("testuser");
    });

    it("API 返回错误时返回失败结果", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, description: "Bad Request: chat not found" }),
      });

      const result = await sendRestockNotification(validConfig, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Bad Request: chat not found");
    });

    it("网络错误时返回失败结果（不抛出异常）", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendRestockNotification(validConfig, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
    });

    it("请求超时时返回失败结果", async () => {
      mockFetch.mockRejectedValueOnce(new Error("AbortError"));

      const result = await sendRestockNotification(validConfig, validPayload);

      expect(result.success).toBe(false);
      expect(result.message).toBe("AbortError");
    });
  });

  describe("testTelegramConnection", () => {
    it("缺少 botToken 时返回错误", async () => {
      const result = await testTelegramConnection("", "-1001234567890");

      expect(result.success).toBe(false);
      expect(result.message).toBe("请填写 Bot Token 和 Chat ID");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("缺少 chatId 时返回错误", async () => {
      const result = await testTelegramConnection("123456:ABC-DEF", "");

      expect(result.success).toBe(false);
      expect(result.message).toBe("请填写 Bot Token 和 Chat ID");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("配置正确时发送测试消息", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const result = await testTelegramConnection("123456:ABC-DEF", "-1001234567890");

      expect(result.success).toBe(true);
      expect(result.message).toBe("发送成功");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.telegram.org/bot123456:ABC-DEF/sendMessage");

      const body = JSON.parse(options.body);
      expect(body.chat_id).toBe("-1001234567890");
      expect(body.text).toContain("Telegram 通知测试");
      expect(body.text).toContain("连接测试成功");
    });

    it("发送失败时返回错误信息", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ ok: false, description: "Unauthorized" }),
      });

      const result = await testTelegramConnection("invalid-token", "-1001234567890");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Unauthorized");
    });
  });

  describe("订单通知", () => {
    const baseConfig: TelegramConfigWithToggles = {
      enabled: true,
      botToken: "123456:ABC-DEF",
      chatId: "-1001234567890",
      notifyOrderCreated: true,
      notifyPaymentSuccess: true,
      notifyRefundRequested: true,
      notifyRefundApproved: true,
      notifyRefundRejected: true,
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
    });

    describe("sendNewOrderNotification", () => {
      const payload: NewOrderNotificationPayload = {
        orderNo: "LD123456",
        productName: "测试商品",
        quantity: 2,
        totalAmount: "99.00",
        paymentMethod: "ldc",
        username: "testuser",
        createdAt: new Date("2026-01-21T10:00:00Z"),
        expiredAt: new Date("2026-01-21T10:05:00Z"),
      };

      it("enabled=false 时跳过发送", async () => {
        const config = { ...baseConfig, enabled: false };
        const result = await sendNewOrderNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("Telegram 通知未启用");
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("toggle=false 时跳过发送", async () => {
        const config = { ...baseConfig, notifyOrderCreated: false };
        const result = await sendNewOrderNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("新订单通知未启用");
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it("正确发送新订单通知", async () => {
        const result = await sendNewOrderNotification(baseConfig, payload);
        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("新订单");
        expect(body.text).toContain("LD123456");
        expect(body.text).toContain("测试商品");
        expect(body.text).toContain("testuser");
      });

      it("正确转义 HTML 特殊字符", async () => {
        const payloadWithHtml: NewOrderNotificationPayload = {
          ...payload,
          productName: "<script>alert('xss')</script>",
          username: "user&name",
        };
        await sendNewOrderNotification(baseConfig, payloadWithHtml);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("&lt;script&gt;");
        expect(body.text).toContain("user&amp;name");
        expect(body.text).not.toContain("<script>");
      });
    });

    describe("sendPaymentSuccessNotification", () => {
      const payload: PaymentSuccessNotificationPayload = {
        orderNo: "LD123456",
        productName: "测试商品",
        quantity: 1,
        totalAmount: "50.00",
        paymentMethod: "ldc",
        username: "testuser",
        tradeNo: "TRX789",
        paidAt: new Date("2026-01-21T10:01:00Z"),
      };

      it("toggle=false 时跳过发送", async () => {
        const config = { ...baseConfig, notifyPaymentSuccess: false };
        const result = await sendPaymentSuccessNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("支付成功通知未启用");
      });

      it("正确发送支付成功通知", async () => {
        const result = await sendPaymentSuccessNotification(baseConfig, payload);
        expect(result.success).toBe(true);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("支付成功");
        expect(body.text).toContain("TRX789");
        expect(body.text).toContain("¥50.00");
      });
    });

    describe("sendRefundRequestNotification", () => {
      const payload: RefundRequestNotificationPayload = {
        orderNo: "LD123456",
        productName: "测试商品",
        quantity: 1,
        totalAmount: "50.00",
        paymentMethod: "ldc",
        username: "testuser",
        tradeNo: "TRX789",
        refundReason: "商品有问题",
        refundRequestedAt: new Date("2026-01-21T11:00:00Z"),
      };

      it("toggle=false 时跳过发送", async () => {
        const config = { ...baseConfig, notifyRefundRequested: false };
        const result = await sendRefundRequestNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("退款申请通知未启用");
      });

      it("正确发送退款申请通知", async () => {
        const result = await sendRefundRequestNotification(baseConfig, payload);
        expect(result.success).toBe(true);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("退款申请");
        expect(body.text).toContain("商品有问题");
      });
    });

    describe("sendRefundApprovedNotification", () => {
      const payload: RefundApprovedNotificationPayload = {
        orderNo: "LD123456",
        productName: "测试商品",
        quantity: 1,
        totalAmount: "50.00",
        paymentMethod: "ldc",
        username: "testuser",
        tradeNo: "TRX789",
        refundedAt: new Date("2026-01-21T12:00:00Z"),
        adminRemark: "已核实退款",
      };

      it("toggle=false 时跳过发送", async () => {
        const config = { ...baseConfig, notifyRefundApproved: false };
        const result = await sendRefundApprovedNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("退款成功通知未启用");
      });

      it("正确发送退款成功通知", async () => {
        const result = await sendRefundApprovedNotification(baseConfig, payload);
        expect(result.success).toBe(true);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("退款成功");
        expect(body.text).toContain("已核实退款");
      });
    });

    describe("sendRefundRejectedNotification", () => {
      const payload: RefundRejectedNotificationPayload = {
        orderNo: "LD123456",
        productName: "测试商品",
        quantity: 1,
        totalAmount: "50.00",
        paymentMethod: "ldc",
        username: "testuser",
        refundReason: "不想要了",
        adminRemark: "不符合退款条件",
      };

      it("toggle=false 时跳过发送", async () => {
        const config = { ...baseConfig, notifyRefundRejected: false };
        const result = await sendRefundRejectedNotification(config, payload);
        expect(result.success).toBe(false);
        expect(result.message).toBe("退款拒绝通知未启用");
      });

      it("正确发送退款拒绝通知", async () => {
        const result = await sendRefundRejectedNotification(baseConfig, payload);
        expect(result.success).toBe(true);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.text).toContain("退款拒绝");
        expect(body.text).toContain("不符合退款条件");
      });
    });
  });
});
