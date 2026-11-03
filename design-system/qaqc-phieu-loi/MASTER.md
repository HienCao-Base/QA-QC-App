# Design System — Phiếu lỗi QA/QC (MASTER)

> Nguồn chuẩn duy nhất cho giao diện. Khi làm một trang, đọc file này trước; nếu có
> `pages/<tên-trang>.md` thì quy tắc trong đó **ghi đè** file này.
>
> Tạo ngày 2026-11-02, dựa trên dữ liệu skill UI/UX Pro Max (nhóm *Government/Public Service*,
> *B2B Service*, *Productivity Tool*; cặp font *Vietnamese Friendly*) và code hiện có trong
> `app/globals.css`, `components/ui.tsx`, `lib/format.ts`.

---

## 1. Định hướng

| | |
|---|---|
| **Loại sản phẩm** | Công cụ nội bộ: QA lập phiếu lỗi → NV giải trình → CHT/QA quyết định → chốt |
| **Người dùng** | QA đi kiểm tra cửa hàng, cửa hàng trưởng, nhân viên, admin. Phần lớn dùng **điện thoại**, ngoài hiện trường, một tay, ánh sáng mạnh |
| **Phong cách** | *Accessible & Ethical* + *Minimalism / Swiss* + *Flat*. Phẳng, rõ ràng, tương phản cao, không trang trí |
| **Cảm giác** | Đáng tin, nghiêm túc, nhanh. Trạng thái phiếu phải đọc được trong 1 giây |
| **Mật độ** | Vừa–dày (danh sách phiếu, bảng admin) nhưng vùng chạm vẫn ≥ 44px |
| **Chuyển động** | Tối thiểu: chỉ phản hồi tương tác (150–200ms), không hiệu ứng trang trí |

**Tránh:** glassmorphism, gradient tím/hồng kiểu "AI", nền tối mặc định, emoji làm icon, chữ xám nhạt
trên nền trắng, hiệu ứng chuyển động dài, onboarding phức tạp.

---

## 2. Màu sắc

Mọi màu khai báo trong `@theme` ở `app/globals.css`. Component chỉ dùng tên token / class Tailwind,
**không viết mã hex trực tiếp** trong component.

### 2.1 Thương hiệu & nền

| Token | Hex | Vai trò | Tương phản |
|---|---|---|---|
| `brand-50` | `#eef4fb` | Nền nhấn nhẹ, hover thẻ, tab đang chọn | — |
| `brand-100` | `#d7e5f5` | Vòng focus của input | — |
| `brand-600` | `#1f5fa8` | **Màu chính**: nút chính, link, viền focus | 6.44:1 trên trắng ✅ |
| `brand-700` | `#184d8a` | Hover / nhấn của nút chính | chữ trắng 8.51:1 ✅ |
| `brand-900` | `#0f2c4f` | Tiêu đề nhấn hiếm dùng | — |
| `ink` | `#16202c` | Chữ chính | 15.3:1 trên `paper` ✅ |
| `paper` | `#f5f7fa` | Nền trang | — |
| `white` | `#ffffff` | Nền thẻ, header, input | — |

### 2.2 Chữ & viền trung tính (slate)

| Dùng cho | Class | Tương phản | Ghi chú |
|---|---|---|---|
| Chữ chính | `text-ink` | 15.3:1 | |
| Chữ phụ (mô tả, meta) | `text-slate-600` | ~7.6:1 | **Mặc định cho chữ phụ** |
| Chữ phụ nhỏ trên nền trắng | `text-slate-500` | 4.76:1 ✅ | Chỉ trên nền **trắng**; trên `paper` chỉ đạt 4.43 ❌ |
| ~~Chữ mờ~~ | ~~`text-slate-400`~~ | 2.56:1 ❌ | **Cấm dùng cho chữ.** Chỉ cho icon trang trí (chevron) |
| Viền input, checkbox | `border-slate-500` | 4.76:1 ✅ (`slate-400` chỉ 2.56 ❌) | WCAG 1.4.11: viền điều khiển cần ≥ 3:1 |
| Viền thẻ, đường kẻ | `border-slate-200` | trang trí | Được phép thấp vì thẻ không phải điều khiển |

### 2.3 Màu ngữ nghĩa — trạng thái phiếu

Nguồn: `STATUS_STYLE` trong `lib/format.ts`. Dạng chip: nền `-50`, chữ `-800`, viền `ring-*-200`.
**Luôn kèm nhãn chữ** — không bao giờ chỉ dùng màu để báo trạng thái.

| Trạng thái | Nhãn | Màu | Tương phản chữ/nền | Ý nghĩa thị giác |
|---|---|---|---|---|
| `draft` | Nháp | slate | ✅ | Chưa có hiệu lực |
| `pending_explanation` | Chờ giải trình | **amber** | 6.84:1 ✅ | Cần hành động, có hạn chót |
| `pending_decision` | Chờ quyết định | **sky** | 7.09:1 ✅ | Đang xử lý |
| `locked` | Đã chốt | **emerald** | 7.29:1 ✅ | Hoàn tất |
| `cancelled` | Đã huỷ | **rose** | 5.72:1 ✅ | Vô hiệu |

### 2.4 Màu ngữ nghĩa — mức độ lỗi

Nguồn: `SEVERITY_STYLE`. Chip không viền (`ring-0`), nền `-100`, chữ `-800`.

| Mức | Màu | Tương phản |
|---|---|---|
| Nhẹ | slate-100 / slate-700 | ✅ |
| Trung bình | orange-100 / orange-800 | 6.38:1 ✅ |
| Nặng | red-100 / red-800 | 6.80:1 ✅ |

### 2.5 Phản hồi hệ thống

| Loại | Màu | Dùng |
|---|---|---|
| Thành công | emerald-700/800 trên emerald-50 | Toast, banner "đã lưu" |
| Cảnh báo | amber-800/900 trên amber-50 | Sắp hết hạn giải trình |
| Lỗi / nguy hiểm | rose-700 (chữ), rose-600 (nền nút xoá đã xác nhận) | Lỗi form, nút huỷ/xoá |
| Thông tin | sky-800 trên sky-50 | Ghi chú hướng dẫn |

Quy ước: **amber = cần làm, sky = đang chờ người khác, emerald = xong, rose = huỷ/lỗi**. Không dùng
các màu này cho mục đích khác (ví dụ không dùng emerald làm màu nút thường).

### 2.6 Chế độ tối

Hiện **chỉ hỗ trợ sáng** (`color-scheme: light`) — có chủ đích: dùng ngoài trời, ánh sáng mạnh.
Nếu sau này thêm chế độ tối, phải định nghĩa lại toàn bộ token ở mục 2.1–2.5 và kiểm tra lại tương phản.

---

## 3. Chữ (Typography)

- **Font:** Be Vietnam Pro (qua `next/font`, subset `latin` + `vietnamese`), dự phòng `system-ui`.
  Đây là font khuyến nghị số 1 cho tiếng Việt trong dữ liệu skill. Trọng lượng: 400, 500, 600, 700.
- **Số:** dùng utility `tnum` (chữ số đều độ rộng) cho mã phiếu, tiền, ngày giờ, đếm ngược.
- **Tiếng Việt có dấu:** line-height không dưới 1.4 để dấu không bị cắt; không dùng `leading-none`
  cho chữ có dấu, `leading-tight` chỉ cho khối 1 dòng.

| Vai trò | Class | Cỡ | Ghi chú |
|---|---|---|---|
| Tiêu đề trang | `text-xl font-bold text-balance` | 20px | Mỗi trang đúng 1 `h1` (`PageTitle`) |
| Tiêu đề khối lớn | `text-lg font-semibold` | 18px | |
| Nhãn nhóm (Section) | `text-xs font-semibold uppercase tracking-wider text-slate-600` | 12px | |
| Chữ thân | `text-sm` | 14px | Mặc định cho nội dung thẻ, bảng |
| Ô nhập liệu | `text-base` | **16px** | **Bắt buộc ≥ 16px** để iOS không tự phóng to |
| Chữ phụ / meta | `text-xs text-slate-600` | 12px | Cỡ nhỏ nhất cho chữ có nội dung |
| Số đếm trong badge | `text-[11px]` | 11px | Chỉ cho số trong badge, không cho câu chữ |

**Cấm:** chữ dưới 11px (`text-[10px]` hiện có 1 chỗ — cần sửa).

---

## 4. Khoảng cách, bo góc, đổ bóng

**Lưới 4px** (thang Tailwind mặc định).

| Dùng | Giá trị |
|---|---|
| Lề ngang trang (mobile) | `px-4` (16px) |
| Khoảng giữa các khối trong trang | `space-y-6` (24px) |
| Khoảng giữa các thẻ trong danh sách | `space-y-2` (8px) |
| Padding thẻ | `px-4 py-3` (thẻ danh sách), `p-4` (thẻ nội dung) |
| Khoảng label → input | `mb-1` (4px) |
| Khoảng giữa các trường form | `space-y-4` (16px) |
| Khoảng tối thiểu giữa 2 vùng chạm | 8px (`gap-2`) |

| Bo góc | Dùng |
|---|---|
| `rounded-lg` (8px) | Nút, input, logo |
| `rounded-xl` (12px) | Thẻ (`card`), dialog |
| `rounded-full` | Chip, badge, avatar |

**Đổ bóng:** gần như không dùng — phân lớp bằng viền `slate-200` và nền `white` trên `paper`.
Chỉ dùng `shadow-lg` cho lớp nổi (dialog, menu, toast).

---

## 5. Bố cục & responsive

- **Mobile-first.** Thiết kế cho 360–414px trước, rồi mở rộng.
- **Khung nội dung:** `mx-auto max-w-3xl px-4` (768px) cho mọi trang người dùng. Trang admin có
  bảng rộng có thể dùng `max-w-5xl`, khai báo trong `pages/admin.md`.
- **Breakpoint:** chỉ dùng `sm` (640) và `md` (768) của Tailwind. Không đặt breakpoint tuỳ ý.
- **Header:** sticky, `bg-white/95 backdrop-blur`, cao gọn; nav dạng tab ngang ngay dưới.
  Tối đa 2–3 mục nav mỗi vai trò (hiện đúng như vậy).
- **Không cuộn ngang trang.** Bảng rộng phải nằm trong `overflow-x-auto` riêng, hoặc chuyển thành
  thẻ trên mobile.
- **Chiều cao:** dùng `min-h-dvh`, không dùng `100vh`.
- **Nút hành động chính của form dài** (lập phiếu, giải trình, quyết định): trên mobile đặt trong
  thanh dính đáy `sticky bottom-0` có `pb-[env(safe-area-inset-bottom)]`, để không phải cuộn xuống.

---

## 6. Component

Các utility dưới đây đã có trong `app/globals.css`. Thêm component mới thì tái sử dụng chúng,
không tự viết lại class.

### Nút — `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`

- **Chiều cao tối thiểu 44px** (`min-h-11`). Hiện `py-2.5 text-sm` ≈ 40px → cần bổ sung `min-h-11`.
- Nút chỉ có icon (`btn-ghost px-2.5`) phải có `aria-label` và vùng chạm `size-11`.
- Mỗi màn hình **1 nút primary**. Hành động phụ dùng secondary/ghost.
- Hành động phá huỷ (huỷ phiếu, xoá) dùng `btn-danger` + `ConfirmButton` (xác nhận 2 bước).
- Khi đang gửi: `disabled` + icon `Loader2 animate-spin` + đổi nhãn ("Đang lưu…"). Không để nút
  im lặng.
- Focus: `focus-visible:ring-2 ring-brand-600 ring-offset-2` — **không bao giờ bỏ**.

### Ô nhập — `input`, `label`

- Luôn có `label` hiển thị (không dùng placeholder thay label).
- Viền `slate-500` (xem 2.2), focus `border-brand-600 ring-2 ring-brand-100`.
- Lỗi: viền `rose-600`, thông báo lỗi `text-sm text-rose-700` **ngay dưới ô**, gắn
  `aria-invalid` + `aria-describedby`.
- Gợi ý dùng `text-xs text-slate-600` dưới ô.
- Dùng đúng `type` / `inputMode` (số tiền → `inputMode="numeric"`) để bàn phím điện thoại phù hợp.

### Thẻ — `card`

- `rounded-xl border border-slate-200 bg-white`. Thẻ bấm được (như `TicketCard`) thêm hover
  `hover:border-brand-600/40 hover:bg-brand-50/30` và có chevron bên phải.

### Chip — `chip`, `StatusChip`, `SeverityChip`

- Chỉ để hiển thị, không bấm. Nếu cần bộ lọc bấm được, làm thành nút với vùng chạm 44px.
- Chip không được xuống dòng: thêm `whitespace-nowrap`.

### Thẻ phiếu — `TicketCard`

Thứ tự đọc: **mã phiếu + trạng thái (+ đếm ngược)** → cửa hàng → danh sách lỗi (truncate) →
thời gian · người lập. Bên phải: **tổng tiền** (tnum, đậm). Giữ thứ tự này ở mọi danh sách phiếu.

### Khác

| Component | Quy tắc |
|---|---|
| `PageTitle` | 1 `h1`, phụ đề `text-sm text-slate-600`, nút hành động bên phải (xuống dòng trên mobile) |
| `Section` | Nhãn nhóm viết hoa + badge số đếm |
| `Empty` | Câu ngắn nói rõ *vì sao trống* và (nếu có) *làm gì tiếp* |
| Toast (`sonner`) | `top-center`, `richColors`. Thành công ngắn gọn; lỗi phải nói cách khắc phục |
| `Countdown` | slate khi còn > 24h, amber 4–24h, rose < 4h, nền rose-600 khi quá hạn; luôn kèm chữ ("Còn 5h 20p") |
| Ảnh (`Photos`) | Nén trước khi tải lên, giữ tỉ lệ khung cố định để không nhảy layout, có `alt` |

---

## 7. Icon

- Bộ duy nhất: **lucide-react**. Không dùng emoji, không trộn bộ icon khác.
- Cỡ: `size-4` trong nút/dòng chữ, `size-5` cho icon đứng riêng ở header.
- Icon đi kèm chữ: `aria-hidden`. Icon đứng một mình: phải có `aria-label` trên nút chứa nó.
- Màu icon theo màu chữ của phần tử cha (`currentColor`).

---

## 8. Chuyển động

- Chỉ dùng `transition-colors` (và `transition-opacity` khi cần), 150–200ms.
- Không animate `width/height/top/left`. Không hiệu ứng khi cuộn.
- Tôn trọng `prefers-reduced-motion`: spinner vẫn được, còn hiệu ứng chuyển cảnh thì tắt.

---

## 9. Checklist trước khi giao một màn hình

- [ ] Chữ đạt ≥ 4.5:1 (không còn `text-slate-400` cho chữ; `slate-500` chỉ trên nền trắng)
- [ ] Viền ô nhập đạt ≥ 3:1
- [ ] Mọi vùng chạm ≥ 44×44px, cách nhau ≥ 8px
- [ ] Ô nhập cỡ chữ ≥ 16px, có label hiển thị, lỗi nằm ngay dưới ô
- [ ] Nút icon có `aria-label`; focus ring nhìn thấy được khi dùng bàn phím
- [ ] Trạng thái/mức độ luôn có chữ, không chỉ màu
- [ ] Có trạng thái đang tải, trống, lỗi cho mọi danh sách và form
- [ ] Không cuộn ngang ở 360px; bảng rộng có vùng cuộn riêng
- [ ] Số tiền/mã/ngày dùng `tnum`
- [ ] Không có mã hex trực tiếp trong component

---

## 10. Chênh lệch giữa code hiện tại và hệ thống này

Những chỗ code đang lệch so với tài liệu, cần sửa ở bước rà soát UI:

| # | Vấn đề | Nơi | Sửa |
|---|---|---|---|
| 1 | Chữ `text-slate-400` (2.56:1) cho thời gian, người lập | `components/ticket-card.tsx` và nơi khác | → `text-slate-600` |
| 2 | `text-slate-500` trên nền `paper` (4.43:1) | `Section`, `PageTitle` sub, header | → `text-slate-600` |
| 3 | Viền input `slate-300` (1.48:1) | utility `input` trong `globals.css` | → `border-slate-500` |
| 4 | Nút cao ~40px | utility `btn` | thêm `min-h-11` |
| 5 | Nút đăng xuất icon-only nhỏ | `app/(app)/layout.tsx` | `size-11` |
| 6 | Chữ `text-[10px]` | 1 chỗ trong `app/` | → tối thiểu `text-[11px]` cho số, `text-xs` cho chữ |
| 7 | Chip có thể xuống dòng | utility `chip` | thêm `whitespace-nowrap` |
