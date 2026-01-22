import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendRestockNotification,
  testTelegramConnection,
  type TelegramConfig,
  type RestockNotificationPayload,
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
});
