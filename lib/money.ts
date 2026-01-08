/**
 * 金额/积分解析工具
 *
 * 设计动机：
 * - 外部系统（支付平台、用户输入）传入的金额字符串格式不稳定（空格/千分位/非法字符）
 * - 这里集中做一次严格解析，避免“Number(value)”默默接受科学计数法等意外格式
 */

/**
 * 解析钱包/支付金额字符串为 number。
 *
 * 规则：
 * - 允许：`123`、`123.4`、`123.45`
 * - 允许千分位：`1,234.56`
 * - 不允许：负数、科学计数法、超过 2 位小数、异常逗号分组
 *
 * @returns 解析失败返回 null
 */
export function parseWalletAmount(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const plain = /^\d+(?:\.\d{1,2})?$/.test(raw);
  const withThousands = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(raw);
  if (!plain && !withThousands) return null;

  const normalized = raw.replace(/,/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  if (amount < 0) return null;
  return amount;
}

