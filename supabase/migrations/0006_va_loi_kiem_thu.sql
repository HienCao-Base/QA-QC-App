-- =====================================================================
-- Vá các lỗi tìm thấy khi chạy bộ kiểm thử tự động (tests/api.test.mjs)
--  PQ-12  Tài khoản đã khóa vẫn thao tác được (my_role() trả null -> các phép so sánh "<>" bị bỏ qua)
--  PQ-17  QA cài sẵn trạng thái khiếu nại / kết quả chốt vào phiếu nháp -> cửa hàng không khiếu nại được
--  TB-03  Người dùng sửa được nội dung thông báo của mình
--  PQ-18  Ai đăng nhập cũng xem được ảnh minh chứng của mọi cửa hàng
--  VD-03  Phát hành được phiếu có lỗi đã ngưng áp dụng
--  NV-04  Chốt phiếu với 1 lỗi lặp 2 lần -> lỗi còn lại không có kết quả mà phiếu vẫn khóa
--  NV-11  Admin mở lại phiếu đã giảm tiền khi khiếu nại -> QA chốt lại cao hơn mức Admin đã giảm
-- Chạy file này trong Supabase > SQL Editor (sau 0001 -> 0005).
-- =====================================================================

-- ---------- PQ-12: vai trò rỗng thay vì null ----------
-- Tài khoản không có hồ sơ / đã khóa có vai trò '' -> mọi kiểm tra "my_role() <> 'x'" đều chặn.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid() and active), '')
$$;

-- ---------- PQ-17 + TB-03: chỉ cho ghi đúng các cột cần thiết ----------
revoke insert, update on public.tickets from anon, authenticated;
grant insert (store_id, created_by, note, inspected_at) on public.tickets to authenticated;
grant update (store_id, note, inspected_at) on public.tickets to authenticated;

revoke insert, update on public.ticket_items from anon, authenticated;
grant insert (ticket_id, violation_type_id, employee_id, description, evidence_paths, sort) on public.ticket_items to authenticated;
grant update (violation_type_id, employee_id, description, evidence_paths, sort) on public.ticket_items to authenticated;

revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------- PQ-18: chỉ xem ảnh của phiếu mình được xem ----------
create index if not exists ticket_items_evidence_paths on public.ticket_items using gin (evidence_paths);
create index if not exists ticket_items_explanation_paths on public.ticket_items using gin (explanation_paths);

drop policy if exists "read evidence" on storage.objects;
create policy "read evidence" on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence' and (
      owner_id = (select auth.uid())::text            -- ảnh mình vừa tải lên (chưa gắn vào phiếu)
      or exists (                                       -- RLS của ticket_items lọc theo quyền xem phiếu
        select 1 from public.ticket_items i
        where i.evidence_paths @> array[name] or i.explanation_paths @> array[name]
      )
    )
  );

-- ---------- VD-03: không phát hành lỗi đã ngưng áp dụng ----------
create or replace function public.issue_ticket(p_ticket uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t tickets; v_code text; v_missing int; v_off text;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then raise exception 'Bạn không có quyền phát hành phiếu này'; end if;
  if t.status <> 'draft' then raise exception 'Phiếu đã được phát hành trước đó'; end if;
  if not exists (select 1 from ticket_items where ticket_id = p_ticket) then
    raise exception 'Phiếu cần ít nhất 1 lỗi'; end if;
  select count(*) into v_missing from ticket_items where ticket_id = p_ticket and cardinality(evidence_paths) = 0;
  if v_missing > 0 then raise exception 'Còn % lỗi chưa có ảnh minh chứng', v_missing; end if;
  select string_agg(v.name, ', ') into v_off
  from ticket_items i join violation_types v on v.id = i.violation_type_id
  where i.ticket_id = p_ticket and not v.active;
  if v_off is not null then raise exception 'Lỗi đã ngưng áp dụng, hãy chọn lỗi khác: %', v_off; end if;

  -- snapshot danh mục lỗi; xóa mọi dữ liệu giải trình / chốt có sẵn (phòng dữ liệu cũ)
  update ticket_items i set violation_name = v.name, severity = v.severity, suggested_amount = v.amount,
    cht_response = null, explanation = null, cause = null, corrective_action = null, explanation_paths = '{}',
    explained_by = null, explained_at = null, decision = null, final_amount = null, decision_reason = null,
    qa_final_amount = null, edited_at = null
  from violation_types v where v.id = i.violation_type_id and i.ticket_id = p_ticket;

  v_code := 'QC-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-' || lpad(nextval('ticket_seq')::text, 4, '0');
  update tickets set status = 'pending_explanation', code = v_code, issued_at = now(), due_at = now() + interval '48 hours',
    submitted_at = null, locked_at = null, locked_by = null, auto_locked = false, cancel_reason = null,
    reminded_24h = false, reminded_4h = false,
    appeal_status = null, appeal_reason = null, appealed_at = null, appealed_by = null,
    appeal_resolution = null, appeal_resolved_at = null, appeal_resolved_by = null
  where id = p_ticket;

  perform log_event(p_ticket, auth.uid(), 'issued');
  perform notify_store(p_ticket, 'Có phiếu lỗi mới ' || v_code || ', hạn giải trình 48h');
  return v_code;
end $$;

-- ---------- NV-04 + NV-11: chốt đủ từng lỗi; không vượt mức Admin đã giảm ----------
-- Mức trần của một lỗi: mức đề xuất, hoặc mức Admin đã giảm khi xử lý khiếu nại (nếu thấp hơn).
create or replace function public.item_cap(i ticket_items) returns integer
language sql immutable as $$
  select case when i.qa_final_amount is not null and i.final_amount is not null
              then least(i.suggested_amount, i.final_amount) else i.suggested_amount end
$$;

create or replace function public.lock_ticket(p_ticket uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; it jsonb; i ticket_items; v_dec text; v_amt int; v_cap int; v_reason text; v_total int;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then
    raise exception 'Chỉ QA tạo phiếu mới được chốt phiếu này'; end if;
  if t.status <> 'pending_decision' then raise exception 'Phiếu không ở trạng thái chờ chốt'; end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_items))
     <> (select count(*) from ticket_items where ticket_id = p_ticket)
     or jsonb_array_length(p_items) <> (select count(*) from ticket_items where ticket_id = p_ticket) then
    raise exception 'Cần chốt đủ tất cả lỗi trong phiếu (mỗi lỗi 1 lần)'; end if;

  for it in select value from jsonb_array_elements(p_items) loop
    select * into i from ticket_items where id = (it->>'id')::uuid and ticket_id = p_ticket;
    if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
    v_dec := it->>'decision';
    v_reason := nullif(trim(it->>'decision_reason'), '');
    v_cap := item_cap(i);
    if v_dec not in ('keep','reduce','waive') then
      raise exception 'Kết quả chốt không hợp lệ (chỉ Giữ, Giảm hoặc Miễn)'; end if;
    v_amt := case v_dec
      when 'keep' then v_cap
      when 'waive' then 0
      when 'reduce' then (it->>'final_amount')::int end;

    if v_amt is null or v_amt < 0 then raise exception 'Số tiền không hợp lệ ở lỗi "%"', i.violation_name; end if;
    if v_amt > v_cap then
      raise exception 'Không được chốt cao hơn % ở lỗi "%". Muốn tăng, hãy trả lại cửa hàng và sửa phiếu',
        fmt_money(v_cap), i.violation_name; end if;
    if v_dec = 'reduce' and v_amt >= v_cap then
      raise exception 'Số tiền giảm phải nhỏ hơn % ở lỗi "%"', fmt_money(v_cap), i.violation_name; end if;
    if v_dec <> 'keep' and not valid_reason(v_reason) then
      raise exception 'Lý do ở lỗi "%" cần ít nhất 15 ký tự', i.violation_name; end if;

    update ticket_items set decision = v_dec, final_amount = v_amt, decision_reason = v_reason where id = i.id;
  end loop;

  select coalesce(sum(final_amount), 0) into v_total from ticket_items where ticket_id = p_ticket;
  update tickets set status = 'locked', locked_at = now(), locked_by = auth.uid(), auto_locked = false where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'locked', 'Tổng tiền: ' || fmt_money(v_total));
  perform notify_store(p_ticket, 'Phiếu ' || t.code || ' đã chốt, tổng tiền ' || fmt_money(v_total)
    || case when t.appeal_status is null
            then '. Nếu không đồng ý, cửa hàng trưởng có thể khiếu nại lên Admin trong 24 giờ' else '' end);
end $$;

revoke execute on function public.item_cap(ticket_items) from public, anon;
