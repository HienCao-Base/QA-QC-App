import Link from "next/link";
import { ChevronRight, Inbox, Scale } from "lucide-react";
import type { TicketRow } from "@/lib/queries";
import { dateTime, money } from "@/lib/format";
import { Empty, Panel, StatusChip } from "./common";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "./countdown";

export function ticketTotal(t: TicketRow) {
  return t.items.reduce(
    (s, i) =>
      s + (t.status === "locked" ? i.final_amount ?? 0 : i.suggested_amount ?? i.violation_type?.amount ?? 0),
    0,
  );
}

/** Một dòng phiếu trong danh sách. */
export function TicketCard({ t, showStore = true }: { t: TicketRow; showStore?: boolean }) {
  const names = t.items.map((i) => i.violation_name ?? i.violation_type?.name).filter(Boolean);
  return (
    <Link
      href={`/phieu/${t.id}`}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="tnum text-sm font-semibold">{t.code ?? "Phiếu nháp"}</span>
            <StatusChip status={t.status} auto={t.auto_locked} />
            {t.status === "pending_explanation" && t.due_at && <Countdown dueAt={t.due_at} />}
            {t.appeal_status === "pending" && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                <Scale aria-hidden /> Đang khiếu nại
              </Badge>
            )}
          </div>
          <span className="tnum shrink-0 text-sm font-semibold">{money(ticketTotal(t))}</span>
        </div>
        {showStore && t.store?.name && <p className="truncate text-sm font-medium">{t.store.name}</p>}
        <p className="truncate text-sm text-muted-foreground">
          {t.items.length} lỗi{names.length ? ` · ${names.join(", ")}` : ""}
        </p>
        <p className="tnum text-xs text-muted-foreground">
          {dateTime(t.issued_at ?? t.created_at)}
          {t.creator?.full_name ? ` · ${t.creator.full_name}` : ""}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

/** Danh sách phiếu gom trong một thẻ, ngăn cách bằng đường kẻ mảnh. */
export function TicketList({
  tickets,
  showStore = true,
  empty,
}: {
  tickets: TicketRow[];
  showStore?: boolean;
  empty: string;
}) {
  if (tickets.length === 0) return <Empty icon={<Inbox />}>{empty}</Empty>;
  return (
    <Panel>
      <ul className="divide-y">
        {tickets.map((t) => (
          <li key={t.id}>
            <TicketCard t={t} showStore={showStore} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
