-- =====================================================================
-- NV-17: lý do hủy phiếu, xóa lỗi, sửa lớn (đổi lỗi / nhân viên / thêm lỗi) cũng phải ≥ 15 ký tự,
-- thống nhất với lý do giảm / miễn / trả lại / khiếu nại / mở lại (0005).
-- Chạy file này trong Supabase > SQL Editor (sau 0001 -> 0006).
-- =====================================================================

create or replace function public.cancel_ticket(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then raise exception 'Chỉ QA tạo phiếu mới được hủy'; end if;
  if t.status <> 'pending_explanation' then raise exception 'Chỉ hủy được phiếu đang chờ giải trình'; end if;
  if not valid_reason(p_reason) then raise exception 'Lý do hủy cần ít nhất 15 ký tự'; end if;
  update tickets set status = 'cancelled', cancel_reason = trim(p_reason) where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'cancelled', trim(p_reason));
  perform notify_store(p_ticket, 'Phiếu ' || t.code || ' đã bị hủy: ' || trim(p_reason));
end $$;

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

  if v_major and not valid_reason(v_reason) then
    raise exception 'Đổi lỗi, đổi nhân viên hoặc thêm lỗi cần ghi lý do (ít nhất 15 ký tự)'; end if;

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

create or replace function public.delete_issued_item(p_ticket uuid, p_item uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; i ticket_items; v_due timestamptz; v_note text; v_reason text := nullif(trim(p_reason), '');
begin
  t := lock_ticket_for_edit(p_ticket);
  if not valid_reason(v_reason) then raise exception 'Lý do xóa lỗi cần ít nhất 15 ký tự'; end if;
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
