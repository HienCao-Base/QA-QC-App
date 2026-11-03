-- =====================================================================
-- App QA/QC: ghi nhận – giải trình – chốt phiếu lỗi
-- Chạy toàn bộ file này trong Supabase > SQL Editor (1 lần).
-- =====================================================================

-- ---------- 1. BẢNG DỮ LIỆU NỀN ----------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  full_name text not null,
  store_id uuid not null references public.stores(id),
  position text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.violation_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  group_name text,
  severity text not null check (severity in ('nhe','trung_binh','nang')),
  amount integer not null check (amount >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Hồ sơ người dùng, gắn 1-1 với auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  role text not null check (role in ('admin','qa','cht')),
  store_id uuid references public.stores(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cht_has_store check (role <> 'cht' or store_id is not null)
);

-- ---------- 2. PHIẾU LỖI ----------

create sequence public.ticket_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text unique,                         -- sinh khi phát hành
  store_id uuid not null references public.stores(id),
  created_by uuid not null references public.profiles(id),
  status text not null default 'draft'
    check (status in ('draft','pending_explanation','pending_decision','locked','cancelled')),
  note text,
  inspected_at timestamptz not null default now(),
  issued_at timestamptz,
  due_at timestamptz,                       -- issued_at + 48h
  submitted_at timestamptz,                 -- CHT gửi giải trình
  locked_at timestamptz,
  locked_by uuid references public.profiles(id),   -- null + auto_locked = hệ thống
  auto_locked boolean not null default false,
  cancel_reason text,
  reminded_24h boolean not null default false,
  reminded_4h boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.tickets (status, due_at);
create index on public.tickets (store_id);

create table public.ticket_items (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  violation_type_id uuid not null references public.violation_types(id),
  employee_id uuid references public.employees(id),
  description text,
  evidence_paths text[] not null default '{}',
  -- snapshot lúc phát hành (BR-02)
  violation_name text,
  severity text,
  suggested_amount integer,
  -- giải trình của CHT
  cht_response text check (cht_response in ('accept','dispute')),
  explanation text,
  cause text,
  corrective_action text,
  explanation_paths text[] not null default '{}',
  -- quyết định của QA
  decision text check (decision in ('keep','reduce','waive','adjust','auto')),
  final_amount integer check (final_amount >= 0),
  decision_reason text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.ticket_items (ticket_id);

create table public.ticket_events (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id),   -- null = hệ thống
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.ticket_events (ticket_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, read_at);

-- ---------- 3. HÀM TIỆN ÍCH ----------

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function public.my_store() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from profiles where id = auth.uid() and active
$$;

create or replace function public.can_see_ticket(p_status text, p_store uuid, p_created_by uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case my_role()
    when 'admin' then p_status <> 'draft'
    when 'qa'    then p_status <> 'draft' or p_created_by = auth.uid()
    when 'cht'   then p_status <> 'draft' and p_store = my_store()
    else false end
$$;

create or replace function public.log_event(p_ticket uuid, p_actor uuid, p_action text, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into ticket_events (ticket_id, actor_id, action, note) values (p_ticket, p_actor, p_action, p_note)
$$;

-- Gửi thông báo cho tất cả CHT của cửa hàng
create or replace function public.notify_store(p_ticket uuid, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, ticket_id, message)
  select p.id, t.id, p_message
  from tickets t join profiles p on p.store_id = t.store_id and p.role = 'cht' and p.active
  where t.id = p_ticket
$$;

create or replace function public.notify_user(p_user uuid, p_ticket uuid, p_message text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, ticket_id, message) values (p_user, p_ticket, p_message)
$$;

-- ---------- 4. CHUYỂN TRẠNG THÁI (chỉ thực hiện qua các hàm này) ----------

-- QA phát hành phiếu nháp
create or replace function public.issue_ticket(p_ticket uuid)
returns text language plpgsql security definer set search_path = public as $$
declare t tickets; v_code text; v_missing int;
begin
  select * into t from tickets where id = p_ticket for update;
  if t.id is null then raise exception 'Không tìm thấy phiếu'; end if;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then raise exception 'Bạn không có quyền phát hành phiếu này'; end if;
  if t.status <> 'draft' then raise exception 'Phiếu đã được phát hành trước đó'; end if;
  if not exists (select 1 from ticket_items where ticket_id = p_ticket) then
    raise exception 'Phiếu cần ít nhất 1 lỗi'; end if;
  select count(*) into v_missing from ticket_items where ticket_id = p_ticket and cardinality(evidence_paths) = 0;
  if v_missing > 0 then raise exception 'Còn % lỗi chưa có ảnh minh chứng', v_missing; end if;

  -- snapshot danh mục lỗi
  update ticket_items i set violation_name = v.name, severity = v.severity, suggested_amount = v.amount
  from violation_types v where v.id = i.violation_type_id and i.ticket_id = p_ticket;

  v_code := 'QC-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD') || '-' || lpad(nextval('ticket_seq')::text, 4, '0');
  update tickets set status = 'pending_explanation', code = v_code, issued_at = now(), due_at = now() + interval '48 hours'
  where id = p_ticket;

  perform log_event(p_ticket, auth.uid(), 'issued');
  perform notify_store(p_ticket, 'Có phiếu lỗi mới ' || v_code || ', hạn giải trình 48h');
  return v_code;
end $$;

-- QA hủy phiếu (khi CHT chưa gửi giải trình)
create or replace function public.cancel_ticket(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if my_role() <> 'qa' or t.created_by <> auth.uid() then raise exception 'Chỉ QA tạo phiếu mới được hủy'; end if;
  if t.status <> 'pending_explanation' then raise exception 'Chỉ hủy được phiếu đang chờ giải trình'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Vui lòng nhập lý do hủy'; end if;
  update tickets set status = 'cancelled', cancel_reason = p_reason where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'cancelled', p_reason);
  perform notify_store(p_ticket, 'Phiếu ' || t.code || ' đã bị hủy: ' || p_reason);
end $$;

-- CHT lưu nháp / gửi giải trình.
-- p_items: [{id, cht_response, explanation, cause, corrective_action, explanation_paths[]}]
create or replace function public.save_explanation(p_ticket uuid, p_items jsonb, p_submit boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets; it jsonb;
begin
  select * into t from tickets where id = p_ticket for update;
  if my_role() <> 'cht' or t.store_id is distinct from my_store() then raise exception 'Bạn không có quyền giải trình phiếu này'; end if;
  if t.status <> 'pending_explanation' then raise exception 'Phiếu không còn ở trạng thái chờ giải trình'; end if;
  if now() > t.due_at then raise exception 'Đã quá hạn giải trình'; end if;

  for it in select value from jsonb_array_elements(p_items) loop
    if p_submit and it->>'cht_response' = 'dispute' and coalesce(trim(it->>'explanation'), '') = '' then
      raise exception 'Lỗi bạn không đồng ý cần có nội dung giải trình';
    end if;
    update ticket_items set
      cht_response = nullif(it->>'cht_response', ''),
      explanation = nullif(trim(it->>'explanation'), ''),
      cause = nullif(trim(it->>'cause'), ''),
      corrective_action = nullif(trim(it->>'corrective_action'), ''),
      explanation_paths = coalesce((select array_agg(x) from jsonb_array_elements_text(it->'explanation_paths') x), '{}')
    where id = (it->>'id')::uuid and ticket_id = p_ticket;
  end loop;

  if p_submit then
    -- lỗi để trống coi như chấp nhận
    update ticket_items set cht_response = 'accept' where ticket_id = p_ticket and cht_response is null;
    update tickets set status = 'pending_decision', submitted_at = now() where id = p_ticket;
    perform log_event(p_ticket, auth.uid(), 'submitted');
    perform notify_user(t.created_by, p_ticket, 'Cửa hàng đã gửi giải trình phiếu ' || t.code);
  end if;
end $$;

-- QA chốt và khóa phiếu.
-- p_items: [{id, decision, final_amount, decision_reason}]
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
    v_amt := case v_dec
      when 'keep' then i.suggested_amount
      when 'waive' then 0
      when 'reduce' then (it->>'final_amount')::int
      when 'adjust' then (it->>'final_amount')::int
      else null end;
    if v_dec not in ('keep','reduce','waive','adjust') then raise exception 'Kết quả chốt không hợp lệ'; end if;
    if v_amt is null or v_amt < 0 then raise exception 'Số tiền không hợp lệ ở lỗi "%"', i.violation_name; end if;
    if v_dec = 'reduce' and v_amt >= i.suggested_amount then
      raise exception 'Số tiền giảm phải nhỏ hơn mức đề xuất ở lỗi "%"', i.violation_name; end if;
    if v_dec <> 'keep' and v_reason is null then
      raise exception 'Cần ghi lý do cho lỗi "%"', i.violation_name; end if;
    update ticket_items set decision = v_dec, final_amount = v_amt, decision_reason = v_reason where id = i.id;
  end loop;

  select coalesce(sum(final_amount), 0) into v_total from ticket_items where ticket_id = p_ticket;
  update tickets set status = 'locked', locked_at = now(), locked_by = auth.uid(), auto_locked = false where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'locked', 'Tổng tiền: ' || to_char(v_total, 'FM999G999G999') || 'đ');
  perform notify_store(p_ticket, 'Phiếu ' || t.code || ' đã chốt, tổng tiền ' || to_char(v_total, 'FM999G999G999') || 'đ');
end $$;

-- Admin mở lại phiếu đã khóa -> về chờ chốt
create or replace function public.reopen_ticket(p_ticket uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare t tickets;
begin
  select * into t from tickets where id = p_ticket for update;
  if my_role() <> 'admin' then raise exception 'Chỉ Admin mới được mở lại phiếu'; end if;
  if t.status <> 'locked' then raise exception 'Chỉ mở lại được phiếu đã khóa'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Vui lòng nhập lý do mở lại'; end if;
  update tickets set status = 'pending_decision', locked_at = null, locked_by = null, auto_locked = false where id = p_ticket;
  perform log_event(p_ticket, auth.uid(), 'reopened', p_reason);
  perform notify_user(t.created_by, p_ticket, 'Admin đã mở lại phiếu ' || t.code || ' để chốt lại: ' || p_reason);
end $$;

-- Job: tự khóa phiếu quá hạn + nhắc hạn. Chạy mỗi 5 phút bằng pg_cron.
create or replace function public.process_deadlines()
returns integer language plpgsql security definer set search_path = public as $$
declare t tickets; v_count int := 0;
begin
  for t in select * from tickets where status = 'pending_explanation' and due_at <= now() for update skip locked loop
    update ticket_items set decision = 'auto', final_amount = suggested_amount,
      decision_reason = 'Quá hạn 48h không giải trình' where ticket_id = t.id;
    update tickets set status = 'locked', locked_at = now(), locked_by = null, auto_locked = true where id = t.id;
    perform log_event(t.id, null, 'auto_locked', 'Quá hạn 48h, hệ thống tự áp mức đề xuất');
    perform notify_store(t.id, 'Phiếu ' || t.code || ' quá hạn giải trình, đã tự áp mức đề xuất và khóa');
    perform notify_user(t.created_by, t.id, 'Phiếu ' || t.code || ' quá hạn, hệ thống đã tự khóa');
    v_count := v_count + 1;
  end loop;

  for t in select * from tickets where status = 'pending_explanation' and not reminded_24h
           and due_at - now() <= interval '24 hours' and due_at > now() loop
    update tickets set reminded_24h = true where id = t.id;
    perform notify_store(t.id, 'Phiếu ' || t.code || ' còn dưới 24h để giải trình');
  end loop;

  for t in select * from tickets where status = 'pending_explanation' and not reminded_4h
           and due_at - now() <= interval '4 hours' and due_at > now() loop
    update tickets set reminded_4h = true, reminded_24h = true where id = t.id;
    perform notify_store(t.id, 'Phiếu ' || t.code || ' chỉ còn dưới 4h để giải trình!');
  end loop;

  return v_count;
end $$;

-- Chỉ người đăng nhập mới gọi được các hàm nghiệp vụ; process_deadlines chỉ hệ thống gọi
revoke execute on function public.process_deadlines() from public, anon, authenticated;
revoke execute on function public.log_event(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.notify_store(uuid, text) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.issue_ticket(uuid) from public, anon;
revoke execute on function public.cancel_ticket(uuid, text) from public, anon;
revoke execute on function public.save_explanation(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.lock_ticket(uuid, jsonb) from public, anon;
revoke execute on function public.reopen_ticket(uuid, text) from public, anon;
grant execute on function public.issue_ticket(uuid) to authenticated;
grant execute on function public.cancel_ticket(uuid, text) to authenticated;
grant execute on function public.save_explanation(uuid, jsonb, boolean) to authenticated;
grant execute on function public.lock_ticket(uuid, jsonb) to authenticated;
grant execute on function public.reopen_ticket(uuid, text) to authenticated;

-- ---------- 5. PHÂN QUYỀN (Row Level Security) ----------

alter table public.stores enable row level security;
alter table public.employees enable row level security;
alter table public.violation_types enable row level security;
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_items enable row level security;
alter table public.ticket_events enable row level security;
alter table public.notifications enable row level security;

-- Dữ liệu nền: ai đăng nhập cũng xem được, chỉ admin sửa
create policy "read stores" on public.stores for select to authenticated using (true);
create policy "admin stores" on public.stores for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
create policy "read employees" on public.employees for select to authenticated using (true);
create policy "admin employees" on public.employees for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
create policy "read violations" on public.violation_types for select to authenticated using (true);
create policy "admin violations" on public.violation_types for all to authenticated using (my_role() = 'admin') with check (my_role() = 'admin');
create policy "read profiles" on public.profiles for select to authenticated using (true);
-- profiles chỉ được tạo/sửa qua server (service role) ở màn Admin

-- Phiếu
create policy "see tickets" on public.tickets for select to authenticated
  using (can_see_ticket(status, store_id, created_by));
create policy "qa create draft" on public.tickets for insert to authenticated
  with check (my_role() = 'qa' and created_by = auth.uid() and status = 'draft');
create policy "qa edit own draft" on public.tickets for update to authenticated
  using (my_role() = 'qa' and created_by = auth.uid() and status = 'draft')
  with check (created_by = auth.uid() and status = 'draft');
create policy "qa delete own draft" on public.tickets for delete to authenticated
  using (my_role() = 'qa' and created_by = auth.uid() and status = 'draft');

-- Dòng lỗi: xem theo phiếu; QA chỉ sửa khi phiếu của mình còn nháp
create policy "see items" on public.ticket_items for select to authenticated
  using (exists (select 1 from tickets t where t.id = ticket_id));
create policy "qa write draft items" on public.ticket_items for all to authenticated
  using (exists (select 1 from tickets t where t.id = ticket_id and t.status = 'draft' and t.created_by = auth.uid()))
  with check (exists (select 1 from tickets t where t.id = ticket_id and t.status = 'draft' and t.created_by = auth.uid()));

create policy "see events" on public.ticket_events for select to authenticated
  using (exists (select 1 from tickets t where t.id = ticket_id));

create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 6. LƯU ẢNH MINH CHỨNG ----------

insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "upload evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and public.my_role() in ('qa','cht'));
create policy "read evidence" on storage.objects for select to authenticated
  using (bucket_id = 'evidence');

-- ---------- 7. JOB 48H (pg_cron) ----------

create extension if not exists pg_cron;
select cron.schedule('process-deadlines', '*/5 * * * *', $$select public.process_deadlines()$$);

-- ---------- 8. REALTIME cho chuông thông báo ----------
alter publication supabase_realtime add table public.notifications;
