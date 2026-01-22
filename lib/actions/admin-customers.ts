"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-utils";
import { sql } from "drizzle-orm";

export interface AdminCustomersFilters {
  query?: string;
}

export interface AdminCustomerListItem {
  userId: string;
  username: string | null;
  userImage: string | null;
  orderCount: number;
  totalSpent: string;
  firstPaidAt: string | null;
  lastPaidAt: string | null;
}

export interface AdminCustomersPageResult {
  items: AdminCustomerListItem[];
  total: number;
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePage(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(1, Math.floor(safe));
}

function normalizePageSize(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(200, Math.max(1, Math.floor(safe)));
}

export async function getAdminCustomersPage(input: {
  page: number;
  pageSize: number;
  filters?: AdminCustomersFilters;
}): Promise<AdminCustomersPageResult> {
  await requireAdmin();

  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const offset = (page - 1) * pageSize;

  const q = input.filters?.query?.trim();
  const pattern = q ? `%${q}%` : null;
  const whereSql = pattern
    ? sql`WHERE (user_id ILIKE ${pattern} OR username ILIKE ${pattern})`
    : sql``;

  const [itemsRows, totalRows] = await Promise.all([
    db.execute(sql`
      WITH agg AS (
        SELECT
          user_id,
          (ARRAY_AGG(username ORDER BY created_at DESC))[1] AS username,
          (ARRAY_AGG(user_image ORDER BY created_at DESC))[1] AS user_image,
          COUNT(*)::int AS order_count,
          COALESCE(SUM(total_amount::numeric), 0)::text AS total_spent,
          MIN(paid_at) AS first_paid_at,
          MAX(paid_at) AS last_paid_at
        FROM orders
        WHERE status = 'completed' AND user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT user_id, username, user_image, order_count, total_spent, first_paid_at, last_paid_at
      FROM agg
      ${whereSql}
      ORDER BY total_spent::numeric DESC, order_count DESC, user_id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `),
    db.execute(sql`
      WITH agg AS (
        SELECT
          user_id,
          (ARRAY_AGG(username ORDER BY created_at DESC))[1] AS username
        FROM orders
        WHERE status = 'completed' AND user_id IS NOT NULL
        GROUP BY user_id
      )
      SELECT COUNT(*)::int AS count
      FROM agg
      ${whereSql}
    `),
  ]);

  const typedItems =
    (itemsRows as unknown as Array<{
      user_id: string;
      username: string | null;
      user_image: string | null;
      order_count: number;
      total_spent: string;
      first_paid_at: Date | string | null;
      last_paid_at: Date | string | null;
    }>) ?? [];

  const typedTotal =
    (totalRows as unknown as Array<{
      count: number;
    }>) ?? [];

  const total = typedTotal[0]?.count ?? 0;

  return {
    items: typedItems.map((row) => ({
      userId: row.user_id,
      username: row.username ?? null,
      userImage: row.user_image ?? null,
      orderCount: Number.isFinite(row.order_count) ? row.order_count : 0,
      totalSpent: row.total_spent ?? "0",
      firstPaidAt: toIsoString(row.first_paid_at),
      lastPaidAt: toIsoString(row.last_paid_at),
    })),
    total,
  };
}

