# Phiếu lỗi QA/QC

Web app (ưu tiên điện thoại) để QA/QC ghi nhận lỗi cửa hàng, cửa hàng giải trình, QA chốt tiền phạt, cửa hàng khiếu nại lên Admin.

**Công nghệ:**
- Next.js 16 (App Router, Server Actions, Turbopack) và React 19
- Supabase: Postgres, Auth, Storage, pg_cron, Realtime
- Tailwind CSS 4 và shadcn/ui (preset radix-nova), icon lucide-react, thông báo sonner

> Hướng dẫn sử dụng cho người dùng cuối (theo vai trò): [`docs/HUONG-DAN-SU-DUNG.md`](docs/HUONG-DAN-SU-DUNG.md)

---

## 1. Cài đặt lần đầu

Yêu cầu: Node.js ≥ 20, một project Supabase (nên chọn region Singapore).

1. **Cài thư viện:** `npm install`
2. **Tạo database:** vào Supabase → *SQL Editor*, dán và chạy **lần lượt** từng file trong `supabase/migrations/`:

   | File | Nội dung |
   |---|---|
   | `0001_schema.sql` | Bảng, RLS, hàm nghiệp vụ, job hạn 48h (pg_cron), realtime |
   | `0002_seed.sql` | Cửa hàng, nhân viên, danh mục lỗi mẫu |
   | `0003_nhan_vien.sql` | Vai trò Nhân viên (nv) |
   | `0004_sua_phieu.sql` | QA sửa phiếu khi đang chờ giải trình |
   | `0005_kiem_soat_chot.sql` | Chốt ≤ mức đề xuất, lý do ≥ 15 ký tự, trả lại cửa hàng, khiếu nại lên Admin |
   | `0006_va_loi_kiem_thu.sql` | Vá bảo mật từ bộ kiểm thử (tài khoản bị khóa, quyền ghi cột, quyền xem ảnh, …) |
   | `0007_ly_do_toi_thieu.sql` | Lý do hủy phiếu / xóa lỗi / sửa lớn ≥ 15 ký tự |

   Khi thêm migration mới: đặt số tiếp theo, ghi vào bảng này và chạy trên **mọi** môi trường.
3. **Khai báo khóa:** sao chép `.env.example` thành `.env.local`, điền 3 giá trị lấy từ *Project Settings → API*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`: khóa bí mật, chỉ dùng phía server, **không** đưa lên Git.
4. **Tạo tài khoản mẫu:** `npm run seed:users` (mật khẩu chung `123456`, xem mục 6).
5. **Tắt tự đăng ký:** vào *Authentication → Sign In / Providers*, tắt *Allow new users to sign up*. Tài khoản chỉ do Admin tạo trong app.
6. **Chạy app:** `npm run dev`, mở http://localhost:3000.
   - Để mở từ điện thoại cùng mạng LAN, dùng `http://<IP máy>:3000`. Các IP LAN đã được khai báo tự động trong `allowedDevOrigins` (`next.config.ts`).

## 2. Các lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy môi trường phát triển (cổng 3000) |
| `npm run build` → `npm start` | Build và chạy bản production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Kiểm tra kiểu TypeScript |
| `npm run seed:users` | Tạo tài khoản mẫu (bỏ qua tài khoản đã có) |
| `npm run test:static` | Nhóm 8: typecheck + lint + build |
| `npm run test:api` | Kiểm thử lớp API, nhóm 1, 2, 3, 5 (~3 phút, không cần chạy app) |
| `npm run test:ui` | Kiểm thử giao diện trên iPhone giả lập, nhóm 1, 2, 4, 5, 6, 7 (~8 phút) |

**Chạy kiểm thử giao diện:**
1. `npm run build`
2. `npx next start -p 3123`
3. Ở cửa sổ khác: `npm run test:ui`

Tuỳ chọn khi chạy test:
- `BASE=…` đổi địa chỉ app, `CHROME=…` đổi đường dẫn Chrome.
- `KEEP=1` giữ lại dữ liệu test để xem.

Test tự tạo dữ liệu riêng (cửa hàng `TST*`, tài khoản `test.*`) rồi xóa sạch, không đụng vào dữ liệu thật. Danh sách test case: [`tests/TESTCASES.md`](tests/TESTCASES.md).

## 3. Kiến trúc

```
Trình duyệt ──Server Action / RSC──▶ Next.js server ──supabase-js (khóa người dùng)──▶ Postgres
                                                     └─(service role, chỉ quản lý tài khoản)
```

- **Mọi quy tắc nghiệp vụ nằm trong hàm SQL** (`security definer`). Giao diện chỉ gọi các hàm này qua `app/actions.ts`, và kiểm tra lại trên giao diện chỉ để báo lỗi sớm.
  Khi đổi quy tắc, **sửa SQL trước**, rồi sửa giao diện cho khớp.
- **Phân quyền xem** dùng Row Level Security (`can_see_ticket`, `my_role`, `my_store`):
  - Admin xem mọi phiếu trừ nháp; QA xem mọi phiếu và phiếu nháp của mình.
  - CHT và NV chỉ xem phiếu đã phát hành của cửa hàng mình.
- **Quyền ghi theo cột** (0006): người dùng chỉ ghi trực tiếp được vài cột của phiếu nháp và cột `read_at` của thông báo. Mọi chuyển trạng thái phải qua hàm.
- **Ảnh** lưu ở bucket riêng tư `evidence`, xem qua signed URL (1 giờ). Người dùng chỉ xem được ảnh của phiếu mình có quyền xem.
- **Job** `process_deadlines` chạy mỗi 5 phút (pg_cron): tự khóa phiếu quá hạn theo mức đề xuất, nhắc hạn trước 24h và 4h.
- **Thông báo** là bảng `notifications`; chuông nhận realtime qua Supabase Realtime. Số chưa đọc luôn do server đếm.

### Vòng đời phiếu

```
Nháp ─phát hành─▶ Chờ giải trình ─CHT gửi─▶ Chờ chốt ─QA chốt─▶ Đã khóa ─CHT khiếu nại (1 lần, 24h)─▶ Admin xử lý
                   │  ▲  (48h, QA sửa được)       │                │  ▲
                   │  └──── QA trả lại ───────────┘                │  └ giữ nguyên / giảm tiền
                   ├─ quá hạn: tự khóa theo mức đề xuất ────────────┤
                   └─ QA hủy ─▶ Đã hủy           Chờ chốt ◀─Admin mở lại (khi không có khiếu nại đang chờ)
```

| Hàm SQL | Ai gọi | Việc |
|---|---|---|
| `issue_ticket` | QA lập phiếu | Phát hành: sinh mã `QC-YYMMDD-NNNN`, hạn 48h, chụp lại tên lỗi / mức tiền |
| `edit_issued_item`, `delete_issued_item` | QA lập phiếu | Sửa phiếu khi chờ giải trình (sửa lớn: lý do ≥ 15, gia hạn ≥ 24h) |
| `cancel_ticket` | QA lập phiếu | Hủy khi chờ giải trình |
| `save_explanation` | CHT, NV | Lưu giải trình; chỉ CHT được gửi |
| `lock_ticket` | QA lập phiếu | Chốt Giữ / Giảm / Miễn; tiền ≤ mức trần (`item_cap`) |
| `return_to_store` | QA lập phiếu | Trả lại cửa hàng (muốn tăng tiền / đổi lỗi) |
| `appeal_ticket` | CHT | Khiếu nại 1 lần trong 24h sau khi khóa |
| `resolve_appeal` | Admin | Giữ nguyên hoặc giảm tiền (lưu `qa_final_amount`) |
| `reopen_ticket` | Admin | Mở lại phiếu đã khóa về Chờ chốt |
| `process_deadlines` | pg_cron | Tự khóa quá hạn, nhắc hạn |

## 4. Cấu trúc thư mục

```
app/
  login/                    Đăng nhập (tên đăng nhập → email ảo @qaqc.example.com)
  (app)/layout.tsx, shell.tsx   Khung app: header, tab dưới đáy (mobile), chuông thông báo realtime
  (app)/page.tsx            Chuyển về trang chủ theo vai trò
  (app)/qa | cht | nv/      "Việc của tôi" của từng vai trò
  (app)/admin/              Khiếu nại chờ xử lý + quản lý tài khoản, cửa hàng, nhân viên, danh mục lỗi
  (app)/phieu/              Danh sách + lọc (filters.tsx); moi/ tạo phiếu
  (app)/phieu/[id]/         Chi tiết phiếu; giao diện theo chế độ:
      draft-editor.tsx        nháp (QA): thêm / sửa lỗi, ảnh, phát hành
      issued-editor.tsx       sửa phiếu đang chờ giải trình (QA)
      explanation-form.tsx    giải trình (CHT / NV)
      decision-form.tsx       chốt (QA), trả lại cửa hàng
      appeal.tsx              khiếu nại (CHT) và xử lý khiếu nại (Admin)
      ticket-actions.tsx      hủy (QA), mở lại (Admin)
  (app)/thong-bao/          Danh sách thông báo (bấm = đánh dấu đã đọc + mở phiếu)
  api/export/route.ts       Xuất Excel (tự lọc theo quyền)
  actions.ts                Toàn bộ Server Actions
components/
  ui/                       Thành phần shadcn/ui (đã chỉnh vùng chạm ≥ 44px trên mobile)
  common.tsx                StatusChip, PageTitle, Section, Panel, ActionBar, …
  photos.tsx                Chọn / nén / tải ảnh, lưới ảnh, xem toàn màn hình
  confirm-button.tsx        Nút có hộp xác nhận (+ lý do tối thiểu)
  item-summary.tsx          Hiển thị một lỗi, giải trình, kết quả; itemSuggested / itemCap
lib/
  auth.ts                   getCurrentUser, requireRole
  queries.ts                listTickets, signUrls
  format.ts                 Nhãn trạng thái, định dạng tiền / ngày, MIN_REASON, APPEAL_WINDOW_MS
  types.ts                  Kiểu dữ liệu
  supabase/                 client.ts (trình duyệt), server.ts (server + admin/service role)
proxy.ts                    Làm mới phiên đăng nhập, chặn trang khi chưa đăng nhập
supabase/migrations/        SQL (xem mục 1)
scripts/seed-users.mjs      Tạo tài khoản mẫu
tests/                      Bộ kiểm thử (api.test.mjs, ui.test.mjs, lib.mjs, TESTCASES.md)
design-system/              Hệ thống thiết kế (MASTER.md) và báo cáo review UI
docs/                       Tài liệu người dùng cuối
```

## 5. Quy ước khi sửa code

- **Next.js 16 có thay đổi lớn:** đọc hướng dẫn trong `node_modules/next/dist/docs/` trước khi viết code Next (xem `AGENTS.md`).
- Giao diện dùng component trong `components/ui` và màu dạng token (`bg-card`, `text-muted-foreground`, …). Không dùng mã màu cứng. Quy chuẩn ở `design-system/qaqc-phieu-loi/MASTER.md`.
- Thêm quy tắc nghiệp vụ: viết migration mới, viết test trong `tests/api.test.mjs`, rồi chạy `npm run test:api`.
- Đổi giao diện: chạy `npm run test:ui` để kiểm tra trên điện thoại giả lập.
- Hằng số dùng chung giữa SQL và giao diện phải giữ khớp nhau:
  - `MIN_REASON = 15` ↔ `valid_reason(p, 15)`
  - `APPEAL_WINDOW_MS = 24h` ↔ `interval '24 hours'`
  - `itemCap` ↔ `item_cap`

## 6. Tài khoản mẫu (mật khẩu `123456`, **đổi trước khi dùng thật**)

| Tên đăng nhập | Vai trò |
|---|---|
| `admin` | Admin |
| `qa1`, `qa2` | QA/QC |
| `cht01`, `cht02`, `cht03` | Cửa hàng trưởng CH01, CH02, CH03 |
| `nv001`, `nv002` | Nhân viên CH01 |
| `nv004` | Nhân viên CH02 |

## 7. Triển khai production

- Deploy lên Vercel (hoặc server Node bất kỳ chạy `npm run build && npm start`), khai báo 3 biến môi trường như `.env.local`.
- Kiểm tra trên Supabase:
  - đã chạy đủ migration;
  - pg_cron đang bật (*Database → Extensions*);
  - đã tắt tự đăng ký;
  - đã đổi mật khẩu các tài khoản mẫu.
- Luôn chạy production qua HTTPS (Vercel có sẵn).
