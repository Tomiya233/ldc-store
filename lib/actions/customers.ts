"use server";

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface CustomerSpendLeaderboardItem {
  userId: string;
  username: string | null;
  userImage: string | null;
  orderCount: number;
  totalSpent: string;
}

function normalizeLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(200, Math.max(1, Math.floor(safe)));
}

export async function getCustomersSpendLeaderboard(input?: {
  limit?: number;
}): Promise<CustomerSpendLeaderboardItem[]> {
  const limit = normalizeLimit(input?.limit, 50);

  const rows = await db.execute(sql`
    WITH agg AS (
      SELECT
        user_id,
        (ARRAY_AGG(username ORDER BY created_at DESC))[1] AS username,
        (ARRAY_AGG(user_image ORDER BY created_at DESC))[1] AS user_image,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_amount::numeric), 0)::text AS total_spent
      FROM orders
      WHERE status = 'completed' AND user_id IS NOT NULL
      GROUP BY user_id
    )
    SELECT user_id, username, user_image, order_count, total_spent
    FROM agg
    ORDER BY total_spent::numeric DESC, order_count DESC, user_id ASC
    LIMIT ${limit}
  `);

  const typedRows =
    (rows as unknown as Array<{
      user_id: string;
      username: string | null;
      user_image: string | null;
      order_count: number;
      total_spent: string;
    }>) ?? [];

  return typedRows.map((row) => ({
    userId: row.user_id,
    username: row.username ?? null,
    userImage: row.user_image ?? null,
    orderCount: Number.isFinite(row.order_count) ? row.order_count : 0,
    totalSpent: row.total_spent ?? "0",
  }));
}

