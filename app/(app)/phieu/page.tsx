import Link from "next/link";
import { Download, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTicketsPage, lockedTotal, pageParam, type TicketFilter } from "@/lib/queries";
import { STATUS_DOT, STATUS_LABEL, cn, money } from "@/lib/format";
import { isStoreRole, type TicketStatus } from "@/lib/types";
import { TicketList } from "@/components/ticket-card";
import { Pager } from "@/components/pager";
import { PageTitle } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Filters, type FilterValues } from "./filters";

const STATUSES: TicketStatus[] = ["pending_explanation", "pending_decision", "locked", "cancelled"];

/** "2026-10-31" -> "31/10/2026" */
const dmy = (iso: string) => iso.split("-").reverse().join("/");

export default async function TicketListPage(props: PageProps<"/phieu">) {
  const user = await getCurrentUser();
  const storeUser = isStoreRole(user.role);
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f: FilterValues = { status: one("status"), store: one("store"), from: one("from"), to: one("to"), code: one("code") };

  const supabase = await createClient();
  const filter: TicketFilter = {
    status: f.status ? [f.status as TicketStatus] : STATUSES,
    storeId: f.store || undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    code: f.code || undefined,
  };
  const [list, total, { data: stores }] = await Promise.all([
    listTicketsPage(supabase, filter, pageParam(sp.page)),
    lockedTotal(supabase, filter),
    supabase.from("stores").select("id, code, name").order("code"),
  ]);
  const tickets = list.rows;

  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();

  /** Link giữ các bộ lọc hiện tại, thay / bỏ một số khóa. Đổi bộ lọc thì về trang 1. */
  const link = (patch: Partial<FilterValues>, page = 1) => {
    const p = new URLSearchParams(
      Object.entries({ ...f, ...patch, page: page > 1 ? String(page) : "" }).filter(([, v]) => v) as [string, string][],
    ).toString();
    return `/phieu${p ? `?${p}` : ""}`;
  };
  const store = stores?.find((s) => s.id === f.store);
  const chips = [
    f.code && { label: `Mã: ${f.code}`, href: link({ code: "" }) },
    !storeUser && f.store && { label: store ? `${store.code} · ${store.name}` : "Cửa hàng", href: link({ store: "" }) },
    (f.from || f.to) && { label: `${f.from ? dmy(f.from) : "…"} – ${f.to ? dmy(f.to) : "…"}`, href: link({ from: "", to: "" }) },
  ].filter((c): c is { label: string; href: string } => !!c);
  const activeCount = [!storeUser && f.store, f.from || f.to].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <PageTitle
        title={storeUser ? "Phiếu của cửa hàng" : "Tất cả phiếu"}
        sub={
          <>
            <span className="tnum">{list.count}</span> phiếu
            {total != null && (
              <>
                {" "}
                · đã chốt <span className="tnum font-medium text-foreground">{money(total)}</span>
              </>
            )}
          </>
        }
        action={
          <Button variant="outline" asChild>
            <a href={`/api/export${qs ? `?${qs}` : ""}`}>
              <Download aria-hidden /> Xuất Excel
            </a>
          </Button>
        }
      />

      <Filters
        key={qs}
        f={f}
        stores={stores ?? []}
        showStore={!storeUser}
        activeCount={activeCount}
        hasAny={!!qs}
      />

      {/* Lọc nhanh theo trạng thái */}
      <nav aria-label="Lọc theo trạng thái" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          {[{ value: "", label: "Tất cả" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))].map((s) => {
            const active = f.status === s.value;
            return (
              <li key={s.value || "all"}>
                <Link
                  href={link({ status: s.value })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors sm:h-9",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "bg-card text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground",
                  )}
                >
                  {s.value && <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[s.value as TicketStatus])} />}
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Bộ lọc đang áp dụng">
          {chips.map((c) => (
            <li key={c.label}>
              <Link
                href={c.href}
                aria-label={`Bỏ lọc: ${c.label}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-accent pr-2.5 pl-3.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/70 sm:h-8"
              >
                {c.label}
                <X className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <TicketList tickets={tickets} showStore={!storeUser} empty="Không có phiếu nào khớp bộ lọc." />
      <Pager
        page={list.page}
        pages={list.pages}
        total={list.count}
        size={list.size}
        unit="phiếu"
        href={(p) => link({}, p)}
      />
    </div>
  );
}
