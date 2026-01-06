import { describe, expect, it } from "vitest";

import { DEFAULT_ORDER_EXPIRE_MINUTES, getOrderExpireMinutes } from "@/lib/order-config";

describe("getOrderExpireMinutes", () => {
  it("should fallback to default when env is missing", () => {
    const original = process.env.ORDER_EXPIRE_MINUTES;
    // 为什么这样做：单元测试要避免污染全局 env，确保并行/顺序运行都稳定。
    try {
      delete process.env.ORDER_EXPIRE_MINUTES;
      expect(getOrderExpireMinutes()).toBe(DEFAULT_ORDER_EXPIRE_MINUTES);
    } finally {
      if (original === undefined) {
        delete process.env.ORDER_EXPIRE_MINUTES;
      } else {
        process.env.ORDER_EXPIRE_MINUTES = original;
      }
    }
  });

  it("should parse valid minutes from env", () => {
    const original = process.env.ORDER_EXPIRE_MINUTES;
    try {
      process.env.ORDER_EXPIRE_MINUTES = "9";
      expect(getOrderExpireMinutes()).toBe(9);
    } finally {
      if (original === undefined) {
        delete process.env.ORDER_EXPIRE_MINUTES;
      } else {
        process.env.ORDER_EXPIRE_MINUTES = original;
      }
    }
  });

  it("should fallback when env is invalid", () => {
    const original = process.env.ORDER_EXPIRE_MINUTES;
    try {
      process.env.ORDER_EXPIRE_MINUTES = "not-a-number";
      expect(getOrderExpireMinutes()).toBe(DEFAULT_ORDER_EXPIRE_MINUTES);
    } finally {
      if (original === undefined) {
        delete process.env.ORDER_EXPIRE_MINUTES;
      } else {
        process.env.ORDER_EXPIRE_MINUTES = original;
      }
    }
  });
});

