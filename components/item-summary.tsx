import { CircleCheck, MessageSquareWarning, PencilLine, ThumbsUp, User } from "lucide-react";
import { DECISION_LABEL, dateTime, money, cn } from "@/lib/format";
import type { TicketItem, Severity } from "@/lib/types";
import { SeverityChip } from "./common";
import { Badge } from "@/components/ui/badge";
import { PhotoGrid } from "./photos";

export type ItemFull = TicketItem & {
  employee: { full_name: string; code: string } | null;
  violation_type: { name: string; code: string; severity: Severity; amount: number } | null;
  explainer?: { full_name: string; role: string } | null;
};

/** Dòng nhỏ "Soạn bởi ..." dưới phần giải trình. */
export function ExplainerNote({ item }: { item: ItemFull }) {
  if (!item.explainer) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Soạn bởi {item.explainer.full_name}
      {item.explainer.role === "nv" ? " (nhân viên)" : item.explainer.role === "cht" ? " (cửa hàng trưởng)" : ""}
      {item.explained_at ? ` · ${dateTime(item.explained_at)}` : ""}
    </p>
  );
}

export const itemName = (i: ItemFull) => i.violation_name ?? i.violation_type?.name ?? "—";
export const itemSeverity = (i: ItemFull) => i.severity ?? i.violation_type?.severity ?? null;
export const itemSuggested = (i: ItemFull) => i.suggested_amount ?? i.violation_type?.amount ?? 0;
/** Mức tối đa được chốt: mức đề xuất, hoặc mức Admin đã giảm khi xử lý khiếu nại (khớp hàm SQL item_cap). */
export const itemCap = (i: ItemFull) =>
  i.qa_final_amount != null && i.final_amount != null ? Math.min(itemSuggested(i), i.final_amount) : itemSuggested(i);

/** Phần thông tin lỗi do QA ghi nhận. */
export function ItemHeader({ item, index, urls }: { item: ItemFull; index: number; urls: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="tnum grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            <span className="sr-only">Lỗi {index + 1} · </span>
            {item.violation_type?.code}
          </p>
          <p className="font-semibold leading-snug">{itemName(item)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum font-semibold">{money(itemSuggested(item))}</p>
          <p className="text-xs text-muted-foreground">đề xuất</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-10 text-sm text-muted-foreground">
        <SeverityChip severity={itemSeverity(item)} />
        <span className="inline-flex items-center gap-1.5">
          <User className="size-3.5" aria-hidden />
          {item.employee ? `${item.employee.full_name} (${item.employee.code})` : "Lỗi chung cửa hàng"}
        </span>
        {item.edited_at && (
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800" title="QA đã sửa lỗi này sau khi phát hành">
            <PencilLine aria-hidden /> Đã sửa {dateTime(item.edited_at)}
          </Badge>
        )}
      </div>
      {item.description && <p className="pl-10 text-sm whitespace-pre-line">{item.description}</p>}
      <div className="pl-10">
        <PhotoGrid paths={item.evidence_paths} urls={urls} />
      </div>
    </div>
  );
}

/** Phần giải trình của CHT (chỉ xem). */
export function ExplanationView({ item, urls }: { item: ItemFull; urls: Record<string, string> }) {
  if (!item.cht_response) return null;
  const dispute = item.cht_response === "dispute";
  const Icon = dispute ? MessageSquareWarning : ThumbsUp;
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3.5 text-sm",
        dispute ? "border-amber-200 bg-amber-50/70" : "bg-muted/50",
      )}
    >
      <p className={cn("flex items-center gap-2 font-semibold", dispute && "text-amber-900")}>
        <Icon className="size-4" aria-hidden />
        {dispute ? "Cửa hàng không đồng ý" : "Cửa hàng chấp nhận lỗi"}
      </p>
      {item.explanation && <Field label="Giải trình" value={item.explanation} />}
      {item.cause && <Field label="Nguyên nhân" value={item.cause} />}
      {item.corrective_action && <Field label="Biện pháp khắc phục" value={item.corrective_action} />}
      <PhotoGrid paths={item.explanation_paths} urls={urls} />
      <ExplainerNote item={item} />
    </div>
  );
}

/** Kết quả chốt (chỉ xem). */
export function DecisionView({ item }: { item: ItemFull }) {
  if (!item.decision) return null;
  const changed = item.final_amount !== itemSuggested(item);
  // Admin giảm tiền khi xử lý khiếu nại: hiện cả mức QA đã chốt để đối chiếu.
  const appealed = item.qa_final_amount != null && item.qa_final_amount !== item.final_amount;
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 text-sm">
      <div className="flex min-w-0 gap-2">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-emerald-900">Kết quả: {DECISION_LABEL[item.decision]}</p>
          {item.decision_reason && <p className="text-emerald-900/80">Lý do: {item.decision_reason}</p>}
          {appealed && (
            <p className="text-emerald-900/80">
              Sau khiếu nại: Admin giảm từ <span className="tnum">{money(item.qa_final_amount)}</span>
            </p>
          )}
        </div>
      </div>
      <p className="tnum font-semibold text-emerald-900">
        {changed && <span className="mr-2 font-normal text-muted-foreground line-through">{money(itemSuggested(item))}</span>}
        {money(item.final_amount)}
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-line">{value}</p>
    </div>
  );
}
