import { describe, expect, it } from "vitest";

import {
  buildAdminCardsHref,
  DEFAULT_ADMIN_CARDS_PAGE_SIZE,
} from "@/app/(admin)/admin/cards/cards-url";

describe("utils/card-url", () => {
  it("无参数时应返回基础路径", () => {
    expect(buildAdminCardsHref({})).toBe("/admin/cards");
  });

  it("应拼接筛选参数，并跳过 undefined/空值", () => {
    const href = buildAdminCardsHref({
      productId: "p1",
      q: "abc",
      status: "available",
      orderNo: "ORDER_1",
      page: 2,
    });

    expect(href).toBe("/admin/cards?product=p1&q=abc&status=available&orderNo=ORDER_1&page=2");
  });

  it("page<=1 时应省略 page 参数", () => {
    expect(buildAdminCardsHref({ page: 1 })).toBe("/admin/cards");
    expect(buildAdminCardsHref({ page: 0 })).toBe("/admin/cards");
  });

  it("pageSize 等于默认值时应省略参数，非默认值则输出", () => {
    expect(
      buildAdminCardsHref({
        pageSize: DEFAULT_ADMIN_CARDS_PAGE_SIZE,
      })
    ).toBe("/admin/cards");

    expect(
      buildAdminCardsHref({
        pageSize: DEFAULT_ADMIN_CARDS_PAGE_SIZE + 1,
      })
    ).toBe(`/admin/cards?pageSize=${DEFAULT_ADMIN_CARDS_PAGE_SIZE + 1}`);
  });
});

