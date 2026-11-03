-- =====================================================================
-- Kiểm soát việc chốt tiền phạt + khiếu nại lên Admin
--  1. Chốt: số tiền chỉ được ≤ mức đề xuất. Bỏ "Điều chỉnh" (chỉ còn Giữ / Giảm / Miễn).
--     Muốn tăng: QA "Trả lại cửa hàng" -> phiếu về Chờ giải trình (hạn 48h mới),
--     QA sửa phiếu (0004, mức tiền lấy theo danh mục), cửa hàng giải trình lại.
--  2. Lý do (giảm, miễn, trả lại, khiếu nại, xử lý khiếu nại, mở lại) tối thiểu 15 ký tự.
--  3. Phiếu đã khóa: CHT khiếu nại 1 lần trong 24h -> Admin xử lý (giữ nguyên / giảm tiền).
--     QA lập phiếu chỉ được thông báo, không xử lý khiếu nại của chính phiếu mình.
-- Chạy file này trong Supabase > SQL Editor (sau 0001 -> 0004).
-- =====================================================================

-- ---------- Cột mới ----------
alter table public.tickets
  add column if not exists appeal_status text check (appeal_status in ('pending','rejected','accepted')),
  add column if not exists appeal_reason text,
  add column if not exists appealed_at timestamptz,
  add column if not exists appealed_by uuid references public.profiles(id),
  add column if not exists appeal_resolution text,
  add column if not exists appeal_resolved_at timestamptz,
  add column if not exists appeal_resolved_by uuid references public.profiles(id);
create index if not exists tickets_appeal_pending on public.tickets (appeal_status) where appeal_status = 'pending';

-- Mức QA đã chốt, chỉ có giá trị khi Admin giảm tiền lúc xử lý khiếu nại (để đối chiếu).
alter table public.ticket_items add column if not exists qa_final_amount integer;

-- ---------- Tiện ích ----------
create or replace function public.valid_reason(p text, p_min int default 15) returns boolean
language sql immutable as $$
  select char_length(regexp_replace(coalesce(trim(p), ''), '\s+', ' ', 'g')) >= p_min
$$;

create or replace function public.notify_admins(p_ticket uuid, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, ticket_id, message)
  select id, p_ticket, p_message from profiles where role = 'admin' and active
$$;

-- ---------- 1 + 2. QA chốt: ≤ mức đề xuất, lý do ≥ 15 ký tự ----------
create or replace function public.lock_ticket(p_ticket uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; it jsonb; i ticket_items; v_dec text; v_amt int; v_reason text; v_total int;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then
    raise exception 'Chỉ QA tạo phiếu mới được chốt phiếu này'; end if;
  if t.status <> 'pending_decision' then raise exception 'Phiếu không ở trạng thái chờ chốt'; end if;
  if jsonb_array_length(p_items) <> (select count(*) from ticket_items where ticket_id = p_ticket) then
    raise exception 'Cần chốt đủ tất cả lỗi trong phiếu'; end if;

  for it in select value from jsonb_array_elements(p_items) loop
    select * into i from ticket_items where id = (it->>'id')::uuid and ticket_id = p_ticket;
    if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
    v_dec := it->>'decision';
    v_reason := nullif(trim(it->>'decision_reason'), '');
    if v_dec not in ('keep','reduce','waive') then
      raise exception 'Kết quả chốt không hợp lệ (chỉ Giữ, Giảm hoặc Miễn)'; end if;
    v_amt := case v_dec
      when 'keep' then i.suggested_amount
      when 'waive' then 0
      when 'reduce' then (it->>'final_amount')::int end;

    if v_amt is null or v_amt < 0 then raise exception 'Số tiền không hợp lệ ở lỗi "%"', i.violation_name; end if;
    if v_amt > i.suggested_amount then
      raise exception 'Không được chốt cao hơn mức đề xuất ở lỗi "%". Muốn tăng, hãy trả lại cửa hàng và sửa phiếu', i.violation_name; end if;
    if v_dec = 'reduce' and v_amt >= i.suggested_amount then
      raise exception 'Số tiền giảm phải nhỏ hơn mức đề xuất ở lỗi "%"', i.violation_name; end if;
    if v_dec <> 'keep' and not valid_reason(v_reason) then
      raise exception 'Lý do ở lỗi "%" cần ít nhất 15 ký tự', i.violation_name; end if;

    update ticket_items set decision = v_dec, final_amount = v_amt, decision_reason = v_reason where id = i.id;
  end loop;

  select coalesce(sum(final_amount), 0) into v_total from ticket_items where ticket_id = p_ticket;
  update tickets set status = 'locked', locked_at = now(), locked_by = auth.uid(), auto_locked = false where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'locked', 'Tổng tiền: ' || fmt_money(v_total));
  perform notify_store(p_ticket, 'Phiếu ' || t.code || ' đã chốt, tổng tiền ' || fmt_money(v_total)
    || '. Nếu không đồng ý, cửa hàng trưởng có thể khiếu nại lên Admin trong 24 giờ');
end $$;

-- ---------- QA trả lại cửa hàng (thay cho việc tự tăng tiền) ----------
create or replace function public.return_to_store(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; v_due timestamptz := now() + interval '48 hours';
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then
    raise exception 'Chỉ QA tạo phiếu mới trả lại được phiếu này'; end if;
  if t.status <> 'pending_decision' then raise exception 'Chỉ trả lại được phiếu đang chờ chốt'; end if;
  if not valid_reason(p_reason) then raise exception 'Lý do trả lại cần ít nhất 15 ký tự'; end if;

  -- giữ phần giải trình cũ để cửa hàng sửa tiếp; xóa kết quả chốt (nếu có từ lần Admin mở lại)
  update ticket_items set decision = null, final_amount = null, decision_reason = null where ticket_id = p_ticket;
  update tickets set status = 'pending_explanation', submitted_at = null, due_at = v_due,
    reminded_24h = false, reminded_4h = false
  where id = p_ticket;

  perform log_event(p_ticket, auth.uid(), 'returned', trim(p_reason));
  perform notify_store(p_ticket, 'QA trả lại phiếu ' || t.code || ' để cửa hàng giải trình lại, hạn đến '
    || to_char(v_due at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI DD/MM') || '. Lý do: ' || trim(p_reason));
end $$;

-- ---------- Admin mở lại: lý do ≥ 15 ký tự ----------
create or replace function public.reopen_ticket(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if my_role() <> 'admin' then raise exception 'Chỉ Admin mới được mở lại phiếu'; end if;
  if t.status <> 'locked' then raise exception 'Chỉ mở lại được phiếu đã khóa'; end if;
  if t.appeal_status = 'pending' then
    raise exception 'Phiếu đang có khiếu nại, hãy xử lý khiếu nại trước'; end if;
  if not valid_reason(p_reason) then raise exception 'Lý do mở lại cần ít nhất 15 ký tự'; end if;
  update tickets set status = 'pending_decision', locked_at = null, locked_by = null, auto_locked = false where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'reopened', trim(p_reason));
  perform notify_user(t.created_by, p_ticket, 'Admin đã mở lại phiếu ' || t.code || ' để chốt lại: ' || trim(p_reason));
end $$;

-- ---------- 3. CHT khiếu nại (1 lần, trong 24h sau khi khóa) ----------
create or replace function public.appeal_ticket(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'cht' or t.store_id is distinct from my_store() then
    raise exception 'Chỉ cửa hàng trưởng của cửa hàng mới khiếu nại được'; end if;
  if t.status <> 'locked' then raise exception 'Chỉ khiếu nại được phiếu đã khóa'; end if;
  if t.appeal_status is not null then raise exception 'Phiếu này đã khiếu nại rồi (mỗi phiếu chỉ 1 lần)'; end if;
  if now() > t.locked_at + interval '24 hours' then raise exception 'Đã quá 24 giờ kể từ khi khóa phiếu'; end if;
  if not valid_reason(p_reason) then raise exception 'Nội dung khiếu nại cần ít nhất 15 ký tự'; end if;

  update tickets set appeal_status = 'pending', appeal_reason = trim(p_reason), appealed_at = now(), appealed_by = auth.uid()
  where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'appealed', trim(p_reason));
  perform notify_admins(p_ticket, 'Cửa hàng khiếu nại phiếu ' || t.code || ': ' || trim(p_reason));
  perform notify_user(t.created_by, p_ticket, 'Cửa hàng đã khiếu nại phiếu ' || t.code || ' lên Admin');
end $$;

-- ---------- Admin xử lý khiếu nại ----------
-- p_accept = false: giữ nguyên. p_accept = true: p_items [{id, final_amount}], chỉ được GIẢM so với mức đang chốt.
create or replace function public.resolve_appeal(p_ticket uuid, p_accept boolean, p_items jsonb, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; it jsonb; i ticket_items; v_amt int; v_changed int := 0; v_total int; v_note text; v_msg text;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'admin' then raise exception 'Chỉ Admin mới xử lý được khiếu nại'; end if;
  if t.status <> 'locked' or t.appeal_status is distinct from 'pending' then
    raise exception 'Phiếu không có khiếu nại đang chờ xử lý'; end if;
  if not valid_reason(p_reason) then raise exception 'Lý do xử lý cần ít nhất 15 ký tự'; end if;

  if p_accept then
    for it in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
      select * into i from ticket_items where id = (it->>'id')::uuid and ticket_id = p_ticket for update;
      if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
      v_amt := (it->>'final_amount')::int;
      if v_amt is null or v_amt < 0 then raise exception 'Số tiền không hợp lệ ở lỗi "%"', i.violation_name; end if;
      if v_amt > i.final_amount then
        raise exception 'Xử lý khiếu nại chỉ được giảm tiền (lỗi "%")', i.violation_name; end if;
      if v_amt < i.final_amount then
        update ticket_items set qa_final_amount = coalesce(qa_final_amount, final_amount), final_amount = v_amt
        where id = i.id;
        v_changed := v_changed + 1;
      end if;
    end loop;
    if v_changed = 0 then raise exception 'Chấp nhận khiếu nại thì cần giảm tiền ít nhất 1 lỗi'; end if;
  end if;

  select coalesce(sum(final_amount), 0) into v_total from ticket_items where ticket_id = p_ticket;
  update tickets set appeal_status = case when p_accept then 'accepted' else 'rejected' end,
    appeal_resolution = trim(p_reason), appeal_resolved_at = now(), appeal_resolved_by = auth.uid()
  where id = p_ticket;

  v_note := case when p_accept then 'Chấp nhận, tổng tiền còn ' || fmt_money(v_total) else 'Giữ nguyên kết quả' end
            || '. Lý do: ' || trim(p_reason);
  perform log_event(p_ticket, auth.uid(), case when p_accept then 'appeal_accepted' else 'appeal_rejected' end, v_note);
  v_msg := 'Admin đã xử lý khiếu nại phiếu ' || t.code || ': ' || v_note;
  perform notify_store(p_ticket, v_msg);
  perform notify_user(t.created_by, p_ticket, v_msg);
end $$;

-- ---------- Quyền gọi hàm ----------
revoke execute on function public.notify_admins(uuid, text) from public, anon, authenticated;
revoke execute on function public.return_to_store(uuid, text) from public, anon;
revoke execute on function public.appeal_ticket(uuid, text) from public, anon;
revoke execute on function public.resolve_appeal(uuid, boolean, jsonb, text) from public, anon;
grant execute on function public.return_to_store(uuid, text) to authenticated;
grant execute on function public.appeal_ticket(uuid, text) to authenticated;
grant execute on function public.resolve_appeal(uuid, boolean, jsonb, text) to authenticated;
