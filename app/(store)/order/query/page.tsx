"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Package,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

const queryFormSchema = z.object({
  orderNoOrEmail: z.string().min(1, "请输入订单号或邮箱"),
  queryPassword: z.string().min(1, "请输入查询密码"),
});

type QueryFormValues = z.infer<typeof queryFormSchema>;

interface OrderData {
  orderNo: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  status: string;
  paymentMethod: string;
  createdAt: Date;
  paidAt: Date | null;
  cards: string[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "待支付",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <Clock className="h-4 w-4" />,
  },
  paid: {
    label: "已支付",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  completed: {
    label: "已完成",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  expired: {
    label: "已过期",
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    icon: <XCircle className="h-4 w-4" />,
  },
  refunded: {
    label: "已退款",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export default function OrderQueryPage() {
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<OrderData[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const form = useForm<QueryFormValues>({
    resolver: zodResolver(queryFormSchema),
    defaultValues: {
      orderNoOrEmail: "",
      queryPassword: "",
    },
  });

  const onSubmit = (values: QueryFormValues) => {
    startTransition(async () => {
      const result = await queryOrder(values.orderNoOrEmail, values.queryPassword);

      if (result.success) {
        // 统一转换为数组格式
        const orderList = Array.isArray(result.data) ? result.data : [result.data];
        setOrders(orderList as OrderData[]);
        toast.success("查询成功");
      } else {
        toast.error(result.message);
        setOrders(null);
      }
    });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600">
          <Search className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          订单查询
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          输入订单号或邮箱查询您的订单详情和卡密
        </p>
      </div>

      {/* Query Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="orderNoOrEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>订单号 / 邮箱</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="输入订单号或下单时的邮箱"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      使用邮箱可查询该邮箱下的所有订单
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="queryPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>查询密码</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="下单时设置的查询密码"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    查询中...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    查询订单
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Order Results */}
      {orders && orders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            查询结果 ({orders.length} 个订单)
          </h2>

          {orders.map((order, orderIndex) => {
            const status = statusConfig[order.status] || statusConfig.pending;

            return (
              <Card key={order.orderNo}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {order.productName}
                      </CardTitle>
                      <p className="mt-1 text-sm text-zinc-500">
                        订单号: {order.orderNo}
                      </p>
                    </div>
                    <Badge className={status.color}>
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">数量</span>
                      <p className="font-medium">{order.quantity} 件</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">金额</span>
                      <p className="font-medium text-violet-600">
                        {order.totalAmount} LDC
                      </p>
                    </div>
                    <div>
                      <span className="text-zinc-500">下单时间</span>
                      <p className="font-medium">
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    {order.paidAt && (
                      <div>
                        <span className="text-zinc-500">支付时间</span>
                        <p className="font-medium">
                          {new Date(order.paidAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Cards */}
                  {order.cards && order.cards.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <Package className="h-4 w-4" />
                        卡密信息
                      </div>
                      <div className="space-y-2">
                        {order.cards.map((card, cardIndex) => {
                          const globalIndex = orderIndex * 1000 + cardIndex;
                          return (
                            <div
                              key={cardIndex}
                              className="flex items-center justify-between rounded bg-white p-2 dark:bg-zinc-900"
                            >
                              <code className="text-sm font-mono break-all">
                                {card}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => copyToClipboard(card, globalIndex)}
                              >
                                {copiedIndex === globalIndex ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pending Payment Notice */}
                  {order.status === "pending" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        订单待支付，请尽快完成支付
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {orders && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-zinc-300" />
            <p className="mt-4 text-zinc-500">未找到订单</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

