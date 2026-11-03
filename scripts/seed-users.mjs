// Tạo tài khoản mẫu. Chạy: npm run seed:users  (sau khi đã chạy 2 file SQL)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = "123456";

const { data: stores, error } = await db.from("stores").select("id, code");
if (error) throw error;
const store = (code) => stores.find((s) => s.code === code)?.id ?? null;
const { data: emps } = await db.from("employees").select("id, code, store_id");
const nv = (username, full_name, code) => {
  const e = emps.find((x) => x.code === code);
  return { username, full_name, role: "nv", store_id: e?.store_id, employee_id: e?.id };
};

const users = [
  { username: "admin", full_name: "Quản trị hệ thống", role: "admin", store_id: null },
  { username: "qa1", full_name: "Nguyễn Văn An (QA)", role: "qa", store_id: null },
  { username: "qa2", full_name: "Lý Thị Bình (QA)", role: "qa", store_id: null },
  { username: "cht01", full_name: "Phạm Thanh Tâm", role: "cht", store_id: store("CH01") },
  { username: "cht02", full_name: "Đỗ Hoàng Nam", role: "cht", store_id: store("CH02") },
  { username: "cht03", full_name: "Trương Mỹ Duyên", role: "cht", store_id: store("CH03") },
  nv("nv001", "Trần Thị Mai", "NV001"),
  nv("nv002", "Lê Văn Hùng", "NV002"),
  nv("nv004", "Võ Minh Tuấn", "NV004"),
];

for (const u of users) {
  const { data, error } = await db.auth.admin.createUser({
    email: `${u.username}@qaqc.example.com`,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    console.log(`- ${u.username}: đã có, bỏ qua`);
    continue;
  }
  const { error: e2 } = await db.from("profiles").insert({ id: data.user.id, ...u });
  console.log(e2 ? `- ${u.username}: lỗi ${e2.message}` : `✓ ${u.username} (${u.role})`);
}
console.log(`\nMật khẩu chung: ${PASSWORD}`);
