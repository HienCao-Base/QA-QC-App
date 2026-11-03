# Hướng dẫn sử dụng app Phiếu lỗi QA/QC

App giúp bộ phận QA/QC ghi nhận lỗi tại cửa hàng bằng ảnh, cửa hàng giải trình, QA chốt tiền phạt, và cửa hàng khiếu nại lên Admin khi không đồng ý. Mọi bước đều được ghi lại và báo cho người liên quan.

---

## 1. Bắt đầu

### Đăng nhập
- Mở địa chỉ app do Admin cung cấp. App dùng tốt nhất trên **điện thoại**, máy tính vẫn dùng bình thường.
- Nhập **Tên đăng nhập** và **Mật khẩu** do Admin cấp, bấm **Đăng nhập**.
- Sau khi đăng nhập, app tự mở trang **Việc của tôi** đúng với vai trò của bạn.
- Quên mật khẩu: liên hệ Admin để đặt lại. App không có chức năng tự lấy lại mật khẩu.

### Đưa app ra màn hình chính điện thoại (nên làm)
- **iPhone (Safari):** bấm nút Chia sẻ → *Thêm vào MH chính*.
- **Android (Chrome):** bấm menu ⋮ → *Thêm vào màn hình chính*.

### Bố cục màn hình
- **Thanh tab dưới đáy** (trên điện thoại): *Việc*, *Phiếu*, *Tạo phiếu* (QA), *Quản trị* (Admin), *Thông báo*. Trên máy tính, các mục này nằm ở thanh trên cùng.
- **Chuông / tab Thông báo:** chấm số là số thông báo **chưa đọc**. Số chỉ giảm khi bạn bấm mở thông báo đó.
- **Ảnh đại diện (góc phải trên):** bấm để xem thông báo hoặc **Đăng xuất**.
- Trong trang chi tiết phiếu, thanh tab dưới đáy được ẩn để có chỗ cho nút thao tác. Dùng nút **Quay lại** ở góc trên để trở về.

---

## 2. Vai trò và quyền

| Việc | QA/QC | Cửa hàng trưởng (CHT) | Nhân viên (NV) | Admin |
|---|:-:|:-:|:-:|:-:|
| Tạo, sửa, phát hành, hủy phiếu | ✅ phiếu mình lập | | | |
| Xem phiếu | Tất cả | Cửa hàng mình | Cửa hàng mình | Tất cả |
| Soạn giải trình | | ✅ mọi lỗi | ✅ lỗi của chính mình | |
| **Gửi** giải trình | | ✅ | | |
| Chốt tiền phạt, trả lại cửa hàng | ✅ phiếu mình lập | | | |
| Khiếu nại kết quả | | ✅ 1 lần / phiếu | | |
| Xử lý khiếu nại, mở lại phiếu | | | | ✅ |
| Quản lý tài khoản, cửa hàng, nhân viên, danh mục lỗi | | | | ✅ |
| Xuất Excel | ✅ | ✅ cửa hàng mình | ✅ cửa hàng mình | ✅ |

> Phiếu **nháp** chỉ QA lập phiếu nhìn thấy. Cửa hàng chỉ thấy phiếu khi QA đã bấm *Phát hành*.

---

## 3. Vòng đời một phiếu

```
Nháp → Chờ giải trình → Chờ chốt → Đã khóa → (Khiếu nại → Admin xử lý)
            │    ▲            │
            │    └ QA trả lại ┘
            ├ quá 48h: tự khóa theo mức đề xuất
            └ QA hủy → Đã hủy
```

| Trạng thái | Nghĩa là | Ai cần làm gì |
|---|---|---|
| **Nháp** | QA đang soạn, cửa hàng chưa thấy | QA hoàn thiện và phát hành |
| **Chờ giải trình** | Cửa hàng có **48 giờ** để phản hồi | CHT / NV soạn, CHT gửi |
| **Chờ chốt** | Cửa hàng đã gửi giải trình | QA chốt hoặc trả lại |
| **Đã khóa** | Đã có kết quả tiền phạt | CHT được khiếu nại trong **24 giờ** |
| **Đã hủy** | Phiếu phát hành nhầm, không tính | — |

**Các mốc thời gian:**
- Hạn giải trình: **48 giờ** liên tục kể từ lúc phát hành, tính cả đêm và ngày nghỉ.
- App nhắc cửa hàng khi còn **24 giờ** và **4 giờ**.
- Quá hạn mà chưa gửi: hệ thống **tự khóa** phiếu theo mức tiền đề xuất (trạng thái ghi "tự động").
- Sau khi khóa, CHT có **24 giờ** để khiếu nại, mỗi phiếu chỉ **1 lần**.

**Quy tắc về lý do:** mọi lý do phải có **ít nhất 15 ký tự**, ô nhập có bộ đếm ký tự. Áp dụng cho giảm hoặc miễn tiền, trả lại cửa hàng, hủy phiếu, xóa lỗi, sửa lỗi (khi đổi lỗi, đổi nhân viên, thêm lỗi), khiếu nại, xử lý khiếu nại và mở lại phiếu.
Hãy viết cụ thể. Ví dụ: "Nhân viên đã thay đồng phục ngay khi được nhắc", không viết "ok" hay "đồng ý".

---

## 4. Hướng dẫn cho QA/QC

### 4.1. Trang "Việc của tôi"
Gồm 3 nhóm:
- **Cần chốt:** phiếu cửa hàng đã gửi giải trình, cần xử lý trước.
- **Phiếu nháp:** phiếu đang soạn dở.
- **Chờ cửa hàng:** phiếu đang chờ giải trình, có đồng hồ đếm ngược hạn.

Bấm vào ô số ở đầu trang để nhảy nhanh tới nhóm đó.

### 4.2. Tạo và phát hành phiếu
1. Bấm tab **Tạo phiếu**.
2. Chọn **Cửa hàng**, ghi **Ghi chú chung** nếu cần (VD: "Kiểm tra ca sáng"), bấm **Tiếp tục**.
3. Bấm **Thêm lỗi** và điền:
   - **Lỗi vi phạm:** gõ mã hoặc tên để tìm (VD: `DP01`, "đồng phục"), chạm để chọn. Mức tiền đề xuất hiện ngay.
   - **Ảnh minh chứng (bắt buộc ít nhất 1 ảnh):** bấm *Thêm ảnh* để chụp hoặc chọn từ thư viện. Ảnh được tự động nén. Bấm vào ảnh để xem to.
   - **Nhân viên vi phạm:** chọn người vi phạm, hoặc để trống nếu là lỗi chung của cửa hàng.
   - **Mô tả:** ghi rõ vị trí, thời điểm, tình huống.
   - Bấm **Lưu lỗi**. Lặp lại cho các lỗi khác.
4. Kiểm tra lại danh sách lỗi và tổng tiền, bấm **Phát hành phiếu** → **Phát hành**.

Sau khi phát hành, phiếu có mã dạng `QC-261103-0012` và cửa hàng nhận thông báo ngay. Phiếu nháp có thể bấm **Xóa phiếu nháp** nếu không dùng nữa.

### 4.3. Sửa phiếu khi cửa hàng chưa gửi
Áp dụng khi phiếu đang **Chờ giải trình** và chưa quá hạn.
- **Sửa nhỏ:** sửa mô tả hoặc thêm ảnh. Không cần lý do.
- **Sửa lớn:** đổi lỗi, đổi nhân viên, **Thêm lỗi** hoặc **Xóa** lỗi. Bắt buộc ghi lý do (≥ 15 ký tự). Khi sửa lớn:
  - phần giải trình cửa hàng đã soạn cho lỗi đó bị xóa;
  - hạn giải trình được kéo dài để còn ít nhất 24 giờ;
  - đổi lỗi thì mức tiền cập nhật theo danh mục hiện tại.
- Không xóa được ảnh đã phát hành, chỉ thêm được ảnh mới.
- Phiếu phải còn ít nhất 1 lỗi. Nếu phát hành nhầm cả phiếu, dùng **Hủy phiếu**.
- Mọi lần sửa đều ghi vào lịch sử phiếu và báo cho cửa hàng.

Khi cửa hàng đã bấm **Gửi**, phiếu không sửa được nữa.

### 4.4. Hủy phiếu
Chỉ hủy được khi phiếu đang **Chờ giải trình**. Bấm **Hủy phiếu (phát hành nhầm)**, ghi lý do, xác nhận. Cửa hàng nhận thông báo. Không hoàn tác được.

### 4.5. Chốt phiếu
Mở phiếu ở nhóm **Cần chốt**. Với từng lỗi, đọc phần giải trình và ảnh của cửa hàng, rồi chọn:

| Lựa chọn | Số tiền | Lý do |
|---|---|---|
| **Giữ** | Bằng mức đề xuất | Không cần |
| **Giảm** | Nhập số tiền **nhỏ hơn** mức đề xuất | Bắt buộc |
| **Miễn** | 0đ | Bắt buộc |

Kiểm tra **Tổng chốt** ở cuối trang, bấm **Chốt và khóa phiếu** → **Chốt phiếu**.

> **Không thể chốt cao hơn mức đề xuất.** Nếu thấy cần phạt nặng hơn hoặc ghi sai lỗi, bấm **Trả lại cửa hàng**. Các bước tiếp theo:
> 1. Phiếu quay về *Chờ giải trình* với hạn 48 giờ mới.
> 2. Bạn sửa phiếu (mục 4.3).
> 3. Cửa hàng giải trình lại.

### 4.6. Khi cửa hàng khiếu nại
Bạn nhận thông báo khi cửa hàng khiếu nại phiếu của mình. Admin là người xử lý, QA lập phiếu không xử lý khiếu nại. Bạn nhận thông báo khi Admin có kết quả.

---

## 5. Hướng dẫn cho Cửa hàng trưởng (CHT)

### 5.1. Trang "Việc của tôi"
- **Cần giải trình:** phiếu mới, có đồng hồ đếm ngược. Đồng hồ chuyển màu khi gần hết hạn.
- **Đã gửi, chờ QA chốt.**
- **Đã khóa gần đây.**

### 5.2. Giải trình và gửi
1. Mở phiếu ở nhóm **Cần giải trình**.
2. Với từng lỗi, chọn:
   - **Chấp nhận**: đồng ý với lỗi; hoặc
   - **Không đồng ý**: bắt buộc ghi **Nội dung giải trình** (vì sao không đồng ý).
3. Ghi thêm **Nguyên nhân**, **Biện pháp khắc phục** và ảnh nếu có (VD: ảnh sau khi đã khắc phục).
4. Bấm **Lưu nháp** để lưu dở và làm tiếp sau.
5. Khi xong, bấm **Gửi giải trình** → **Gửi**.

Lưu ý:
- Lỗi nào chưa phản hồi khi gửi sẽ được **coi là chấp nhận**.
- **Sau khi gửi không sửa được nữa.**
- Nhân viên có thể đã soạn trước phần giải trình cho lỗi của họ. Bạn xem lại, sửa nếu cần, rồi gửi.
- QA có thể sửa phiếu trước khi bạn gửi. Bạn sẽ nhận thông báo; lỗi bị đổi sẽ hiện nhãn *Đã sửa*, kèm phần giải trình cần làm lại.
- Quá 48 giờ mà chưa gửi, phiếu tự khóa theo mức đề xuất.

### 5.3. Xem kết quả và khiếu nại
Khi QA chốt, bạn nhận thông báo kèm tổng tiền. Mở phiếu để xem kết quả từng lỗi và lý do.

Nếu không đồng ý với kết quả, trong **24 giờ** kể từ khi khóa:
1. Bấm **Khiếu nại lên Admin**.
2. Ghi rõ lỗi nào, vì sao không đồng ý, đề xuất của cửa hàng (≥ 15 ký tự).
3. Bấm **Gửi khiếu nại**.

Mỗi phiếu chỉ được khiếu nại **1 lần**. Admin chỉ có thể **giữ nguyên** hoặc **giảm** tiền, không tăng. Kết quả hiện trong mục *Khiếu nại của cửa hàng* trên phiếu và được báo qua thông báo.

---

## 6. Hướng dẫn cho Nhân viên (NV)

- Bạn nhận thông báo khi có phiếu ghi **lỗi của chính bạn**.
- Trang **Việc của tôi** gồm:
  - **Lỗi của tôi cần giải trình;**
  - **Đã soạn, chờ cửa hàng trưởng gửi;**
  - **Phiếu có lỗi của tôi gần đây.**
- **Cách soạn giải trình:**
  1. Mở phiếu.
  2. Với lỗi của bạn, chọn *Chấp nhận* hoặc *Không đồng ý*, ghi nội dung, nguyên nhân, biện pháp và ảnh nếu có.
  3. Bấm **Lưu giải trình**.

  Cửa hàng trưởng sẽ nhận thông báo để xem lại và gửi.
- Bạn **không gửi** được phiếu và **không sửa** được lỗi của người khác. Bạn xem được các phiếu của cửa hàng mình.

---

## 7. Hướng dẫn cho Admin

### 7.1. Xử lý khiếu nại
Trang **Quản trị** có mục **Khiếu nại chờ xử lý** (phiếu cũ nhất ở trên). Mở phiếu, đọc khiếu nại, giải trình và ảnh, rồi chọn 1 trong 2 cách:
- **Giữ nguyên kết quả:** ghi lý do → **Giữ nguyên**.
- **Giảm tiền:**
  1. Sửa số tiền ở các lỗi cần giảm. Chỉ được giảm, không được tăng.
  2. Ghi lý do.
  3. Bấm **Chấp nhận, giảm còn …** → **Chấp nhận**.

  Mức QA đã chốt vẫn được lưu và hiện trên phiếu để đối chiếu.

Cửa hàng và QA đều nhận thông báo kết quả. Mỗi khiếu nại chỉ xử lý 1 lần.

### 7.2. Mở lại phiếu đã khóa
Dùng khi cần QA chốt lại, ví dụ chốt nhầm.
1. Mở phiếu, bấm **Mở lại phiếu**, ghi lý do.
2. Phiếu về **Chờ chốt** và QA lập phiếu được thông báo.

Lưu ý:
- Không mở lại được phiếu đang có khiếu nại chờ xử lý; hãy xử lý khiếu nại trước.
- Nếu phiếu đã được giảm tiền khi xử lý khiếu nại, QA chốt lại **không được cao hơn** mức Admin đã giảm.

### 7.3. Quản lý dữ liệu
Trang **Quản trị** có 4 tab. Bấm **Thêm** để tạo mới, bấm vào một dòng để sửa.

| Tab | Ghi chú |
|---|---|
| **Tài khoản** | Tên đăng nhập: chữ không dấu, số, dấu `. _ -`. Mật khẩu ≥ 6 ký tự. **CHT** phải chọn cửa hàng; **Nhân viên** phải gắn với một hồ sơ nhân viên. Đổi mật khẩu: nhập mật khẩu mới khi sửa (để trống = giữ nguyên). Người nghỉ việc: tắt **Đang hoạt động** để khóa tài khoản (không xóa, để giữ lịch sử). |
| **Cửa hàng** | Mã, tên, địa chỉ. Tắt *Đang hoạt động* với cửa hàng đã đóng. |
| **Nhân viên** | Mã, họ tên, cửa hàng, chức vụ. Nhân viên chuyển cửa hàng: sửa cửa hàng của hồ sơ đó. Nghỉ việc: tắt *Đang làm việc*. |
| **Danh mục lỗi** | Mã, tên, nhóm, mức độ, **số tiền phạt**. Đổi số tiền chỉ áp dụng cho phiếu phát hành **sau** khi đổi; phiếu cũ giữ mức tại thời điểm phát hành. Lỗi không dùng nữa: tắt *Đang áp dụng* (QA không chọn được và không phát hành được phiếu có lỗi này). |

**Bảo mật:**
- Bắt buộc đổi mật khẩu mặc định.
- Không chia sẻ một tài khoản cho nhiều người.
- Khóa tài khoản ngay khi có người nghỉ việc.

---

## 8. Danh sách phiếu, lọc và xuất Excel (mọi vai trò)
- Tab **Phiếu** hiện danh sách phiếu bạn được xem, tổng số phiếu và tổng tiền đã chốt.
- **Lọc nhanh** theo trạng thái bằng các nút ở đầu danh sách.
- **Tìm theo mã phiếu** ở ô tìm kiếm.
- Bấm **Lọc** để chọn cửa hàng và khoảng ngày kiểm tra. Bộ lọc đang bật hiện thành nhãn, bấm ✕ trên nhãn để bỏ.
- **Xuất Excel** tải file theo đúng bộ lọc đang chọn. Mỗi dòng là một lỗi, gồm đầy đủ: cửa hàng, nhân viên, mức đề xuất, giải trình, kết quả, tiền chốt.
- Mỗi phiếu có mục **Lịch sử** ghi lại ai làm gì, lúc nào.

---

## 9. Thông báo: ai nhận khi nào

| Sự kiện | Người nhận |
|---|---|
| Phát hành phiếu | CHT + nhân viên có lỗi trong phiếu |
| Còn 24h / 4h đến hạn giải trình | CHT + nhân viên có lỗi |
| QA sửa / xóa lỗi | CHT + nhân viên liên quan |
| NV soạn giải trình | CHT |
| CHT gửi giải trình | QA lập phiếu |
| QA trả lại cửa hàng | CHT + nhân viên có lỗi |
| QA chốt / hệ thống tự khóa | CHT + nhân viên có lỗi (tự khóa: báo cả QA) |
| QA hủy phiếu | CHT + nhân viên có lỗi |
| CHT khiếu nại | Admin + QA lập phiếu |
| Admin xử lý khiếu nại | CHT + nhân viên có lỗi + QA lập phiếu |
| Admin mở lại phiếu | QA lập phiếu |

- Bấm vào một thông báo để mở phiếu, thông báo đó được tính là đã đọc.
- **Đánh dấu đã đọc** đánh dấu tất cả cùng lúc.
- Khi đang mở app, thông báo mới hiện ngay ở góc màn hình.

---

## 10. Câu hỏi thường gặp

**Không thấy nút Gửi / Chốt / Khiếu nại?**
Nút chỉ hiện khi đúng vai trò và đúng trạng thái phiếu:
- CHT chỉ gửi khi phiếu *Chờ giải trình* và còn hạn.
- Chỉ QA lập phiếu mới chốt được.
- Khiếu nại chỉ trong 24h sau khi khóa và chưa khiếu nại lần nào.

**Nút bị mờ, không bấm được?**
Đọc dòng chữ đỏ ngay phía trên nút. Thường là còn thiếu thông tin, lý do chưa đủ 15 ký tự, hoặc số tiền vượt mức cho phép.

**Chụp ảnh không được?**
Cấp quyền Camera / Ảnh cho trình duyệt trong Cài đặt điện thoại, rồi thử lại. Có thể chọn ảnh có sẵn trong thư viện.

**Gửi nhầm giải trình?**
Không sửa được sau khi gửi. Liên hệ QA lập phiếu: QA có thể **Trả lại cửa hàng** để bạn giải trình lại.

**Phiếu bị tự khóa vì quá hạn?**
Vẫn khiếu nại được trong 24 giờ kể từ lúc khóa.

**Thấy phiếu không phải của cửa hàng mình, hoặc thấy sai quyền?**
Báo ngay cho Admin.

**Màn hình báo lỗi hoặc trắng trang?**
Bấm **Thử lại**, hoặc kéo xuống để tải lại. Nếu vẫn lỗi, chụp màn hình gửi Admin, kèm mã phiếu và thời điểm.
