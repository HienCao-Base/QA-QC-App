-- =====================================================================
-- Sửa phiếu khi đang chờ giải trình (phương án B)
--  - Chỉ QA lập phiếu, chỉ khi phiếu "Chờ giải trình", chưa quá hạn (CHT gửi rồi thì khóa).
--  - Thay đổi NHỎ (mô tả, thêm ảnh): sửa tự do, ghi lịch sử, báo cửa hàng.
--  - Thay đổi LỚN (đổi lỗi / nhân viên, thêm lỗi, xóa lỗi):
--      bắt buộc lý do; xóa phần giải trình của lỗi đó; hạn giải trình còn ít nhất 24h;
--      chụp lại tên lỗi / mức tiền theo danh mục hiện tại.
--  - Không được xóa ảnh minh chứng đã phát hành (chỉ thêm).
--  - Mọi thay đổi ghi vào ticket_events (action = 'edited') kèm nội dung trước/sau.
-- Chạy file này trong Supabase > SQL Editor (sau 0001, 0002, 0003).
-- =====================================================================

alter table public.ticket_items add column if not exists edited_at timestamptz;

-- Tiện ích: "150000" -> "150.000đ"
create or replace function public.fmt_money(p integer) returns text
language sql immutable as $$
  select replace(to_char(coalesce(p, 0), 'FM999,999,999,999'), ',', '.') || 'đ'
$$;

-- Tiện ích: tên nhân viên hoặc "Lỗi chung"
create or replace function public.employee_label(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select full_name || ' (' || code || ')' from employees where id = p), 'Lỗi chung cửa hàng')
$$;

-- Tiện ích: báo cho tài khoản nhân viên gắn với một hồ sơ nhân viên
create or replace function public.notify_employee(p_employee uuid, p_ticket uuid, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, ticket_id, message)
  select p.id, p_ticket, p_message from profiles p
  where p_employee is not null and p.role = 'nv' and p.employee_id = p_employee and p.active
$$;

-- Kiểm tra quyền + khóa dòng phiếu. Dùng chung cho sửa / xóa lỗi.
create or replace function public.lock_ticket_for_edit(p_ticket uuid)
returns tickets language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then
    raise exception 'Chỉ QA lập phiếu mới sửa được phiếu này'; end if;
  if t.status <> 'pending_explanation' then
    raise exception 'Chỉ sửa được phiếu đang chờ giải trình (cửa hàng chưa gửi)'; end if;
  if now() >= t.due_at then raise exception 'Phiếu đã quá hạn giải trình, không sửa được nữa'; end if;
  return t;
end $$;

-- Sau thay đổi lớn: hạn giải trình còn ít nhất 24h. Trả về hạn mới nếu có gia hạn.
create or replace function public.extend_due_after_edit(t tickets)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_due timestamptz := greatest(t.due_at, now() + interval '24 hours');
begin
  if v_due > t.due_at then
    -- đã báo "còn dưới 24h" coi như xong; nhắc 4h sẽ chạy lại theo hạn mới
    update tickets set due_at = v_due, reminded_24h = true, reminded_4h = false where id = t.id;
    return v_due;
  end if;
  return null;
end $$;

-- Thêm (p_item = null) hoặc sửa một lỗi của phiếu đã phát hành
create or replace function public.edit_issued_item(p_ticket uuid, p_item uuid, p_data jsonb, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  t tickets; i ticket_items; vt violation_types;
  v_vt uuid := nullif(p_data->>'violation_type_id', '')::uuid;
  v_emp uuid := nullif(p_data->>'employee_id', '')::uuid;
  v_desc text := nullif(trim(p_data->>'description'), '');
  v_paths text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(p_data->'evidence_paths') x), '{}');
  v_reason text := nullif(trim(p_reason), '');
  v_major boolean := false;
  v_changes text[] := '{}';
  v_note text; v_due timestamptz; v_msg text;
begin
  t := lock_ticket_for_edit(p_ticket);

  select * into vt from violation_types where id = v_vt;
  if vt.id is null then raise exception 'Vui lòng chọn lỗi vi phạm'; end if;
  if cardinality(v_paths) = 0 then raise exception 'Cần ít nhất 1 ảnh minh chứng'; end if;
  if v_emp is not null and not exists (select 1 from employees where id = v_emp and store_id = t.store_id) then
    raise exception 'Nhân viên không thuộc cửa hàng của phiếu'; end if;

  if p_item is null then
    -- Thêm lỗi mới
    if not vt.active then raise exception 'Lỗi "%" đã ngưng áp dụng', vt.name; end if;
    v_major := true;
    insert into ticket_items (ticket_id, violation_type_id, employee_id, description, evidence_paths,
                              violation_name, severity, suggested_amount, sort, edited_at)
    values (p_ticket, vt.id, v_emp, v_desc, v_paths, vt.name, vt.severity, vt.amount,
            (extract(epoch from now()) * 1000)::bigint % 2147483647, now());
    v_note := 'Thêm lỗi "' || vt.name || '" (' || fmt_money(vt.amount) || ', ' || employee_label(v_emp) || ')';
  else
    select * into i from ticket_items where id = p_item and ticket_id = p_ticket for update;
    if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
    if not (i.evidence_paths <@ v_paths) then
      raise exception 'Không được xóa ảnh minh chứng đã phát hành, chỉ được thêm ảnh'; end if;

    if v_vt <> i.violation_type_id then
      if not vt.active then raise exception 'Lỗi "%" đã ngưng áp dụng', vt.name; end if;
      v_major := true;
      v_changes := v_changes || ('lỗi: "' || i.violation_name || '" (' || fmt_money(i.suggested_amount) || ') → "'
                                 || vt.name || '" (' || fmt_money(vt.amount) || ')');
    end if;
    if v_emp is distinct from i.employee_id then
      v_major := true;
      v_changes := v_changes || ('nhân viên: ' || employee_label(i.employee_id) || ' → ' || employee_label(v_emp));
    end if;
    if v_desc is distinct from i.description then v_changes := v_changes || 'sửa mô tả'::text; end if;
    if cardinality(v_paths) > cardinality(i.evidence_paths) then
      v_changes := v_changes || ('thêm ' || (cardinality(v_paths) - cardinality(i.evidence_paths)) || ' ảnh');
    end if;
    if cardinality(v_changes) = 0 then return; end if; -- không có gì thay đổi

    update ticket_items set
      violation_type_id = vt.id, employee_id = v_emp, description = v_desc, evidence_paths = v_paths, edited_at = now(),
      -- đổi lỗi: chụp lại tên / mức tiền theo danh mục hiện tại (BR-02)
      violation_name   = case when vt.id <> i.violation_type_id then vt.name     else violation_name end,
      severity         = case when vt.id <> i.violation_type_id then vt.severity else severity end,
      suggested_amount = case when vt.id <> i.violation_type_id then vt.amount   else suggested_amount end,
      -- thay đổi lớn: phần giải trình cũ không còn đúng nữa
      cht_response      = case when v_major then null else cht_response end,
      explanation       = case when v_major then null else explanation end,
      cause             = case when v_major then null else cause end,
      corrective_action = case when v_major then null else corrective_action end,
      explanation_paths = case when v_major then '{}' else explanation_paths end,
      explained_by      = case when v_major then null else explained_by end,
      explained_at      = case when v_major then null else explained_at end
    where id = i.id;

    v_note := 'Lỗi "' || i.violation_name || '": ' || array_to_string(v_changes, '; ');
  end if;

  if v_major and v_reason is null then
    raise exception 'Đổi lỗi, đổi nhân viên hoặc thêm lỗi cần ghi lý do'; end if;

  if v_major then
    v_due := extend_due_after_edit(t);
    if p_item is not null and i.cht_response is not null then v_note := v_note || '; đặt lại phần giải trình'; end if;
  end if;
  if v_due is not null then
    v_note := v_note || '; gia hạn đến ' || to_char(v_due at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM');
  end if;
  if v_reason is not null then v_note := v_note || '. Lý do: ' || v_reason; end if;

  perform log_event(p_ticket, auth.uid(), 'edited', v_note);

  v_msg := 'QA đã sửa phiếu ' || t.code || ' — ' || v_note;
  perform notify_store(p_ticket, v_msg);
  -- nhân viên bị gỡ khỏi lỗi cũng cần biết
  if p_item is not null and i.employee_id is distinct from v_emp then
    perform notify_employee(i.employee_id, p_ticket, v_msg);
  end if;
end $$;

-- Xóa một lỗi khỏi phiếu đã phát hành (phải còn ít nhất 1 lỗi)
create or replace function public.delete_issued_item(p_ticket uuid, p_item uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; i ticket_items; v_due timestamptz; v_note text; v_reason text := nullif(trim(p_reason), '');
begin
  t := lock_ticket_for_edit(p_ticket);
  if v_reason is null then raise exception 'Cần ghi lý do xóa lỗi'; end if;
  select * into i from ticket_items where id = p_item and ticket_id = p_ticket for update;
  if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
  if (select count(*) from ticket_items where ticket_id = p_ticket) <= 1 then
    raise exception 'Phiếu phải còn ít nhất 1 lỗi. Nếu phát hành nhầm cả phiếu, hãy dùng "Hủy phiếu"'; end if;

  delete from ticket_items where id = i.id;
  v_due := extend_due_after_edit(t);

  v_note := 'Xóa lỗi "' || i.violation_name || '" (' || fmt_money(i.suggested_amount) || ', '
            || employee_label(i.employee_id) || ')';
  if v_due is not null then
    v_note := v_note || '; gia hạn đến ' || to_char(v_due at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM');
  end if;
  v_note := v_note || '. Lý do: ' || v_reason;

  perform log_event(p_ticket, auth.uid(), 'edited', v_note);
  perform notify_store(p_ticket, 'QA đã sửa phiếu ' || t.code || ' — ' || v_note);
  perform notify_employee(i.employee_id, p_ticket, 'QA đã sửa phiếu ' || t.code || ' — ' || v_note);
end $$;

-- Quyền gọi hàm
revoke execute on function public.lock_ticket_for_edit(uuid) from public, anon, authenticated;
revoke execute on function public.extend_due_after_edit(tickets) from public, anon, authenticated;
revoke execute on function public.notify_employee(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.employee_label(uuid) from public, anon;
revoke execute on function public.edit_issued_item(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.delete_issued_item(uuid, uuid, text) from public, anon;
grant execute on function public.edit_issued_item(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.delete_issued_item(uuid, uuid, text) to authenticated;
