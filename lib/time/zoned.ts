type DateTimeParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  millisecond: number; // 0-999
};

function getZonedParts(date: Date, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    // Intl 不输出毫秒；保留原始毫秒即可（绝对时间的毫秒在时区变换下不应丢失）
    millisecond: date.getMilliseconds(),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );
  return localAsUtc - date.getTime();
}

function zonedPartsToUtcDate(parts: DateTimeParts, timeZone: string): Date {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );

  // 为什么要做两次 offset 修正：DST 切换日同一个“墙钟时间”对应的 UTC 偏移会发生跳变，
  // 单次估算可能落在错误 offset 上；二次修正可覆盖绝大多数 DST 场景。
  const firstOffset = getTimeZoneOffsetMs(new Date(localAsUtc), timeZone);
  let utc = localAsUtc - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(utc), timeZone);
  if (secondOffset !== firstOffset) {
    utc = localAsUtc - secondOffset;
  }

  return new Date(utc);
}

/**
 * 在指定时区下按“日历日”增加天数（保持当地时间不漂移）。
 *
 * 为什么不用 `date.getTime() + days*24h`：
 * - 在 DST 切换时，某些天并不是 24 小时，直接加毫秒会导致当地时间偏移 1 小时。
 */
export function addDaysInTimezone(date: Date, days: number, timeZone: string): Date {
  if (!Number.isFinite(days)) {
    throw new Error("days 必须是有限数字");
  }

  const zoned = getZonedParts(date, timeZone);
  const targetLocalAsUtc = new Date(
    Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day + days,
      zoned.hour,
      zoned.minute,
      zoned.second,
      zoned.millisecond
    )
  );

  const targetParts: DateTimeParts = {
    year: targetLocalAsUtc.getUTCFullYear(),
    month: targetLocalAsUtc.getUTCMonth() + 1,
    day: targetLocalAsUtc.getUTCDate(),
    hour: targetLocalAsUtc.getUTCHours(),
    minute: targetLocalAsUtc.getUTCMinutes(),
    second: targetLocalAsUtc.getUTCSeconds(),
    millisecond: targetLocalAsUtc.getUTCMilliseconds(),
  };

  try {
    return zonedPartsToUtcDate(targetParts, timeZone);
  } catch (error) {
    // Intl 对非法 timeZone 会抛 RangeError；这里补充语义化信息便于排障
    throw new Error(`无效的 timeZone: ${timeZone}`, { cause: error });
  }
}

