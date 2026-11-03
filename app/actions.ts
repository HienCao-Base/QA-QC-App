"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole, usernameToEmail } from "@/lib/auth";

export type ActionResult = { ok: true; data?: unknown } | { ok: false; error: string };

const fail = (e: unknown): ActionResult => ({
  ok: false,
  error: (e as { message?: string })?.message ?? "Có lỗi xảy ra, vui lòng thử lại",
});

// ---------- Đăng nhập ----------

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return "Vui lòng nhập tên đăng nhập và mật khẩu";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) return "Sai tên đăng nhập hoặc mật khẩu";
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- QA: phiếu nháp ----------

export async function createDraft(formData: FormData) {
  const user = await requireRole("qa");
  const store_id = String(formData.get("store_id") ?? "");
  if (!store_id) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({ store_id, created_by: user.id, note: String(formData.get("note") ?? "").trim() || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/phieu/${data.id}`);
}

type ItemInput = {
  violation_type_id: string;
  employee_id: string | null;
  description: string | null;
  evidence_paths: string[];
};

export async function saveItem(ticketId: string, itemId: string | null, input: ItemInput): Promise<ActionResult> {
  await requireRole("qa");
  if (!input.violation_type_id) return { ok: false, error: "Vui lòng chọn lỗi" };
  if (input.evidence_paths.length === 0) return { ok: false, error: "Cần ít nhất 1 ảnh minh chứng" };
  const supabase = await createClient();
  const row = {
    violation_type_id: input.violation_type_id,
    employee_id: input.employee_id || null,
    description: input.description?.trim() || null,
    evidence_paths: input.evidence_paths,
  };
  const q = itemId
    ? supabase.from("ticket_items").update(row).eq("id", itemId).eq("ticket_id", ticketId)
    : supabase.from("ticket_items").insert({ ...row, ticket_id: ticketId, sort: Date.now() % 2147483647 });
  const { error } = await q;
  if (error) return fail(error);
  revalidatePath(`/phieu/${ticketId}`);
  return { ok: true };
}

export async function deleteItem(ticketId: string, itemId: string): Promise<ActionResult> {
  await requireRole("qa");
  const supabase = await createClient();
  const { error } = await supabase.from("ticket_items").delete().eq("id", itemId).eq("ticket_id", ticketId);
  if (error) return fail(error);
  revalidatePath(`/phieu/${ticketId}`);
  return { ok: true };
}

export async function deleteDraft(ticketId: string): Promise<ActionResult> {
  await requireRole("qa");
  const supabase = await createClient();
  const { error } = await supabase.from("tickets").delete().eq("id", ticketId).eq("status", "draft");
  if (error) return fail(error);
  redirect("/qa");
}

// ---------- Chuyển trạng thái (gọi hàm trong database) ----------

async function rpc(fn: string, args: Record<string, unknown>, ticketId: string): Promise<ActionResult> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return fail(error);
  revalidatePath(`/phieu/${ticketId}`);
  revalidatePath("/", "layout");
  return { ok: true, data };
}

export const issueTicket = async (id: string) => rpc("issue_ticket", { p_ticket: id }, id);

// Sửa phiếu đang chờ giải trình (QA lập phiếu). Quy tắc nằm trong hàm SQL edit_issued_item / delete_issued_item.
export const editIssuedItem = async (ticketId: string, itemId: string | null, input: ItemInput, reason: string) =>
  rpc(
    "edit_issued_item",
    {
      p_ticket: ticketId,
      p_item: itemId,
      p_data: {
        violation_type_id: input.violation_type_id,
        employee_id: input.employee_id || null,
        description: input.description ?? "",
        evidence_paths: input.evidence_paths,
      },
      p_reason: reason,
    },
    ticketId,
  );
export const deleteIssuedItem = async (ticketId: string, itemId: string, reason: string) =>
  rpc("delete_issued_item", { p_ticket: ticketId, p_item: itemId, p_reason: reason }, ticketId);
export const cancelTicket = async (id: string, reason: string) =>
  rpc("cancel_ticket", { p_ticket: id, p_reason: reason }, id);
export const reopenTicket = async (id: string, reason: string) =>
  rpc("reopen_ticket", { p_ticket: id, p_reason: reason }, id);

export type ExplanationInput = {
  id: string;
  cht_response: "accept" | "dispute" | null;
  explanation: string;
  cause: string;
  corrective_action: string;
  explanation_paths: string[];
};
export const saveExplanation = async (id: string, items: ExplanationInput[], submit: boolean) =>
  rpc("save_explanation", { p_ticket: id, p_items: items, p_submit: submit }, id);

export const returnToStore = async (id: string, reason: string) =>
  rpc("return_to_store", { p_ticket: id, p_reason: reason }, id);
export const appealTicket = async (id: string, reason: string) =>
  rpc("appeal_ticket", { p_ticket: id, p_reason: reason }, id);
export const resolveAppeal = async (
  id: string,
  accept: boolean,
  items: { id: string; final_amount: number }[],
  reason: string,
) => rpc("resolve_appeal", { p_ticket: id, p_accept: accept, p_items: items, p_reason: reason }, id);

export type DecisionInput = { id: string; decision: string; final_amount: number | null; decision_reason: string };
export const lockTicket = async (id: string, items: DecisionInput[]) =>
  rpc("lock_ticket", { p_ticket: id, p_items: items }, id);

// ---------- Thông báo ----------

/** Bấm vào một thông báo: đánh dấu đã đọc rồi mở phiếu liên quan (nếu có). */
export async function openNotification(id: number, ticketId: string | null) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/", "layout");
  if (ticketId) redirect(`/phieu/${ticketId}`);
}

export async function markAllRead() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout");
}

// ---------- Admin: dữ liệu nền ----------

const ENTITY_FIELDS = {
  stores: ["code", "name", "address", "active"],
  employees: ["code", "full_name", "store_id", "position", "active"],
  violation_types: ["code", "name", "group_name", "severity", "amount", "description", "active"],
} as const;
export type Entity = keyof typeof ENTITY_FIELDS;

export async function saveEntity(entity: Entity, id: string | null, values: Record<string, unknown>): Promise<ActionResult> {
  await requireRole("admin");
  const fields = ENTITY_FIELDS[entity];
  if (!fields) return { ok: false, error: "Dữ liệu không hợp lệ" };
  const row: Record<string, unknown> = {};
  for (const f of fields) {
    if (!(f in values)) continue;
    const v = values[f];
    row[f] = typeof v === "string" ? v.trim() || null : v;
  }
  if (entity === "violation_types" && row.amount != null) row.amount = Number(row.amount);

  const supabase = await createClient();
  const { error } = id ? await supabase.from(entity).update(row).eq("id", id) : await supabase.from(entity).insert(row);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Mã này đã tồn tại" };
    if (error.code === "23502") return { ok: false, error: "Vui lòng nhập đủ các trường bắt buộc" };
    return fail(error);
  }
  revalidatePath("/admin");
  return { ok: true };
}

export type AccountInput = {
  username: string;
  full_name: string;
  role: "admin" | "qa" | "cht" | "nv";
  store_id: string | null;
  employee_id: string | null;
  active: boolean;
  password: string;
};

export async function saveAccount(id: string | null, input: AccountInput): Promise<ActionResult> {
  await requireRole("admin");
  const admin = createAdminClient();
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    return { ok: false, error: "Tên đăng nhập 3–30 ký tự, chỉ gồm chữ không dấu, số, dấu . _ -" };
  if (!input.full_name.trim()) return { ok: false, error: "Vui lòng nhập họ tên" };
  if (input.role === "cht" && !input.store_id) return { ok: false, error: "Cửa hàng trưởng phải gắn với một cửa hàng" };
  if (input.role === "nv" && !input.employee_id) return { ok: false, error: "Tài khoản nhân viên phải gắn với một nhân viên" };
  if (!id && input.password.length < 6) return { ok: false, error: "Mật khẩu tối thiểu 6 ký tự" };

  // Nhân viên: cửa hàng lấy theo hồ sơ nhân viên
  let storeId = input.role === "cht" ? input.store_id : null;
  if (input.role === "nv") {
    const { data: emp } = await admin.from("employees").select("store_id").eq("id", input.employee_id!).single();
    if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
    storeId = emp.store_id;
  }

  const profile = {
    username,
    full_name: input.full_name.trim(),
    role: input.role,
    store_id: storeId,
    employee_id: input.role === "nv" ? input.employee_id : null,
    active: input.active,
  };

  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: input.password,
      email_confirm: true,
    });
    if (error) return { ok: false, error: error.message.includes("already") ? "Tên đăng nhập đã tồn tại" : error.message };
    const { error: e2 } = await admin.from("profiles").insert({ id: data.user.id, ...profile });
    if (e2) {
      await admin.auth.admin.deleteUser(data.user.id);
      if (e2.code === "23505") return { ok: false, error: "Nhân viên này đã có tài khoản" };
      return fail(e2);
    }
  } else {
    const authUpdate: { email: string; password?: string; ban_duration: string } = {
      email: usernameToEmail(username),
      ban_duration: input.active ? "none" : "876000h",
    };
    if (input.password) {
      if (input.password.length < 6) return { ok: false, error: "Mật khẩu tối thiểu 6 ký tự" };
      authUpdate.password = input.password;
    }
    const { error } = await admin.auth.admin.updateUserById(id, authUpdate);
    if (error) return fail(error);
    const { error: e2 } = await admin.from("profiles").update(profile).eq("id", id);
    if (e2) return e2.code === "23505" ? { ok: false, error: "Nhân viên này đã có tài khoản" } : fail(e2);
  }
  revalidatePath("/admin");
  return { ok: true };
}
