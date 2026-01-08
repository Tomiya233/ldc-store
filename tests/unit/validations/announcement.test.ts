import { describe, expect, it } from "vitest";

import { announcementSchema } from "@/lib/validations/announcement";

describe("validations/announcement", () => {
  it("应通过合法公告并允许空 startAt/endAt（默认值）", () => {
    const result = announcementSchema.safeParse({
      title: "Hello",
      content: "World",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.startAt).toBe("");
    expect(result.data.endAt).toBe("");
    expect(result.data.isActive).toBe(true);
  });

  it("应拒绝无效 datetime-local 格式", () => {
    const result = announcementSchema.safeParse({
      title: "Hello",
      content: "World",
      startAt: "2026/01/01 10:00",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues.some((i) => i.message === "无效的时间格式")).toBe(true);
  });

  it("应拒绝 endAt 早于 startAt 的时间范围", () => {
    const result = announcementSchema.safeParse({
      title: "Hello",
      content: "World",
      startAt: "2026-01-01T12:00",
      endAt: "2026-01-01T11:59",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    // superRefine 会把错误绑定到 endAt，便于前端准确展示
    const endAtIssue = result.error.issues.find((i) => i.path.join(".") === "endAt");
    expect(endAtIssue?.message).toBe("结束时间不能早于开始时间");
  });

  it("当仅提供 startAt 或 endAt 时，应允许通过（范围可选）", () => {
    expect(
      announcementSchema.safeParse({
        title: "Hello",
        content: "World",
        startAt: "2026-01-01T12:00",
        endAt: "",
      }).success
    ).toBe(true);

    expect(
      announcementSchema.safeParse({
        title: "Hello",
        content: "World",
        startAt: "",
        endAt: "2026-01-02T12:00",
      }).success
    ).toBe(true);
  });
});

