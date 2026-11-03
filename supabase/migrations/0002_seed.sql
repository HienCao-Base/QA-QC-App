-- Dữ liệu mẫu để chạy thử. Có thể xóa/sửa trong màn Admin sau.

insert into public.stores (code, name, address) values
  ('CH01', 'Cửa hàng Nguyễn Trãi', '215 Nguyễn Trãi, Q.1, TP.HCM'),
  ('CH02', 'Cửa hàng Lê Văn Sỹ', '88 Lê Văn Sỹ, Q.3, TP.HCM'),
  ('CH03', 'Cửa hàng Phan Xích Long', '12 Phan Xích Long, Phú Nhuận, TP.HCM');

insert into public.employees (code, full_name, store_id, position)
select v.code, v.full_name, s.id, v.position
from (values
  ('NV001', 'Trần Thị Mai', 'CH01', 'Thu ngân'),
  ('NV002', 'Lê Văn Hùng', 'CH01', 'Pha chế'),
  ('NV003', 'Phạm Ngọc Anh', 'CH01', 'Phục vụ'),
  ('NV004', 'Võ Minh Tuấn', 'CH02', 'Pha chế'),
  ('NV005', 'Đặng Thu Hà', 'CH02', 'Thu ngân'),
  ('NV006', 'Bùi Quốc Khánh', 'CH03', 'Phục vụ'),
  ('NV007', 'Hoàng Gia Linh', 'CH03', 'Pha chế')
) as v(code, full_name, store_code, position)
join public.stores s on s.code = v.store_code;

insert into public.violation_types (code, name, group_name, severity, amount, description) values
  ('VS01', 'Khu vực quầy bẩn, có rác', 'Vệ sinh', 'nhe', 50000, 'Quầy, bàn pha chế không lau dọn theo checklist'),
  ('VS02', 'Không đội nón / không đeo khẩu trang khi pha chế', 'Vệ sinh', 'trung_binh', 100000, null),
  ('VS03', 'Tủ lạnh lẫn đồ sống và chín', 'Vệ sinh', 'nang', 300000, null),
  ('NL01', 'Nguyên liệu quá hạn sử dụng', 'Nguyên liệu', 'nang', 500000, 'Còn nguyên liệu quá hạn trong kho hoặc quầy'),
  ('NL02', 'Nguyên liệu không dán nhãn ngày mở', 'Nguyên liệu', 'trung_binh', 100000, null),
  ('DP01', 'Không mặc đồng phục đúng quy định', 'Tác phong', 'nhe', 50000, null),
  ('TP01', 'Sử dụng điện thoại trong giờ làm', 'Tác phong', 'nhe', 50000, null),
  ('QT01', 'Không thực hiện checklist mở ca', 'Quy trình', 'trung_binh', 150000, null),
  ('QT02', 'Pha chế sai công thức chuẩn', 'Quy trình', 'trung_binh', 200000, null);
