import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TicketStatus } from "./types";

export const TICKET_LIST_SELECT =
  "id, code, status, store_id, created_by, inspected_at, issued_at, due_at, submitted_at, locked_at, auto_locked, appeal_status, created_at, " +
  "store:stores(name, code), creator:profiles!tickets_created_by_fkey(full_name), " +
  "items:ticket_items(employee_id, explained_by, suggested_amount, final_amount, violation_name, violation_type:violation_types(name, amount))";

export type TicketRow = {
  id: string;
  code: string | null;
  status: TicketStatus;
  store_id: string;
  created_by: string;
  inspected_at: string;
  issued_at: string | null;
  due_at: string | null;
  submitted_at: string | null;
  locked_at: string | null;
  auto_locked: boolean;
  appeal_status: "pending" | "rejected" | "accepted" | null;
  created_at: string;
  store: { name: string; code: string } | null;
  creator: { full_name: string } | null;
  items: {
    employee_id: string | null;
    explained_by: string | null;
    suggested_amount: number | null;
    final_amount: number | null;
    violation_name: string | null;
    violation_type: { name: string; amount: number } | null;
  }[];
};

export type TicketFilter = {
  status?: TicketStatus[];
  createdBy?: string;
  storeId?: string;
  from?: string; // yyyy-mm-dd
  to?: string;
  code?: string;
  /** Chỉ phiếu có khiếu nại đang chờ Admin */
  appealPending?: boolean;
  orderBy?: "created_at" | "due_at" | "submitted_at" | "locked_at";
  ascending?: boolean;
  limit?: number;
};

export async function listTickets(supabase: SupabaseClient, f: TicketFilter = {}): Promise<TicketRow[]> {
  try {
    return await queryTickets(supabase, f, TICKET_LIST_SELECT);
  } catch (e) {
    // Database chưa chạy migration 0005 (chưa có cột appeal_status): vẫn hiện danh sách, coi như không có khiếu nại.
    if ((e as { code?: string }).code !== "42703") throw e;
    if (f.appealPending) return [];
    const rows = await queryTickets(supabase, f, TICKET_LIST_SELECT.replace("appeal_status, ", ""));
    return rows.map((r) => ({ ...r, appeal_status: null }));
  }
}

async function queryTickets(supabase: SupabaseClient, f: TicketFilter, select: string) {
  let q = supabase.from("tickets").select(select);
  if (f.status?.length) q = q.in("status", f.status);
  if (f.createdBy) q = q.eq("created_by", f.createdBy);
  if (f.storeId) q = q.eq("store_id", f.storeId);
  if (f.from) q = q.gte("inspected_at", `${f.from}T00:00:00+07:00`);
  if (f.to) q = q.lte("inspected_at", `${f.to}T23:59:59+07:00`);
  if (f.code) q = q.ilike("code", `%${f.code}%`);
  if (f.appealPending) q = q.eq("appeal_status", "pending");
  const { data, error } = await q
    .order(f.orderBy ?? "created_at", { ascending: f.ascending ?? false })
    .limit(f.limit ?? 200);
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return (data ?? []) as unknown as TicketRow[];
}

/** Tạo signed URL (1 giờ) cho danh sách ảnh. */
export async function signUrls(supabase: SupabaseClient, paths: string[]) {
  const unique = [...new Set(paths)].filter(Boolean);
  if (unique.length === 0) return {} as Record<string, string>;
  const { data } = await supabase.storage.from("evidence").createSignedUrls(unique, 3600);
  const map: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}
