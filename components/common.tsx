import { STATUS_DOT, STATUS_LABEL, STATUS_STYLE, SEVERITY_LABEL, SEVERITY_STYLE, cn } from "@/lib/format";
import type { Severity, TicketStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatusChip({ status, auto }: { status: TicketStatus; auto?: boolean }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", STATUS_STYLE[status])}>
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
      {auto && status === "locked" ? " · tự động" : ""}
    </Badge>
  );
}

export function SeverityChip({ severity }: { severity: Severity | null }) {
  if (!severity) return null;
  return <Badge className={SEVERITY_STYLE[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function PageTitle({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function Empty({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
      {icon && <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">{icon}</span>}
      {children}
    </div>
  );
}

export function Section({
  id,
  title,
  count,
  children,
}: {
  id?: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2.5">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
        {title}
        {count != null && (
          <Badge variant="secondary" className="tnum h-5 min-w-5 rounded-full px-1.5">
            {count}
          </Badge>
        )}
      </h2>
      {children}
    </section>
  );
}

/** Hàng ô số tóm tắt đầu trang "Việc của tôi"; bấm để nhảy tới nhóm tương ứng. */
export function StatRow({
  items,
}: {
  items: { label: string; count: number; href: string; urgent?: boolean; icon?: React.ReactNode }[];
}) {
  return (
    <div className={cn("grid gap-3", items.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {items.map((s) => {
        const hot = s.urgent && s.count > 0;
        const body = (
          <>
            <span className="flex items-center justify-between gap-2">
              <span className="text-xs leading-snug font-medium text-muted-foreground">{s.label}</span>
              {s.icon && (
                <span
                  aria-hidden
                  className={cn(
                    "hidden size-7 shrink-0 place-items-center rounded-lg sm:grid [&_svg]:size-4",
                    hot ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.icon}
                </span>
              )}
            </span>
            <span className={cn("tnum mt-1 block text-3xl font-semibold tracking-tight", hot ? "text-amber-700" : "text-foreground")}>
              {s.count}
            </span>
          </>
        );
        const cls = cn(
          "block rounded-xl bg-card p-3.5 shadow-xs ring-1 ring-foreground/8 transition-colors",
          hot && "bg-amber-50/60 ring-amber-200",
        );
        return s.count > 0 ? (
          <a key={s.label} href={s.href} className={cn(cls, "hover:ring-primary/40")}>
            {body}
          </a>
        ) : (
          <div key={s.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Khung thẻ trắng dùng cho danh sách / nội dung. */
export function Panel({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("gap-0 py-0 shadow-xs", className)} {...props} />;
}

/** Thanh hành động dính sát đáy màn hình, chừa vùng thanh Home của iPhone. */
export function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 space-y-3 border-t bg-background/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg sm:mx-0 sm:mb-3 sm:rounded-xl sm:border sm:bg-card/95 sm:shadow-lg">
      {children}
    </div>
  );
}

/** Khối xám giữ chỗ khi đang tải. */
export function Bone({ className }: { className?: string }) {
  return <Skeleton aria-hidden className={cn("motion-reduce:animate-none", className)} />;
}
