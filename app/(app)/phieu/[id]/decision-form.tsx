"use client";

import { useState } from "react";
import { Lock, Undo2 } from "lucide-react";
import { lockTicket, returnToStore, type DecisionInput } from "@/app/actions";
import { ExplanationView, ItemHeader, itemCap, type ItemFull } from "@/components/item-summary";
import { ConfirmButton } from "@/components/confirm-button";
import { ActionBar, Panel } from "@/components/common";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MIN_REASON, cn, money, reasonLength } from "@/lib/format";

/**
 * Chỉ được giữ hoặc GIẢM so với mức đề xuất (hàm SQL lock_ticket kiểm tra lại).
 * Muốn tăng / đổi lỗi: "Trả lại cửa hàng" -> sửa phiếu -> cửa hàng giải trình lại.
 */
const OPTIONS = [
  ["keep", "Giữ"],
  ["reduce", "Giảm"],
  ["waive", "Miễn"],
] as const;

type Row = { id: string; decision: string; amount: string; reason: string };
type RowError = { field: "amount" | "reason"; message: string } | null;

function rowAmount(r: Row, suggested: number): number | null {
  if (r.decision === "keep") return suggested;
  if (r.decision === "waive") return 0;
  const n = Number(r.amount.replace(/[^\d]/g, ""));
  return r.amount.trim() === "" || Number.isNaN(n) ? null : n;
}

function rowError(r: Row, suggested: number): RowError {
  const amt = rowAmount(r, suggested);
  if (amt == null) return { field: "amount", message: "Nhập số tiền" };
  if (amt > suggested) return { field: "amount", message: "Không được cao hơn mức đề xuất" };
  if (r.decision === "reduce" && amt >= suggested) return { field: "amount", message: "Số tiền giảm phải nhỏ hơn mức đề xuất" };
  if (r.decision !== "keep" && reasonLength(r.reason) < MIN_REASON)
    return { field: "reason", message: `Lý do cần ít nhất ${MIN_REASON} ký tự (${reasonLength(r.reason)}/${MIN_REASON})` };
  return null;
}

export function DecisionForm({ ticketId, items, urls }: { ticketId: string; items: ItemFull[]; urls: Record<string, string> }) {
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((i) => ({
      id: i.id,
      // Dữ liệu cũ có thể là "adjust" / "auto": đưa về Giữ để QA chọn lại.
      decision: i.decision === "reduce" || i.decision === "waive" ? i.decision : "keep",
      amount: i.final_amount != null ? String(i.final_amount) : "",
      reason: i.decision_reason ?? "",
    })),
  );
  const update = (idx: number, patch: Partial<Row>) => setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const errors = rows.map((r, i) => rowError(r, itemCap(items[i])));
  const errorCount = errors.filter(Boolean).length;
  const total = rows.reduce((s, r, i) => s + (rowAmount(r, itemCap(items[i])) ?? 0), 0);
  const suggestedTotal = items.reduce((s, i) => s + itemCap(i), 0);

  const payload = (): DecisionInput[] =>
    rows.map((r, i) => ({
      id: r.id,
      decision: r.decision,
      final_amount: rowAmount(r, itemCap(items[i])),
      decision_reason: r.reason,
    }));

  return (
    <div className="space-y-3">
      {items.map((it, idx) => {
        const row = rows[idx];
        const suggested = itemCap(it);
        const capped = suggested < (it.suggested_amount ?? suggested);
        const err = errors[idx];
        const errId = `dec-err-${it.id}`;
        return (
          <Panel key={it.id} className="space-y-5 p-5">
            <ItemHeader item={it} index={idx} urls={urls} />
            <ExplanationView item={it} urls={urls} />

            <FieldGroup className="gap-4 border-t pt-4">
              <div className="space-y-2">
                <FieldTitle id={`dec-label-${it.id}`}>Kết quả chốt</FieldTitle>
                <ToggleGroup
                  type="single"
                  spacing={0}
                  className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1"
                  aria-labelledby={`dec-label-${it.id}`}
                  value={row.decision}
                  onValueChange={(val) => {
                    if (!val) return; // luôn phải có một lựa chọn
                    update(idx, {
                      decision: val,
                      amount: val === "reduce" ? row.amount || "" : row.amount,
                    });
                  }}
                >
                  {OPTIONS.map(([val, text]) => (
                    <ToggleGroupItem
                      key={val}
                      value={val}
                      className="w-full rounded-md! font-semibold text-muted-foreground hover:bg-transparent data-[state=on]:bg-card data-[state=on]:text-primary data-[state=on]:shadow-sm"
                    >
                      {text}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {row.decision === "reduce" && (
                <Field data-invalid={err?.field === "amount" || undefined}>
                  <FieldLabel htmlFor={`amt-${it.id}`}>Số tiền sau khi giảm</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id={`amt-${it.id}`}
                      className="tnum"
                      inputMode="numeric"
                      placeholder={`Nhỏ hơn ${money(suggested)}`}
                      aria-invalid={err?.field === "amount" || undefined}
                      aria-describedby={err?.field === "amount" ? errId : undefined}
                      value={row.amount ? new Intl.NumberFormat("vi-VN").format(Number(row.amount.replace(/[^\d]/g, "")) || 0) : ""}
                      onChange={(e) => update(idx, { amount: e.target.value.replace(/[^\d]/g, "") })}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>đ</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription className="text-xs">
                    Tối đa {money(Math.max(0, suggested - 1))} ({capped ? "mức Admin đã giảm khi xử lý khiếu nại" : "mức đề xuất"} {money(suggested)}).
                  </FieldDescription>
                </Field>
              )}
              {row.decision !== "keep" && (
                <Field data-invalid={err?.field === "reason" || undefined}>
                  <FieldLabel htmlFor={`reason-${it.id}`}>
                    Lý do {row.decision === "waive" ? "miễn" : "giảm"} <span className="text-destructive" aria-hidden>*</span>
                  </FieldLabel>
                  <Textarea
                    id={`reason-${it.id}`}
                    rows={2}
                    required
                    placeholder="VD: Cửa hàng đã khắc phục ngay, lỗi do thiết bị hỏng"
                    aria-invalid={err?.field === "reason" || undefined}
                    aria-describedby={err?.field === "reason" ? errId : undefined}
                    value={row.reason}
                    onChange={(e) => update(idx, { reason: e.target.value })}
                  />
                </Field>
              )}
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                <span id={errId} className={err ? "text-destructive" : "text-muted-foreground"}>
                  {err?.message ?? "Hợp lệ"}
                </span>
                <span className="tnum shrink-0 font-semibold">{money(rowAmount(row, suggested))}</span>
              </div>
            </FieldGroup>
          </Panel>
        );
      })}

      <div className="pt-1">
        <ConfirmButton
          label={
            <>
              <Undo2 aria-hidden /> Trả lại cửa hàng
            </>
          }
          title="Trả lại phiếu cho cửa hàng?"
          variant="outline"
          confirmLabel="Trả lại"
          confirmText="Dùng khi cần tăng mức phạt hoặc đổi lỗi: phiếu quay về Chờ giải trình với hạn 48 giờ mới, bạn sửa phiếu, cửa hàng giải trình lại. Phần giải trình cũ được giữ để cửa hàng sửa tiếp."
          reasonLabel="Lý do trả lại"
          minReason={MIN_REASON}
          successText="Đã trả lại phiếu cho cửa hàng"
          onConfirm={(reason) => returnToStore(ticketId, reason)}
        />
      </div>

      <ActionBar>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Tổng chốt
            {total !== suggestedTotal && <span className="tnum ml-2 line-through">{money(suggestedTotal)}</span>}
          </span>
          <span className={cn("tnum text-lg font-semibold")}>{money(total)}</span>
        </div>
        {errorCount > 0 && <p className="text-sm text-destructive">Còn {errorCount} lỗi chưa hợp lệ.</p>}
        <ConfirmButton
          label={
            <>
              <Lock aria-hidden /> Chốt và khóa phiếu
            </>
          }
          title="Chốt và khóa phiếu?"
          size="lg"
          className="w-full"
          disabled={errorCount > 0}
          confirmLabel="Chốt phiếu"
          confirmText="Sau khi khóa, cửa hàng trưởng có 24 giờ để khiếu nại lên Admin nếu không đồng ý."
          successText="Đã chốt và khóa phiếu"
          onConfirm={() => lockTicket(ticketId, payload())}
        />
      </ActionBar>
    </div>
  );
}
