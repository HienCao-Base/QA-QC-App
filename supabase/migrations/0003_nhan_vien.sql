-- =====================================================================
-- Thêm vai trò Nhân viên (nv):
--  - Xem phiếu (đã phát hành) của cửa hàng mình
--  - Soạn giải trình cho lỗi gắn với chính mình; CHT xem lại và bấm Gửi
--  - Nhận thông báo khi phiếu có lỗi của mình
-- Chạy file này trong Supabase > SQL Editor (sau 0001 và 0002).
-- =====================================================================

-- 1. Tài khoản nhân viên gắn với 1 hồ sơ nhân viên
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','qa','cht','nv'));
alter table public.profiles add column if not exists employee_id uuid unique references public.employees(id);
alter table public.profiles add constraint nv_has_employee
  check (role <> 'nv' or (employee_id is not null and store_id is not null));

-- 2. Ghi nhận ai soạn giải trình cho từng lỗi
alter table public.ticket_items add column if not exists explained_by uuid references public.profiles(id);
alter table public.ticket_items add column if not exists explained_at timestamptz;

create or replace function public.my_employee() returns uuid
language sql stable security definer set search_path = public as $$
  select employee_id from profiles where id = auth.uid() and active
$$;

-- 3. Quyền xem phiếu: nhân viên giống cửa hàng trưởng
create or replace function public.can_see_ticket(p_status text, p_store uuid, p_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case my_role()
    when 'admin' then p_status <> 'draft'
    when 'qa'    then p_status <> 'draft' or p_created_by = auth.uid()
    when 'cht'   then p_status <> 'draft' and p_store = my_store()
    when 'nv'    then p_status <> 'draft' and p_store = my_store()
    else false end
$$;

-- 4. Thông báo của cửa hàng: gửi cho CHT + nhân viên có lỗi trong phiếu
create or replace function public.notify_store(p_ticket uuid, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, ticket_id, message)
  select p.id, t.id, p_message
  from tickets t
  join profiles p on p.active and (
    (p.role = 'cht' and p.store_id = t.store_id)
    or (p.role = 'nv' and p.employee_id in (select employee_id from ticket_items where ticket_id = t.id))
  )
  where t.id = p_ticket
$$;

-- 5. Lưu/gửi giải trình: CHT lưu + gửi mọi lỗi; NV chỉ lưu lỗi của mình, không được gửi
create or replace function public.save_explanation(p_ticket uuid, p_items jsonb, p_submit boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; it jsonb; i ticket_items; v_role text := my_role(); v_changed int := 0;
  v_resp text; v_exp text; v_cause text; v_fix text; v_paths text[];
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if v_role not in ('cht','nv') or t.store_id is distinct from my_store() then
    raise exception 'Bạn không có quyền giải trình phiếu này'; end if;
  if t.status <> 'pending_explanation' then raise exception 'Phiếu không còn ở trạng thái chờ giải trình'; end if;
  if now() > t.due_at then raise exception 'Đã quá hạn giải trình'; end if;
  if p_submit and v_role <> 'cht' then raise exception 'Chỉ cửa hàng trưởng mới được gửi giải trình'; end if;

  for it in select value from jsonb_array_elements(p_items) loop
    select * into i from ticket_items where id = (it->>'id')::uuid and ticket_id = p_ticket;
    if i.id is null then raise exception 'Lỗi không thuộc phiếu này'; end if;
    if v_role = 'nv' and i.employee_id is distinct from my_employee() then
      raise exception 'Bạn chỉ giải trình được lỗi của chính mình'; end if;

    v_resp := nullif(it->>'cht_response', '');
    v_exp := nullif(trim(it->>'explanation'), '');
    v_cause := nullif(trim(it->>'cause'), '');
    v_fix := nullif(trim(it->>'corrective_action'), '');
    v_paths := coalesce((select array_agg(x) from jsonb_array_elements_text(it->'explanation_paths') x), '{}');

    if p_submit and v_resp = 'dispute' and v_exp is null then
      raise exception 'Lỗi bạn không đồng ý cần có nội dung giải trình'; end if;

    -- chỉ cập nhật (và ghi người soạn) khi nội dung thực sự thay đổi
    if (i.cht_response, i.explanation, i.cause, i.corrective_action, i.explanation_paths)
       is distinct from (v_resp, v_exp, v_cause, v_fix, v_paths) then
      update ticket_items set cht_response = v_resp, explanation = v_exp, cause = v_cause,
        corrective_action = v_fix, explanation_paths = v_paths,
        explained_by = auth.uid(), explained_at = now()
      where id = i.id;
      v_changed := v_changed + 1;
    end if;
  end loop;

  if v_role = 'nv' and v_changed > 0 then
    insert into notifications (user_id, ticket_id, message)
    select p.id, p_ticket, (select full_name from profiles where id = auth.uid())
      || ' đã soạn giải trình cho phiếu ' || t.code || ', vui lòng xem lại và gửi'
    from profiles p where p.role = 'cht' and p.store_id = t.store_id and p.active;
  end if;

  if p_submit then
    update ticket_items set cht_response = 'accept' where ticket_id = p_ticket and cht_response is null;
    update tickets set status = 'pending_decision', submitted_at = now() where id = p_ticket;
    perform log_event(p_ticket, auth.uid(), 'submitted');
    perform notify_user(t.created_by, p_ticket, 'Cửa hàng đã gửi giải trình phiếu ' || t.code);
  end if;
end $$;

-- 6. Nhân viên được tải ảnh minh chứng
drop policy if exists "upload evidence" on storage.objects;
create policy "upload evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.my_role() in ('qa','cht','nv'));
