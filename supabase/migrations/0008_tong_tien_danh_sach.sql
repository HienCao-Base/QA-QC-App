-- =====================================================================
-- Phân trang danh sách phiếu: tổng tiền đã chốt phải tính trên TOÀN BỘ kết quả lọc,
-- không chỉ trang đang xem. Hàm chạy với quyền người gọi (security invoker) nên RLS
-- vẫn lọc đúng phiếu người đó được xem.
-- Chạy file này trong Supabase > SQL Editor (sau 0001 -> 0007).
-- =====================================================================

create or replace function public.ticket_locked_total(
  p_status text[], p_store uuid, p_from timestamptz, p_to timestamptz, p_code text
) returns bigint
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(i.final_amount), 0)::bigint
  from tickets t join ticket_items i on i.ticket_id = t.id
  where t.status = 'locked'
    and (p_status is null or t.status = any(p_status))
    and (p_store is null or t.store_id = p_store)
    and (p_from is null or t.inspected_at >= p_from)
    and (p_to is null or t.inspected_at <= p_to)
    and (p_code is null or t.code ilike '%' || p_code || '%')
$$;

revoke execute on function public.ticket_locked_total(text[], uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.ticket_locked_total(text[], uuid, timestamptz, timestamptz, text) to authenticated;
