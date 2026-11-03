# Bộ kiểm thử QA/QC phiếu lỗi

## Cách chạy

```bash
npm run test:static   # Nhóm 8: typecheck + lint + build
npm run test:api      # Nhóm 1, 2, 3, 5 ở lớp API (~3 phút, không cần chạy app)
npm run build && npx next start -p 3123   # cửa sổ khác
npm run test:ui       # Nhóm 1, 2, 4, 5, 6, 7 trên giao diện điện thoại (~8 phút)
```

- Đặt `BASE=http://...` để test giao diện trên địa chỉ khác (mặc định `http://localhost:3123`).
- Test giao diện mở bằng Chrome đã cài trên máy. Đổi đường dẫn bằng biến `CHROME=...`.
- Ảnh chụp màn hình cuối mỗi test nằm ở `tests/shots/`.

**Dữ liệu test:**
- Test tự tạo cửa hàng `TST1`, `TST2`, nhân viên `TNV1–3`, lỗi `TST-OFF` và các tài khoản `test.*` (mật khẩu `Test@123456`), rồi xóa sạch khi chạy xong.
- Không đụng vào phiếu và tài khoản thật.
- Đặt `KEEP=1` để giữ lại dữ liệu sau khi chạy, tiện cho việc xem lại.

Lưu ý: mã phiếu dùng chung dãy số với phiếu thật, nên số thứ tự phiếu thật sẽ nhảy cóc sau mỗi lần chạy test.

## Danh sách test case

### Nhóm 1 · Phân quyền

| ID | Kiểm tra | Lớp |
|---|---|---|
| PQ-01 | CHT không xem được phiếu, dòng lỗi, lịch sử của cửa hàng khác | API |
| PQ-02 | Phiếu nháp chỉ QA lập phiếu thấy | API |
| PQ-03 | Nhân viên chỉ xem phiếu của cửa hàng mình | API |
| PQ-04 | CHT / NV / Admin không tạo được phiếu | API |
| PQ-05 | Không sửa thẳng bảng phiếu / dòng lỗi để vượt quy trình (đổi trạng thái, tiền) | API |
| PQ-06 | QA khác không phát hành / sửa / chốt / trả lại / hủy phiếu của QA1 | API |
| PQ-07 | CHT cửa hàng khác không giải trình / khiếu nại được | API |
| PQ-08 | NV không gửi được, không giải trình lỗi của người khác, không khiếu nại | API |
| PQ-09 | Chỉ Admin mở lại phiếu / xử lý khiếu nại | API |
| PQ-10 | Admin không chốt thay QA | API |
| PQ-11 | Tài khoản không có hồ sơ (tự đăng ký qua API) không làm được gì | API |
| PQ-12 | Tài khoản đã khóa (phiên đăng nhập còn hạn) không thao tác được | API |
| PQ-13 | Chưa đăng nhập: không đọc / gọi được gì | API |
| PQ-14 | Không gọi được hàm nội bộ (gửi thông báo, ghi lịch sử, job hạn) | API |
| PQ-15 | Người không phải Admin không sửa được danh mục lỗi, cửa hàng, vai trò | API |
| PQ-16 | Chỉ đọc / đánh dấu thông báo của mình | API |
| PQ-17 | QA không cài sẵn trạng thái khiếu nại / kết quả chốt vào phiếu nháp | API |
| PQ-18 | Ảnh minh chứng: cửa hàng khác không xem được | API |
| PQ-UI-01 | Gõ URL trang của role khác bị chuyển về trang của mình | UI |
| PQ-UI-02 | Mở phiếu không có quyền / id sai → trang không tìm thấy | UI |
| PQ-UI-03 | Nút Chốt, Khiếu nại, Mở lại, Xử lý khiếu nại chỉ hiện cho đúng người | UI |

### Nhóm 2 · Vòng đời phiếu

| ID | Kiểm tra | Lớp |
|---|---|---|
| VD-01 | Phát hành: mã phiếu, hạn 48h, chụp mức tiền, báo CHT + NV có lỗi (không báo nhầm) | API |
| VD-02 | Không phát hành phiếu rỗng / thiếu ảnh / phát hành 2 lần | API |
| VD-03 | Không phát hành lỗi đã ngưng áp dụng | API |
| VD-04 | Lưu nháp giải trình giữ trạng thái; NV soạn thì CHT được báo | API |
| VD-05 | CHT gửi: chờ chốt, lỗi bỏ trống = chấp nhận, QA được báo | API |
| VD-06 | Không đồng ý mà không ghi giải trình thì không gửi được | API |
| VD-07 | QA chốt: khóa, tổng tiền, báo cửa hàng kèm hạn khiếu nại 24h | API |
| VD-08 | Khiếu nại → Admin chấp nhận giảm: lưu mức QA cũ, báo CHT + QA | API |
| VD-09 | Khiếu nại → Admin giữ nguyên | API |
| VD-10 | Admin mở lại → chờ chốt → QA chốt lại | API |
| VD-11 | Trả lại cửa hàng: về chờ giải trình, hạn 48h mới, giữ giải trình cũ | API |
| VD-12 | Hủy được khi chờ giải trình, không hủy được sau khi cửa hàng gửi | API |
| VD-13 | Quá hạn: job tự khóa theo mức đề xuất, CHT không gửi được, vẫn khiếu nại được | API |
| VD-14 | Xóa được phiếu nháp, không xóa được phiếu đã phát hành | API |
| VD-15 | Lịch sử ghi đủ các bước | API |
| LT-01→06 | Trọn luồng bằng thao tác chạm: QA tạo + ảnh + phát hành → CHT không đồng ý + gửi → QA giảm + chốt → CHT khiếu nại → Admin chấp nhận giảm → CHT thấy kết quả + lịch sử | UI |

### Nhóm 3 · Quy tắc nghiệp vụ

| ID | Kiểm tra |
|---|---|
| NV-01 | Chốt cao hơn mức đề xuất bị từ chối (Giảm, "adjust", "auto", Giữ kèm số tiền) |
| NV-02 | Giảm phải nhỏ hơn mức đề xuất; không âm, không rỗng |
| NV-03 | Lý do giảm / miễn ≥ 15 ký tự, khoảng trắng liên tiếp tính 1 |
| NV-04 | Phải chốt đủ từng lỗi, mỗi lỗi 1 lần, không chốt lỗi của phiếu khác |
| NV-05 | Chỉ chốt khi phiếu đang chờ chốt |
| NV-06 | Khiếu nại: 1 lần, trong 24h kể từ khi khóa, lý do ≥ 15 |
| NV-07 | Sau khi Admin xử lý: không khiếu nại lại, không xử lý lại |
| NV-08 | Admin xử lý: không tăng, chấp nhận phải giảm ít nhất 1 lỗi, lý do ≥ 15, không đụng lỗi phiếu khác |
| NV-09 | Không mở lại phiếu đang có khiếu nại; lý do mở lại ≥ 15 |
| NV-10 | Trả lại cửa hàng: lý do ≥ 15, chỉ khi chờ chốt |
| NV-11 | Phiếu đã được Admin giảm rồi bị mở lại: QA không chốt cao hơn mức Admin đã giảm |
| NV-12 | Sửa nhỏ không cần lý do; đổi lỗi / nhân viên / thêm lỗi bắt buộc lý do; đổi lỗi cập nhật mức tiền |
| NV-13 | Đổi lỗi: xóa giải trình cũ của lỗi đó, gia hạn còn ≥ 24h |
| NV-14 | Không xóa ảnh đã phát hành; nhân viên khác cửa hàng, lỗi ngưng áp dụng bị từ chối |
| NV-15 | Không sửa phiếu sau khi cửa hàng gửi / đã quá hạn |
| NV-16 | Xóa lỗi: bắt buộc lý do, phải còn ít nhất 1 lỗi |
| NV-17 | Lý do hủy phiếu / xóa lỗi / sửa lớn ≥ 15 ký tự |

### Nhóm 4 · Nhập liệu & validate (UI)

| ID | Kiểm tra |
|---|---|
| NL-01 | Form chốt: chữ trong ô tiền bị bỏ, vượt mức đề xuất báo lỗi + khóa nút, lý do 14 ký tự / toàn khoảng trắng khóa nút, 15 ký tự mở |
| NL-02 | Hộp xác nhận có lý do: khóa nút đến khi đủ 15 ký tự, nút Quay lại đóng hộp |
| NL-03 | Bấm "Chốt phiếu" 2 lần sát nhau chỉ chốt 1 lần |
| NL-04 | Lưu nháp giải trình giữ nguyên tiếng Việt có dấu, ký tự đặc biệt khi tải lại |
| NL-05 | Xử lý khiếu nại: không cho tăng tiền, cần lý do, chưa giảm thì không chấp nhận được |
| MH-01 | Đăng nhập: để trống không gửi, sai mật khẩu báo lỗi |

### Nhóm 5 · Thông báo

| ID | Kiểm tra | Lớp |
|---|---|---|
| TB-01 | Mỗi bước báo đúng người, không báo nhầm cửa hàng / QA / NV khác | API |
| TB-02 | Đánh dấu đã đọc từng cái, đếm chưa đọc đúng | API |
| TB-03 | Người dùng không sửa được nội dung thông báo | API |
| TB-UI-01 | Chuông giữ số khi chưa đọc; mở trang thông báo không trừ; mở 1 thông báo trừ đúng 1 | UI |
| TB-UI-02 | Thông báo mới hiện ngay (realtime), không cần tải lại | UI |

### Nhóm 6 · Ảnh (UI)

| ID | Kiểm tra |
|---|---|
| LT-01 | Chụp / chọn ảnh, nén, tải lên, lưu lỗi (trong luồng liên role) |
| AN-01 | Ảnh tải được; chạm xem toàn màn hình rồi đóng |
| AN-02 | Chọn file không phải ảnh: không nhận, không vỡ trang |
| AN-03 | Sửa phiếu đã phát hành: ảnh cũ không có nút xóa |

### Nhóm 7 · Màn hình & mobile (UI)

| ID | Kiểm tra |
|---|---|
| MH-02 | Mỗi role (QA, CHT, NV, Admin) mở mọi màn và trang phiếu ở mọi trạng thái (nháp, chờ giải trình, chờ chốt, đã khóa, đang khiếu nại) và mọi tab Admin. Kiểm tra: không lỗi JS, không cuộn ngang, có tiêu đề, vùng chạm ≥ 32px |
| MH-03 | Tab dưới đáy, ẩn tab trong trang phiếu, nút quay lại, menu tài khoản, đăng xuất xong không vào lại được |
| MH-04 | Bộ lọc dạng bảng trượt: lọc theo cửa hàng ra đúng kết quả |
| MH-05 | Đang đăng nhập mà tài khoản bị khóa / bị xóa: tự đăng xuất, báo lý do, không lặp chuyển hướng (ERR_TOO_MANY_REDIRECTS) |
| PT-01 | Danh sách phiếu 20/trang: sang trang giữ bộ lọc, nút Sau khóa ở trang cuối, đổi bộ lọc về trang 1, 1 trang thì ẩn phân trang, `?page=99` về trang cuối, tổng tiền đã chốt tính trên toàn bộ kết quả |
| PT-02 | Thông báo 30/trang, `?page=99` về trang cuối |
| PT-03 | Bảng Quản trị 20/trang, gõ tìm kiếm khi đang ở trang 2 thì về trang 1 |

### Nhóm 8 · Kiểm tra tĩnh

`npm run test:static`: TypeScript, ESLint, build production.
