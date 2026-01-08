import { describe, expect, it } from "vitest";

import { addDaysInTimezone } from "@/lib/time/zoned";

describe("utils/time", () => {
  it("UTC 下应按日历日增加天数", () => {
    const input = new Date("2026-01-01T12:34:56.000Z");
    const output = addDaysInTimezone(input, 2, "UTC");
    expect(output.toISOString()).toBe("2026-01-03T12:34:56.000Z");
  });

  it("Asia/Shanghai 下应保持当地时间不漂移", () => {
    // 2026-01-01 10:20:00 Asia/Shanghai = 2026-01-01 02:20:00Z
    const input = new Date("2026-01-01T02:20:00.000Z");
    const output = addDaysInTimezone(input, 5, "Asia/Shanghai");
    expect(output.toISOString()).toBe("2026-01-06T02:20:00.000Z");
  });

  it("America/New_York DST 开始日应正确处理（保持 01:30 本地时间）", () => {
    // 2026-03-08 01:30 America/New_York = 2026-03-08 06:30Z（仍为 EST, UTC-5）
    const input = new Date("2026-03-08T06:30:00.000Z");
    const output = addDaysInTimezone(input, 1, "America/New_York");
    // 2026-03-09 01:30 America/New_York = 2026-03-09 05:30Z（EDT, UTC-4）
    expect(output.toISOString()).toBe("2026-03-09T05:30:00.000Z");
  });

  it("America/New_York DST 结束日应正确处理（+25 小时以保持本地 12:00）", () => {
    // 2026-10-31 12:00 America/New_York = 2026-10-31 16:00Z（EDT, UTC-4）
    const input = new Date("2026-10-31T16:00:00.000Z");
    const output = addDaysInTimezone(input, 1, "America/New_York");
    // 2026-11-01 12:00 America/New_York = 2026-11-01 17:00Z（EST, UTC-5）
    expect(output.toISOString()).toBe("2026-11-01T17:00:00.000Z");
  });
});

