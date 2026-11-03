import { notFound } from "next/navigation";
import { Info as InfoIcon, StickyNote } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signUrls } from "@/lib/queries";
import { APPEAL_WINDOW_MS, dateTime, EVENT_LABEL, money } from "@/lib/format";
import { isStoreRole, type Employee, type Ticket, type ViolationType } from "@/lib/types";
import { Panel, StatusChip } from "@/components/common";
import { BackLink } from "@/components/back-link";
import { Countdown } from "@/components/countdown";
import { DecisionView, ExplanationView, ItemHeader, itemSuggested, type ItemFull } from "@/components/item-summary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DraftEditor } from "./draft-editor";
import { IssuedEditor } from "./issued-editor";
import { ExplanationForm } from "./explanation-form";
import { DecisionForm } from "./decision-form";
import { TicketActions } from "./ticket-actions";
import { AppealSection } from "./appeal";

type TicketFull = Ticket & {
  store: { name: string; code: string; address: string | null } | null;
  creator: { full_name: string } | null;
  locker: { full_name: string } | null;
};

export default async function TicketPage(props: PageProps<"/phieu/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: ticket }, { data: itemsRaw }, { data: events }] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "*, store:stores(name, code, address), creator:profiles!tickets_created_by_fkey(full_name), locker:profiles!tickets_locked_by_fkey(full_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ticket_items")
      .select(
        "*, employee:employees(full_name, code), violation_type:violation_types(name, code, severity, amount), " +
          "explainer:profiles!ticket_items_explained_by_fkey(full_name, role)",
      )
      .eq("ticket_id", id)
      .order("created_at"),
    supabase.from("ticket_events").select("*, actor:profiles(full_name)").eq("ticket_id", id).order("created_at"),
  ]);

  if (!ticket) notFound();
  const t = ticket as TicketFull;
  const items = (itemsRaw ?? []) as unknown as ItemFull[];
  const urls = await signUrls(supabase, items.flatMap((i) => [...i.evidence_paths, ...i.explanation_paths]));

  const isOwner = t.created_by === user.id;
  const mode =
    t.status === "draft" && user.role === "qa" && isOwner ? "draft"
    : t.status === "pending_explanation" && isStoreRole(user.role) ? "explain"
    // QA lập phiếu sửa được khi cửa hàng chưa gửi và chưa quá hạn (hàm SQL kiểm tra lại)
    : t.status === "pending_explanation" && user.role === "qa" && isOwner && t.due_at && new Date(t.due_at) > new Date()
      ? "edit"
    : t.status === "pending_decision" && user.role === "qa" && isOwner ? "decide"
    : "view";

  let violationTypes: ViolationType[] = [];
  let employees: Employee[] = [];
  if (mode === "draft" || mode === "edit") {
    const [v, e] = await Promise.all([
      supabase.from("violation_types").select("*").eq("active", true).order("code"),
      supabase.from("employees").select("*").eq("store_id", t.store_id).eq("active", true).order("full_name"),
    ]);
    violationTypes = (v.data ?? []) as ViolationType[];
    employees = (e.data ?? []) as Employee[];
  }

  // Khiếu nại: CHT của cửa hàng, 1 lần, trong 24h sau khi khóa. Admin xử lý. (Hàm SQL kiểm tra lại.)
  const lockedAtMs = t.locked_at ? new Date(t.locked_at).getTime() : 0;
  const appealDeadline = t.locked_at ? new Date(lockedAtMs + APPEAL_WINDOW_MS).toISOString() : null;
  const canAppeal =
    t.status === "locked" && user.role === "cht" && !t.appeal_status && new Date().getTime() < lockedAtMs + APPEAL_WINDOW_MS;
  const canResolve = t.status === "locked" && user.role === "admin" && t.appeal_status === "pending";

  const total = items.reduce((s, i) => s + (t.status === "locked" ? i.final_amount ?? 0 : itemSuggested(i)), 0);

  const waitingNote =
    mode !== "view" ? null
    : t.status === "pending_explanation" && user.role === "qa" ? "Đang chờ cửa hàng trưởng giải trình."
    : t.status === "pending_decision" && isStoreRole(user.role) ? "Cửa hàng đã gửi giải trình. Đang chờ QA chốt kết quả."
    : t.status === "pending_decision" && user.role === "qa" && !isOwner
      ? `Phiếu đang chờ chốt. Chỉ ${t.creator?.full_name ?? "QA tạo phiếu"} mới chốt được phiếu này.`
    : null;

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Đầu phiếu */}
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tnum text-2xl font-semibold">{t.code ?? "Phiếu nháp"}</h1>
              <StatusChip status={t.status} auto={t.auto_locked} />
              {t.status === "pending_explanation" && t.due_at && <Countdown dueAt={t.due_at} />}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t.store?.name}</span> · {t.store?.code}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              {t.status === "locked" ? "Tổng tiền chốt" : "Tổng tiền đề xuất"}
            </p>
            <p className="tnum text-2xl font-semibold tracking-tight">{money(total)}</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-4 text-sm sm:grid-cols-4">
          <Info label="QA/QC" value={t.creator?.full_name ?? "—"} />
          <Info label="Ngày kiểm tra" value={dateTime(t.inspected_at)} />
          {t.due_at && <Info label="Hạn giải trình" value={dateTime(t.due_at)} />}
          <Info label="Số lỗi" value={String(items.length)} />
          {t.cancel_reason && <Info label="Lý do hủy" value={t.cancel_reason} wide />}
        </dl>

        {t.note && (
          <p className="mt-4 flex gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            {t.note}
          </p>
        )}
      </Panel>

      {/* Nội dung theo vai trò */}
      {mode === "draft" && (
        <DraftEditor ticketId={t.id} items={items} urls={urls} violationTypes={violationTypes} employees={employees} />
      )}
      {mode === "explain" && (
        <ExplanationForm
          ticketId={t.id}
          items={items}
          urls={urls}
          canSubmit={user.role === "cht"}
          editableIds={items.filter((i) => user.role === "cht" || i.employee_id === user.employee_id).map((i) => i.id)}
        />
      )}
      {mode === "edit" && (
        <IssuedEditor ticketId={t.id} items={items} urls={urls} violationTypes={violationTypes} employees={employees} />
      )}
      {mode === "decide" && <DecisionForm ticketId={t.id} items={items} urls={urls} />}
      {mode === "view" && (
        <div className="space-y-3">
          {waitingNote && (
            <Alert>
              <InfoIcon aria-hidden />
              <AlertDescription>{waitingNote}</AlertDescription>
            </Alert>
          )}
          {items.map((it, idx) => (
            <Panel key={it.id} className="space-y-4 p-5">
              <ItemHeader item={it} index={idx} urls={urls} />
              <ExplanationView item={it} urls={urls} />
              <DecisionView item={it} />
            </Panel>
          ))}
        </div>
      )}

      {t.status === "locked" && (
        <AppealSection
          ticketId={t.id}
          appeal={t}
          canAppeal={canAppeal}
          appealDeadline={appealDeadline}
          canResolve={canResolve}
          items={items}
        />
      )}

      <TicketActions
        ticketId={t.id}
        canCancel={t.status === "pending_explanation" && user.role === "qa" && isOwner}
        canReopen={t.status === "locked" && user.role === "admin" && t.appeal_status !== "pending"}
      />

      {/* Lịch sử */}
      {events && events.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="px-1 text-sm font-semibold">Lịch sử</h2>
          <Panel className="p-5">
            <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
              {events.map((e, i) => (
                <li key={e.id} className="relative flex gap-4 pl-6 text-sm">
                  <span
                    aria-hidden
                    className={
                      "absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-card " +
                      (i === events.length - 1 ? "bg-primary" : "bg-muted-foreground/40")
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{EVENT_LABEL[e.action] ?? e.action}</span>
                      <span className="text-muted-foreground"> · {(e.actor as { full_name: string } | null)?.full_name ?? "Hệ thống"}</span>
                    </p>
                    {e.note && <p className="mt-0.5 text-muted-foreground">{e.note}</p>}
                    <p className="tnum mt-0.5 text-xs text-muted-foreground">{dateTime(e.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </section>
      )}
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-4" : undefined}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="tnum mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
