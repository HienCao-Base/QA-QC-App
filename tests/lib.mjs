// Dữ liệu và tiện ích dùng chung cho bộ kiểm thử.
// Mọi thứ tạo ra đều có tiền tố TEST / test. và được dọn sạch bằng cleanup().
import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SVC) throw new Error("Thiếu biến môi trường Supabase (chạy với --env-file=.env.local)");

export const PASSWORD = "Test@123456";
export const DOMAIN = "qaqc.example.com";
export const svc = createClient(URL_, SVC, { auth: { persistSession: false } });
export const anonClient = () => createClient(URL_, ANON, { auth: { persistSession: false } });

export const STORES = [
  { code: "TST1", name: "TEST Cửa hàng 1" },
  { code: "TST2", name: "TEST Cửa hàng 2" },
];
export const EMPLOYEES = [
  { code: "TNV1", full_name: "TEST Nhân viên Một", store: "TST1" },
  { code: "TNV2", full_name: "TEST Nhân viên Hai", store: "TST1" },
  { code: "TNV3", full_name: "TEST Nhân viên Ba", store: "TST2" },
];
// role null = tài khoản đăng nhập được nhưng không có hồ sơ (vd: ai đó tự đăng ký qua API)
export const USERS = [
  { username: "test.admin", full_name: "TEST Admin", role: "admin" },
  { username: "test.qa1", full_name: "TEST QA Một", role: "qa" },
  { username: "test.qa2", full_name: "TEST QA Hai", role: "qa" },
  { username: "test.cht1", full_name: "TEST CHT Một", role: "cht", store: "TST1" },
  { username: "test.cht2", full_name: "TEST CHT Hai", role: "cht", store: "TST2" },
  { username: "test.nv1", full_name: "TEST NV Một", role: "nv", employee: "TNV1" },
  { username: "test.nv2", full_name: "TEST NV Hai", role: "nv", employee: "TNV2" },
  { username: "test.off", full_name: "TEST QA nghỉ việc", role: "qa", inactive: true },
  { username: "test.ghost", full_name: "", role: null },
];

export const ctx = { store: {}, emp: {}, user: {}, vt: {} };

async function must(p, what) {
  const r = await p;
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

export async function cleanup() {
  const stores = (await svc.from("stores").select("id").like("code", "TST%")).data ?? [];
  const ids = stores.map((s) => s.id);
  if (ids.length) {
    // ảnh minh chứng của phiếu test
    const items = (await svc.from("tickets").select("items:ticket_items(evidence_paths, explanation_paths)").in("store_id", ids)).data ?? [];
    const paths = items.flatMap((t) => t.items.flatMap((i) => [...i.evidence_paths, ...i.explanation_paths]));
    if (paths.length) await svc.storage.from("evidence").remove(paths);
    await svc.from("tickets").delete().in("store_id", ids);
  }
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
  for (const u of list.users.filter((u) => u.email?.startsWith("test.") && u.email.endsWith(DOMAIN))) {
    await svc.from("tickets").delete().eq("created_by", u.id);
    await svc.from("profiles").delete().eq("id", u.id);
    await svc.auth.admin.deleteUser(u.id);
  }
  await svc.from("employees").delete().like("code", "TNV%");
  await svc.from("violation_types").delete().like("code", "TST%");
  if (ids.length) await svc.from("stores").delete().in("id", ids);
  const { data: files } = await svc.storage.from("evidence").list("test");
  if (files?.length) await svc.storage.from("evidence").remove(files.map((f) => `test/${f.name}`));
}

export async function setup() {
  await cleanup();
  for (const s of await must(svc.from("stores").insert(STORES).select("id, code"), "stores")) ctx.store[s.code] = s.id;
  const emps = await must(
    svc.from("employees").insert(EMPLOYEES.map((e) => ({ code: e.code, full_name: e.full_name, store_id: ctx.store[e.store] }))).select("id, code"),
    "employees",
  );
  for (const e of emps) ctx.emp[e.code] = e.id;
  for (const v of await must(svc.from("violation_types").select("id, code, amount, name").in("code", ["DP01", "NL01", "QT01", "NL02"]), "vt"))
    ctx.vt[v.code] = v;
  const off = await must(
    svc.from("violation_types").insert({ code: "TST-OFF", name: "TEST lỗi ngưng áp dụng", severity: "nhe", amount: 1000, active: false }).select("id, code, amount, name").single(),
    "vt off",
  );
  ctx.vt.OFF = off;

  for (const u of USERS) {
    const { data, error } = await svc.auth.admin.createUser({ email: `${u.username}@${DOMAIN}`, password: PASSWORD, email_confirm: true });
    if (error) throw new Error(`user ${u.username}: ${error.message}`);
    ctx.user[u.username] = { id: data.user.id, ...u };
    if (!u.role) continue;
    const emp = u.employee ? ctx.emp[u.employee] : null;
    const store = u.store ? ctx.store[u.store] : u.employee ? ctx.store[EMPLOYEES.find((e) => e.code === u.employee).store] : null;
    await must(
      svc.from("profiles").insert({ id: data.user.id, username: u.username, full_name: u.full_name, role: u.role, store_id: store, employee_id: emp, active: !u.inactive }),
      `profile ${u.username}`,
    );
  }
  // một ảnh thật để dùng làm minh chứng
  await svc.storage.from("evidence").upload("test/sample.jpg", SAMPLE_JPG, { contentType: "image/jpeg", upsert: true });
}

const clients = {};
export async function as(username) {
  if (clients[username]) return clients[username];
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: `${username}@${DOMAIN}`, password: PASSWORD });
  if (error) throw new Error(`login ${username}: ${error.message}`);
  return (clients[username] = c);
}
export const uid = (username) => ctx.user[username].id;

/** Gọi RPC, trả về thông báo lỗi (hoặc null nếu thành công). */
export async function call(username, fn, args) {
  const c = await as(username);
  const { error } = await c.rpc(fn, args);
  return error ? error.message : null;
}

// ---------- Dựng phiếu ở các trạng thái (qua đúng các hàm nghiệp vụ) ----------
export const EVIDENCE = ["test/sample.jpg"];

export async function draft({ qa = "test.qa1", store = "TST1", items = [{ vt: "DP01", emp: "TNV1" }], note = "TEST tự động" } = {}) {
  const c = await as(qa);
  const t = await must(c.from("tickets").insert({ store_id: ctx.store[store], created_by: uid(qa), note }).select("id").single(), "draft");
  for (const [n, it] of items.entries()) {
    await must(
      c.from("ticket_items").insert({
        ticket_id: t.id,
        violation_type_id: ctx.vt[it.vt].id,
        employee_id: it.emp ? ctx.emp[it.emp] : null,
        description: it.desc ?? `Mô tả lỗi ${n + 1}`,
        evidence_paths: it.paths ?? EVIDENCE,
        sort: n,
      }),
      "item",
    );
  }
  return t.id;
}

export async function issued(opts = {}) {
  const id = await draft(opts);
  const err = await call(opts.qa ?? "test.qa1", "issue_ticket", { p_ticket: id });
  if (err) throw new Error("issue: " + err);
  return id;
}

export const itemsOf = async (id) =>
  (await svc.from("ticket_items").select("*").eq("ticket_id", id).order("sort")).data;
export const ticket = async (id) => (await svc.from("tickets").select("*").eq("id", id).single()).data;

export async function submitted(opts = {}, responses) {
  const id = await issued(opts);
  const items = await itemsOf(id);
  const payload = items.map((i, n) => ({
    id: i.id,
    cht_response: responses?.[n] ?? "dispute",
    explanation: "TEST giải trình: nhân viên đã khắc phục ngay",
    cause: "",
    corrective_action: "",
    explanation_paths: [],
  }));
  const err = await call(opts.cht ?? "test.cht1", "save_explanation", { p_ticket: id, p_items: payload, p_submit: true });
  if (err) throw new Error("submit: " + err);
  return id;
}

export const keepAll = async (id) => (await itemsOf(id)).map((i) => ({ id: i.id, decision: "keep", final_amount: null, decision_reason: "" }));

export async function locked(opts = {}) {
  const id = await submitted(opts);
  const err = await call(opts.qa ?? "test.qa1", "lock_ticket", { p_ticket: id, p_items: await keepAll(id) });
  if (err) throw new Error("lock: " + err);
  return id;
}

export async function appealed(opts = {}) {
  const id = await locked(opts);
  const err = await call(opts.cht ?? "test.cht1", "appeal_ticket", { p_ticket: id, p_reason: "TEST khiếu nại: mức phạt chưa hợp lý" });
  if (err) throw new Error("appeal: " + err);
  return id;
}

export const notifs = async (username, ticketId) =>
  (await svc.from("notifications").select("message, read_at").eq("user_id", uid(username)).eq("ticket_id", ticketId)).data;

export const events = async (id) => (await svc.from("ticket_events").select("action, note").eq("ticket_id", id).order("id")).data;

// JPEG 1x1 hợp lệ
export const SAMPLE_JPG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
