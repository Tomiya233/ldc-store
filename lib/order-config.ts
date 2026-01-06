/**
 * 订单相关配置（服务端）
 *
 * 为什么单独抽出来：
 * - 订单过期时间会影响下单、库存锁定与后台展示；集中管理能避免“默认值漂移”
 * - 环境变量可能缺失或被误填；这里做一次兜底，避免出现 NaN 导致写入无效过期时间
 */

export const DEFAULT_ORDER_EXPIRE_MINUTES = 5;

export function getOrderExpireMinutes(
  envValue: string | undefined = process.env.ORDER_EXPIRE_MINUTES
): number {
  const parsed = Number.parseInt(String(envValue ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : DEFAULT_ORDER_EXPIRE_MINUTES;
}

