import { describe, expect, it } from "vitest";

import { categorySchema, updateCategorySchema } from "@/lib/validations/category";

describe("validations/category", () => {
  it("categorySchema 应通过合法输入并补齐默认值", () => {
    const result = categorySchema.safeParse({
      name: "Category A",
      slug: "category-a",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.isActive).toBe(true);
    expect(result.data.sortOrder).toBe(0);
  });

  it("应拒绝不符合规则的 slug", () => {
    const result = categorySchema.safeParse({
      name: "Category A",
      slug: "Bad Slug!",
    });
    expect(result.success).toBe(false);
  });

  it("updateCategorySchema 应允许 partial update", () => {
    const result = updateCategorySchema.safeParse({
      description: "only update description",
    });
    expect(result.success).toBe(true);
  });
});

