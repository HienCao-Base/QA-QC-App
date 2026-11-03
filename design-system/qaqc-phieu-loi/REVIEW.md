# Rà soát UI — Phiếu lỗi QA/QC

> **Trạng thái: đã duyệt và áp dụng toàn bộ (A–G) ngày 2026-11-02.**
>
> Ngày 2026-11-02. Đối chiếu toàn bộ 26 file giao diện trong `app/` và `components/` với
> [MASTER.md](MASTER.md).  
>
> Cách duyệt: trả lời theo mã, ví dụ "duyệt hết", "duyệt A, B, bỏ C3", "C5 làm kiểu khác…".
> Tương phản đo theo công thức WCAG 2.x.

Mức độ: 🔴 Cao (người dùng gặp khó thật, nên sửa) · 🟠 Trung bình · 🟢 Thấp (đánh bóng)

---

## A. Sửa một lần ở `globals.css` / component dùng chung (ảnh hưởng toàn app)

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| A1 | 🔴 | Viền ô nhập `slate-300` chỉ **1.48:1**, ngoài nắng gần như không thấy ô | `app/globals.css` utility `input` | `border-slate-500` (4.76:1) |
| A2 | 🔴 | Nút cao ~40px, dưới chuẩn 44px | utility `btn` | thêm `min-h-11` |
| A3 | 🟠 | Chip có thể bị xuống dòng giữa chữ | utility `chip` | thêm `whitespace-nowrap` |
| A4 | 🟠 | Nhãn nhóm `Section` và phụ đề `PageTitle` dùng `slate-500` trên nền `paper` = **4.43:1** (dưới 4.5) | `components/ui.tsx:23,39` | `text-slate-600` (7.06:1) |
| A5 | 🟠 | Chưa có quy tắc tôn trọng "giảm chuyển động" | `globals.css` | thêm khối `@media (prefers-reduced-motion: reduce)` tắt transition (giữ spinner) |

## B. Tương phản chữ — `text-slate-400` (2.56:1) đang dùng cho chữ có nội dung

| Mã | Mức | Nơi | Nội dung bị mờ | Đề xuất |
|---|---|---|---|---|
| B1 | 🔴 | `components/ticket-card.tsx:31` | Ngày giờ · người lập phiếu | `text-slate-600` |
| B2 | 🔴 | `app/(app)/thong-bao/page.tsx:43` | Thời gian thông báo | `text-slate-600` |
| B3 | 🔴 | `app/(app)/phieu/[id]/page.tsx:146` | Thời gian trong Lịch sử | `text-slate-600` |
| B4 | 🔴 | `components/item-summary.tsx:35,40` | "Lỗi 1 · mã lỗi", "mức đề xuất" (11px + mờ) | `text-slate-600`, "mức đề xuất" lên `text-xs` |
| B5 | 🟠 | `components/item-summary.tsx:83`, `decision-form.tsx:122` | Số tiền cũ bị gạch | `text-slate-500` (vẫn đủ 4.76 trên nền trắng) |
| B6 | 🟠 | `draft-editor.tsx:245` | "(bắt buộc, tối đa 5)" — thông tin quan trọng lại mờ nhất | `text-slate-600` |
| B7 | 🟠 | `admin/crud-table.tsx:88` | Cả dòng bản ghi "Ngưng" thành `slate-400` | giữ chữ `slate-600`, chỉ dựa vào chip "Ngưng" |
| B8 | 🟠 | `phieu/[id]/page.tsx:74,120-128,166` | Link "Quay lại", ghi chú trạng thái, nhãn `dt` dùng `slate-500` trên `paper` | `text-slate-600` |
| B9 | 🟢 | `explanation-form.tsx:89` | Lỗi không thuộc quyền sửa bị `opacity-80` → chữ mờ đi | bỏ opacity, thay bằng nhãn nhỏ "Lỗi của người khác" |

## C. Vùng chạm & điện thoại

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| C1 | 🔴 | Nút **xóa ảnh** chỉ 24×24px, nằm sát ảnh bên cạnh → dễ bấm nhầm | `components/photos.tsx:86` | vùng chạm 44px (nút `size-11` trong suốt, chấm tròn hiển thị vẫn nhỏ) |
| C2 | 🔴 | Ô lọc `/phieu` và ô tìm admin cỡ chữ **14px** → iPhone tự phóng to khi chạm | `phieu/page.tsx:50-74`, `crud-table.tsx:49` | bỏ `text-sm` trên input (giữ 16px) |
| C3 | 🔴 | Nút nhỏ do ghi đè padding: "Sửa"/"Xóa" lỗi (`py-1.5` ≈ 32px), "Đổi" (≈ 26px), bút sửa admin (≈ 26px) | `draft-editor.tsx:48,52,180`, `crud-table.tsx:98` | bỏ ghi đè, dùng chiều cao chuẩn; nút icon `size-11` |
| C4 | 🟠 | Chuông, đăng xuất, logo "QC" ≈ 32–36px | `layout.tsx:42,54`, `bell.tsx:35` | `size-11` |
| C5 | 🟠 | Tab nav (≈ 36px), tab admin (≈ 32px), nút chọn Giữ/Giảm/Miễn (≈ 36px) | `nav-links.tsx:18`, `admin/page.tsx:41`, `decision-form.tsx:83` | `min-h-11` |
| C6 | 🟠 | Checkbox admin 16px | `crud-table.tsx:147` | `size-5`, cả dòng label là vùng chạm `min-h-11` |
| C7 | 🟠 | Thanh hành động dính đáy (`sticky bottom-3`) không chừa vùng an toàn → trên iPhone bị thanh Home đè | `draft-editor.tsx:87`, `explanation-form.tsx:167`, `decision-form.tsx:119` | thêm `mb-[env(safe-area-inset-bottom)]` + `viewportFit: "cover"` trong `layout.tsx` |
| C8 | 🟢 | Số trong badge chuông 10px | `bell.tsx:38` | `text-[11px]` |

## D. Phản hồi, trạng thái & an toàn thao tác

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| D1 | 🔴 | **Xóa lỗi trong phiếu nháp không hỏi lại** — một chạm là mất cả lỗi + ảnh; cũng không có spinner hay thông báo đã xóa | `draft-editor.tsx:51-63` | dùng `ConfirmButton` như các thao tác xóa khác, có toast "Đã xóa lỗi" |
| D2 | 🔴 | Không có `loading.tsx`: bấm vào phiếu trên mạng 4G yếu thì màn hình đứng yên, người dùng bấm lại nhiều lần | `app/(app)/` | thêm `loading.tsx` dạng khung xương (skeleton) cho danh sách và trang chi tiết phiếu |
| D3 | 🔴 | Không có `error.tsx`: lỗi mạng/Supabase hiện trang lỗi mặc định tiếng Anh, mất header | `app/(app)/` | thêm `error.tsx` tiếng Việt có nút "Thử lại" |
| D4 | 🟠 | Nút "Lưu lỗi" bị khóa mà không nói vì sao (thiếu lỗi vi phạm hoặc ảnh) | `draft-editor.tsx:253` | dòng gợi ý ngay trên nút: "Cần chọn lỗi vi phạm và ít nhất 1 ảnh" |
| D5 | 🟠 | Nút "Gửi giải trình" **biến mất** khi còn lỗi "Không đồng ý" chưa nhập — người dùng tưởng mất nút | `explanation-form.tsx:175` | giữ nút nhưng khóa, kèm thông báo đỏ (đã có) |
| D6 | 🟠 | Thông báo lỗi trong form không gắn với ô nhập (thiếu `aria-invalid`, `aria-describedby`); ô bắt buộc chưa có viền đỏ | `decision-form.tsx:111`, `explanation-form.tsx:125` | gắn lỗi vào đúng ô, viền `rose-600` khi lỗi |
| D7 | 🟠 | `ConfirmButton` mở ra nhưng con trỏ không chuyển vào ô lý do / nút xác nhận | `components/confirm-button.tsx` | tự focus ô lý do (hoặc nút Xác nhận); `id` ô lý do dùng `useId()` để không trùng |
| D8 | 🟠 | Thông báo không gắn phiếu dẫn tới `href="#"` (bấm không có gì xảy ra) | `thong-bao/page.tsx:37` | render `div` thay vì link khi không có `ticket_id` |
| D9 | 🟢 | Lỗi đăng nhập chưa được trình đọc màn hình đọc to | `login-form.tsx:19` | `role="alert"` |
| D10 | 🟢 | Danh sách chọn lỗi chỉ hiện 8 kết quả, không báo còn nữa | `draft-editor.tsx:146` | dòng cuối "Gõ để tìm thêm (còn N lỗi)" |

## E. Điều hướng & bố cục

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| E1 | 🟠 | "Quay lại" luôn về trang chủ theo vai trò — đang ở `/phieu?status=…` mở phiếu rồi quay lại thì **mất bộ lọc** | `phieu/[id]/page.tsx:74` | dùng `router.back()` khi có lịch sử, nếu không thì về `/` |
| E2 | 🟠 | Admin: bấm sửa một dòng ở cuối bảng, form hiện ở **đầu trang** ngoài tầm nhìn | `crud-table.tsx:60` | tự cuộn tới form và focus ô đầu tiên |
| E3 | 🟢 | Nút chọn kiểu radio (Chấp nhận/Không đồng ý, Giữ/Giảm/…) không dùng được phím mũi tên | `explanation-form.tsx:98`, `decision-form.tsx:69` | thêm điều hướng mũi tên (ít ảnh hưởng vì chủ yếu dùng điện thoại) |

## F. Màu ngữ nghĩa

| Mã | Mức | Vấn đề | Nơi | Đề xuất |
|---|---|---|---|---|
| F1 | 🟠 | Đồng hồ đếm ngược còn > 24h dùng **xanh lá** — đứng cạnh chip vàng "Chờ giải trình" dễ hiểu nhầm là "đã xong" (xanh lá = Đã chốt) | `components/countdown.tsx:27` | > 24h: xám `slate`; 4–24h: `amber`; < 4h: `rose`; quá hạn: nền `rose-600` (giữ nguyên) |

---

## G. Đề xuất thiết kế lại (bước 3)

Không phải lỗi, mà là cải thiện trải nghiệm. Mỗi mục làm độc lập.

**G1 — Bộ lọc `/phieu` gọn lại trên điện thoại** 🟠
Hiện bộ lọc 5 ô chiếm gần nửa màn hình trước khi thấy phiếu đầu tiên. Đề xuất: trên mobile chỉ hiện
ô tìm mã phiếu + nút "Bộ lọc (2)" (số bộ lọc đang bật) mở/đóng phần còn lại; trên desktop giữ như cũ.
Bộ lọc đang bật hiện thành chip có nút ✕ để bỏ từng cái.

```
┌─────────────────────────────────┐
│ [🔍 Mã phiếu QC-…      ] [Lọc 2]│
│ (Chờ giải trình ✕) (01/10–31/10 ✕)│
├─────────────────────────────────┤
│ QC-0123  [Chờ giải trình] 5h 20p│
│ ...                             │
```

**G2 — Thanh hành động đáy liền mạch** 🟠
Thay thẻ nổi `sticky bottom-3` bằng thanh dính sát đáy, viền trên, nền trắng, có vùng an toàn
(gộp C7). Áp cho 3 màn: soạn phiếu, giải trình, chốt phiếu. Trông giống thanh thanh toán của app
mua sắm, quen tay người dùng hơn và không che nội dung bằng bóng đổ.

**G3 — Xem ảnh minh chứng ngay trong app** 🟢
Bấm ảnh hiện mở tab mới (trên điện thoại là rời app). Đề xuất: lớp xem ảnh toàn màn hình, vuốt
qua lại giữa các ảnh, nút đóng 44px. Không cần thêm thư viện.

**G4 — Trang chủ theo vai trò có tóm tắt số** 🟢
Thêm một dòng 2–3 ô số nhỏ ở đầu trang "Việc của tôi" (VD QA: *Cần chốt 3 · Đang chờ 7 ·
Nháp 1*), bấm vào thì cuộn tới nhóm tương ứng. Giúp nhìn tổng quan trong 1 giây.

---

## Tóm tắt khối lượng

| Nhóm | Số mục | Ước lượng |
|---|---|---|
| A (dùng chung) | 5 | nhỏ — vài dòng CSS |
| B (tương phản) | 9 | nhỏ — đổi class |
| C (vùng chạm) | 8 | nhỏ–vừa |
| D (phản hồi) | 10 | vừa — thêm 2 file mới (D2, D3) |
| E (điều hướng) | 3 | nhỏ |
| F (màu) | 1 | rất nhỏ |
| G (thiết kế lại) | 4 | vừa–lớn, mỗi mục riêng |

**Gợi ý:** duyệt A–F trước (sửa lỗi thật, ít rủi ro), G chọn từng cái.
