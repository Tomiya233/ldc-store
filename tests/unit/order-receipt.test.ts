import { beforeEach, describe, expect, it, vi } from "vitest";

// 为什么这样做：订单 actions 依赖 Drizzle Schema/DB 连接，这里用 mock 隔离测试，避免单测初始化真实数据库连接。
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ op: "and", args }),
  eq: (...args: unknown[]) => ({ op: "eq", args }),
  inArray: (...args: unknown[]) => ({ op: "inArray", args }),
  desc: (value: unknown) => value,
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

const findFirstMock = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    query: {
      orders: {
        findFirst: (...args: unknown[]) => findFirstMock(...args),
      },
    },
  },
  orders: {},
  cards: {},
  products: {},
}));

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  getRequestIdFromHeaders: async () => undefined,
}));

import { getOrderReceiptByNo } from "@/lib/actions/orders";

describe("getOrderReceiptByNo", () => {
  beforeEach(() => {
    authMock.mockReset();
    findFirstMock.mockReset();
  });

  it("should reject when user is not logged in", async () => {
    authMock.mockResolvedValueOnce(null);

    const result = await getOrderReceiptByNo("LD_TEST");

    expect(result.success).toBe(false);
    expect(result.message).toContain("请先登录");
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("should reject when orderNo is invalid", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "u1", provider: "linux-do" },
    });

    const result = await getOrderReceiptByNo("   ");

    expect(result.success).toBe(false);
    expect(result.message).toBe("订单号无效");
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("should return error when order is not found or not paid", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "u1", provider: "linux-do" },
    });
    findFirstMock.mockResolvedValueOnce(null);

    const result = await getOrderReceiptByNo("LD_NOT_FOUND");

    expect(result.success).toBe(false);
    expect(result.message).toBe("订单不存在或未完成支付");
  });

  it("should return receipt data for paid/completed order", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "u1", provider: "linux-do" },
    });
    const paidAt = new Date("2026-01-01T00:00:00.000Z");
    findFirstMock.mockResolvedValueOnce({
      orderNo: "LD_OK",
      productName: "Pro Plan",
      totalAmount: "10.00",
      paidAt,
      username: "  tester  ",
    });

    const result = await getOrderReceiptByNo("LD_OK");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      orderNo: "LD_OK",
      productName: "Pro Plan",
      totalAmount: "10.00",
      paidAt,
      username: "tester",
    });
  });
});
