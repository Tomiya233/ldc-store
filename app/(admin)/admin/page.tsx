export const dynamic = "force-dynamic";

import { db, orders, cards, products } from "@/lib/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { StatsCard } from "@/components/admin/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今日销售统计
  const todaySales = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`COALESCE(sum(total_amount::numeric), 0)::text`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        gte(orders.paidAt, today)
      )
    );

  // 待处理订单
  const pendingOrders = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.status, "pending"));

  // 库存预警（可用库存少于 10 的商品）
  const lowStockProducts = await db.execute(sql`
    SELECT p.id, p.name, COUNT(c.id)::int as stock
    FROM products p
    LEFT JOIN cards c ON c.product_id = p.id AND c.status = 'available'
    WHERE p.is_active = true
    GROUP BY p.id, p.name
    HAVING COUNT(c.id) < 10
    ORDER BY COUNT(c.id) ASC
    LIMIT 5
  `);

  // 最近订单
  const recentOrders = await db.query.orders.findMany({
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    limit: 5,
    with: {
      product: {
        columns: {
          name: true,
        },
      },
    },
  });

  // 总商品数
  const totalProducts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.isActive, true));

  // 总库存
  const totalStock = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cards)
    .where(eq(cards.status, "available"));

  return {
    todaySales: {
      count: todaySales[0]?.count || 0,
      total: parseFloat(todaySales[0]?.total || "0").toFixed(2),
    },
    pendingOrderCount: pendingOrders[0]?.count || 0,
    lowStockProducts: (lowStockProducts as unknown as Array<{
      id: string;
      name: string;
      stock: number;
    }>) || [],
    recentOrders,
    totalProducts: totalProducts[0]?.count || 0,
    totalStock: totalStock[0]?.count || 0,
  };
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: {
    label: "待支付",
    color: "bg-amber-100 text-amber-700",
  },
  paid: {
    label: "已支付",
    color: "bg-blue-100 text-blue-700",
  },
  completed: {
    label: "已完成",
    color: "bg-emerald-100 text-emerald-700",
  },
  expired: {
    label: "已过期",
    color: "bg-zinc-100 text-zinc-700",
  },
  refunded: {
    label: "已退款",
    color: "bg-rose-100 text-rose-700",
  },
};

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          仪表盘
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          欢迎回来，这是今日的运营数据概览
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="今日销售额"
          value={`${stats.todaySales.total} LDC`}
          description="今日完成订单金额"
          icon={DollarSign}
        />
        <StatsCard
          title="今日订单"
          value={stats.todaySales.count}
          description="今日完成订单数"
          icon={ShoppingCart}
        />
        <StatsCard
          title="待处理订单"
          value={stats.pendingOrderCount}
          description="等待支付的订单"
          icon={Clock}
        />
        <StatsCard
          title="总库存"
          value={stats.totalStock}
          description={`${stats.totalProducts} 个商品`}
          icon={Package}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              库存预警
            </CardTitle>
            <Link href="/admin/cards">
              <Button variant="ghost" size="sm">
                管理卡密
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts?.length > 0 ? (
              <div className="space-y-3">
                {stats.lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {product.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        product.stock === 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      库存: {product.stock}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <Package className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-2">所有商品库存充足</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              最近订单
            </CardTitle>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {order.productName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.orderNo} · {order.totalAmount} LDC
                        </p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <ShoppingCart className="mx-auto h-10 w-10 text-zinc-300" />
                <p className="mt-2">暂无订单</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

