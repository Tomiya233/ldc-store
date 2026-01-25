"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Bell,
  Clock,
  Globe,
  Loader2,
  Package,
  Rocket,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Zap,
  CreditCard,
  Gem,
  RefreshCcw,
  Send,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { SiTelegram } from "@icons-pack/react-simple-icons";

import { updateSystemSettings } from "@/lib/actions/system-settings";
import {
  systemSettingsSchema,
  SITE_ICON_OPTIONS,
  type SiteIconOption,
  type SystemSettings,
  type SystemSettingsInput,
} from "@/lib/validations/system-settings";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const SITE_ICON_MAP: Record<SiteIconOption, LucideIcon> = {
  Store,
  Sparkles,
  ShoppingCart,
  Package,
  CreditCard,
  Gem,
  Rocket,
  Shield,
  Zap,
};

interface SystemConfigFormProps {
  initialValues: SystemSettings;
}

export function SystemConfigForm({ initialValues }: SystemConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);
  const router = useRouter();

  const form = useForm<SystemSettingsInput>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const watchedName = useWatch({ control: form.control, name: "siteName" });
  const watchedDescription = useWatch({ control: form.control, name: "siteDescription" });
  const watchedIcon = useWatch({ control: form.control, name: "siteIcon" });
  const watchedIconUrl = useWatch({ control: form.control, name: "siteIconUrl" });
  const watchedTelegramEnabled = useWatch({ control: form.control, name: "telegramEnabled" });
  const [previewIconFailed, setPreviewIconFailed] = useState(false);

  const trimmedIconUrl = watchedIconUrl?.trim();
  const hasCustomIconUrl = Boolean(trimmedIconUrl) && !previewIconFailed;

  useEffect(() => {
    setPreviewIconFailed(false);
  }, [watchedIconUrl]);

  const PreviewIcon = useMemo(() => {
    return SITE_ICON_MAP[watchedIcon as SiteIconOption] ?? Store;
  }, [watchedIcon]);

  const onSubmit = (values: SystemSettingsInput) => {
    startTransition(async () => {
      const result = await updateSystemSettings(values);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleReset = () => {
    form.reset(initialValues);
    toast.message("已恢复为当前保存的配置");
  };

  const handleTestTelegram = async () => {
    const botToken = form.getValues("telegramBotToken");
    const chatId = form.getValues("telegramChatId");

    if (!botToken || !chatId) {
      toast.error("请先填写 Bot Token 和 Chat ID");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/api/admin/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, chatId }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("测试消息发送成功！请检查 Telegram");
      } else {
        toast.error(`发送失败: ${result.message}`);
      }
    } catch {
      toast.error("请求失败，请稍后重试");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="basic" className="gap-2">
                  <Settings className="h-4 w-4" />
                  基础设置
                </TabsTrigger>
                <TabsTrigger value="notification" className="gap-2">
                  <Bell className="h-4 w-4" />
                  通知设置
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="h-5 w-5" />
                      站点信息
                    </CardTitle>
                    <CardDescription>
                      这些配置会影响前台 Header/页面标题等展示（保存后立即生效）
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>网站名称 *</FormLabel>
                          <FormControl>
                            <Input placeholder="例如：LDC Store" {...field} />
                          </FormControl>
                          <FormDescription>用于前台标题、Footer 版权等。</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="siteDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>网站描述</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="一句话介绍（可选）"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            建议控制在 1-2 句话，过长会影响 SEO 与分享卡片展示。
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="siteIconUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>自定义图标 URL</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/icon.png"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                填写后将优先使用自定义图标，留空则使用下方预置图标。
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="siteIcon"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>预置图标{hasCustomIconUrl && "（已被自定义图标覆盖）"}</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={(value) =>
                                  field.onChange(value as SiteIconOption)
                                }
                                disabled={hasCustomIconUrl}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="选择图标" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SITE_ICON_OPTIONS.map((value) => {
                                    const Icon = SITE_ICON_MAP[value];
                                    return (
                                      <SelectItem key={value} value={value}>
                                        <div className="flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          <span>{value}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="text-sm text-muted-foreground">预览</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-border/50 overflow-hidden">
                            {hasCustomIconUrl ? (
                              <img
                                src={trimmedIconUrl}
                                alt="自定义图标"
                                className="h-full w-full object-contain"
                                referrerPolicy="no-referrer"
                                onError={() => setPreviewIconFailed(true)}
                              />
                            ) : (
                              <PreviewIcon className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {watchedName || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {watchedDescription || "未填写描述"}
                            </p>
                          </div>
                        </div>
                        {trimmedIconUrl && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {previewIconFailed
                              ? "⚠️ 图片加载失败，已回退到预置图标"
                              : "使用自定义图标"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-5 w-5" />
                      订单与超时
                    </CardTitle>
                    <CardDescription>
                      用于控制"未支付订单"多久后过期并释放库存
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="orderExpireMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>订单过期时间（分钟）*</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={1440}
                              {...field}
                              onChange={(e) => {
                                const next = Number.parseInt(e.target.value, 10);
                                field.onChange(Number.isFinite(next) ? next : 0);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            保存后会影响新创建的订单；已创建订单仍按其自身的过期时间计算。
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notification" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <SiTelegram className="h-5 w-5" />
                      Telegram 通知
                    </CardTitle>
                    <CardDescription>
                      配置 Telegram 机器人，接收订单、支付、退款等实时通知
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="telegramEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>启用 Telegram 通知</FormLabel>
                            <FormDescription>
                              开启后可接收各类业务通知
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchedTelegramEnabled && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="telegramBotToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bot Token *</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showBotToken ? "text" : "password"}
                                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                                      {...field}
                                      className="pr-10"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                      onClick={() => setShowBotToken(!showBotToken)}
                                      aria-label={showBotToken ? "隐藏 Token" : "显示 Token"}
                                    >
                                      {showBotToken ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  通过 @BotFather 创建机器人获取
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="telegramChatId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Chat ID *</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="-1001234567890 或 @channel_name"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  群组/频道 ID，可通过 @userinfobot 获取
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTestTelegram}
                          disabled={isTesting || isPending}
                          className="gap-2"
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              发送中...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              测试发送
                            </>
                          )}
                        </Button>

                        <div className="rounded-lg border p-4">
                          <div className="mb-3">
                            <p className="text-sm font-medium">通知类型</p>
                            <p className="text-xs text-muted-foreground">选择需要推送的通知类型，开启后相应事件会发送到 Telegram</p>
                          </div>
                          
                          <div className="grid gap-3 sm:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="telegramNotifyOrderCreated"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">🧾 新订单</FormLabel>
                                    <FormDescription className="text-xs">用户创建订单时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="telegramNotifyPaymentSuccess"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">✅ 支付成功</FormLabel>
                                    <FormDescription className="text-xs">订单支付完成时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="telegramNotifyOrderExpired"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">⏰ 订单过期</FormLabel>
                                    <FormDescription className="text-xs">订单超时未支付时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="telegramNotifyRefundRequested"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">🔄 退款申请</FormLabel>
                                    <FormDescription className="text-xs">用户申请退款时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="telegramNotifyRefundApproved"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">💰 退款成功</FormLabel>
                                    <FormDescription className="text-xs">退款审核通过时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="telegramNotifyRefundRejected"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-md border px-3 py-2">
                                  <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-normal">❌ 退款拒绝</FormLabel>
                                    <FormDescription className="text-xs">退款申请被拒绝时</FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {!watchedTelegramEnabled && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-3 mb-3">
                        <Bell className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        启用 Telegram 通知后，可配置各类业务通知
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5" />
                  操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={isPending} className="gap-2">
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        保存并热更新
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isPending}
                    className="gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    恢复为当前配置
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">生效说明</p>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5" />
                      </span>
                      <span>站点配置：刷新页面即可看到变化</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded bg-amber-500/10 text-amber-800 dark:text-amber-400">
                        <Clock className="h-2.5 w-2.5" />
                      </span>
                      <span>订单过期时间：仅影响新订单</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        <Bell className="h-2.5 w-2.5" />
                      </span>
                      <span>通知设置：保存后立即生效</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded bg-zinc-500/10 text-zinc-700 dark:text-zinc-300">
                        <Shield className="h-2.5 w-2.5" />
                      </span>
                      <span>敏感配置：需通过环境变量设置</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
