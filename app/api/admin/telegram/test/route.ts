import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-utils";
import { testTelegramConnection } from "@/lib/notifications/telegram";

/**
 * POST /api/admin/telegram/test
 * 测试 Telegram 机器人连接
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: "需要管理员权限" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { botToken, chatId } = body as { botToken?: string; chatId?: string };

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, message: "请填写 Bot Token 和 Chat ID" },
        { status: 400 }
      );
    }

    const result = await testTelegramConnection(botToken, chatId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Telegram Test API] 请求失败:", error);
    return NextResponse.json(
      { success: false, message: "请求失败，请稍后重试" },
      { status: 500 }
    );
  }
}
