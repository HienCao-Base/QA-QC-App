"use client";

import { useState } from "react";
import { Check, Gavel, MessageSquareWarning, Scale } from "lucide-react";
import { appealTicket, resolveAppeal } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { Panel } from "@/components/common";
import { itemName, type ItemFull } from "@/components/item-summary";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { MIN_REASON, dateTime, money, reasonLength } from "@/lib/format";
import type { AppealStatus } from "@/lib/types";

export type AppealInfo = {
  appeal_status: AppealStatus | null;
  appeal_reason: string | null;
  appealed_at: string | null;
  appeal_resolution: string | null;
  appeal_resolved_at: string | null;
};

const STATUS: Record<AppealStatus, { label: string; cls: string }> = {
  pending: { label: "Chờ Admin xử lý", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  accepted: { label: "Đã chấp nhận", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  rejected: { label: "Giữ nguyên kết quả", cls: "border-border bg-muted text-muted-foreground" },
};

/** Khung khiếu nại trên trang phiếu đã khóa. */
export function AppealSection({
  ticketId,
  appeal,
  canAppeal,
  appealDeadline,
  canResolve,
  items,
}: {
  ticketId: string;
  appeal: AppealInfo;
  /** CHT của cửa hàng, phiếu đã khóa, chưa khiếu nại, còn trong 24h */
  canAppeal: boolean;
  appealDeadline: string | null;
  /** Admin, khiếu nại đang chờ */
  canResolve: boolean;
  items: ItemFull[];
}) {
  if (!appeal.appeal_status && !canAppeal) return null;

  if (!appeal.appeal_status)
    return (
      <Panel className="space-y-3 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <Scale className="size-4" aria-hidden /> Không đồng ý với kết quả chốt?
        </p>
        <p className="text-sm text-muted-foreground">
          Cửa hàng trưởng được khiếu nại <b className="text-foreground">1 lần</b> lên Admin (người không lập phiếu)
          {appealDeadline && (
            <>
              , hạn đến <b className="tnum text-foreground">{dateTime(appealDeadline)}</b>
            </>
          )}
          . Admin chỉ có thể giữ nguyên hoặc giảm tiền.
        </p>
        <ConfirmButton
          label={
            <>
              <MessageSquareWarning aria-hidden /> Khiếu nại lên Admin
            </>
          }
          title="Gửi khiếu nại lên Admin?"
          variant="outline"
          confirmLabel="Gửi khiếu nại"
          confirmText="Mỗi phiếu chỉ được khiếu nại 1 lần. Hãy nêu rõ lỗi nào, vì sao không đồng ý và đề xuất của cửa hàng."
          reasonLabel="Nội dung khiếu nại"
          minReason={MIN_REASON}
          successText="Đã gửi khiếu nại, Admin sẽ xem xét"
          onConfirm={(reason) => appealTicket(ticketId, reason)}
        />
      </Panel>
    );

  const st = STATUS[appeal.appeal_status];
  return (
    <Panel className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <Scale className="size-4" aria-hidden /> Khiếu nại của cửa hàng
        </p>
        <Badge variant="outline" className={st.cls}>
          {st.label}
        </Badge>
      </div>
      <div className="space-y-1 text-sm">
        <p className="whitespace-pre-line">{appeal.appeal_reason}</p>
        <p className="tnum text-xs text-muted-foreground">Gửi lúc {dateTime(appeal.appealed_at)}</p>
      </div>
      {appeal.appeal_resolution && (
        <div className="space-y-1 rounded-lg bg-muted/60 p-3.5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Gavel className="size-4" aria-hidden /> Admin xử lý
          </p>
          <p className="whitespace-pre-line">{appeal.appeal_resolution}</p>
          <p className="tnum text-xs text-muted-foreground">{dateTime(appeal.appeal_resolved_at)}</p>
        </div>
      )}
      {canResolve && <AppealResolver ticketId={ticketId} items={items} />}
    </Panel>
  );
}

/** Admin xử lý khiếu nại: giữ nguyên, hoặc giảm tiền từng lỗi (không được tăng). */
function AppealResolver({ ticketId, items }: { ticketId: string; items: ItemFull[] }) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, String(i.final_amount ?? 0)])),
  );
  const [reason, setReason] = useState("");
  const amt = (i: ItemFull) => Number((amounts[i.id] ?? "").replace(/[^\d]/g, "") || 0);
  const over = items.filter((i) => amt(i) > (i.final_amount ?? 0));
  const lowered = items.filter((i) => amt(i) < (i.final_amount ?? 0));
  const reasonOk = reasonLength(reason) >= MIN_REASON;
  const newTotal = items.reduce((s, i) => s + amt(i), 0);
  const oldTotal = items.reduce((s, i) => s + (i.final_amount ?? 0), 0);

  return (
    <FieldGroup className="gap-4 border-t pt-4">
      <p className="text-sm font-semibold">Xử lý khiếu nại</p>
      {items.map((i, idx) => (
        <Field key={i.id} data-invalid={amt(i) > (i.final_amount ?? 0) || undefined}>
          <FieldLabel htmlFor={`ap-${i.id}`}>
            Lỗi {idx + 1}: {itemName(i)}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`ap-${i.id}`}
              className="tnum"
              inputMode="numeric"
              aria-invalid={amt(i) > (i.final_amount ?? 0) || undefined}
              value={new Intl.NumberFormat("vi-VN").format(amt(i))}
              onChange={(e) => setAmounts((a) => ({ ...a, [i.id]: e.target.value.replace(/[^\d]/g, "") }))}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>đ</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription className="text-xs">
            QA đã chốt {money(i.final_amount)} · chỉ được giữ hoặc giảm
          </FieldDescription>
        </Field>
      ))}
      <Field>
        <FieldLabel htmlFor="ap-reason">
          Lý do xử lý <span className="text-destructive" aria-hidden>*</span>
        </FieldLabel>
        <Textarea id="ap-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <FieldDescription className="tnum text-xs">
          {reasonOk ? `${reasonLength(reason)} ký tự` : `Cần ít nhất ${MIN_REASON} ký tự (${reasonLength(reason)}/${MIN_REASON})`}
        </FieldDescription>
      </Field>
      {over.length > 0 && <p className="text-sm text-destructive">Không được tăng tiền khi xử lý khiếu nại.</p>}
      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          label="Giữ nguyên kết quả"
          title="Giữ nguyên kết quả chốt?"
          variant="outline"
          disabled={!reasonOk}
          confirmLabel="Giữ nguyên"
          confirmText="Khiếu nại sẽ đóng lại, cửa hàng và QA nhận thông báo."
          successText="Đã xử lý: giữ nguyên kết quả"
          onConfirm={() => resolveAppeal(ticketId, false, [], reason)}
        />
        <ConfirmButton
          label={
            <>
              <Check aria-hidden /> Chấp nhận, giảm còn {money(newTotal)}
            </>
          }
          title="Chấp nhận khiếu nại?"
          disabled={!reasonOk || over.length > 0 || lowered.length === 0}
          confirmLabel="Chấp nhận"
          confirmText={`Tổng tiền phiếu từ ${money(oldTotal)} còn ${money(newTotal)}. Mức QA đã chốt vẫn được lưu để đối chiếu.`}
          successText="Đã chấp nhận khiếu nại"
          onConfirm={() =>
            resolveAppeal(
              ticketId,
              true,
              items.map((i) => ({ id: i.id, final_amount: amt(i) })),
              reason,
            )
          }
        />
      </div>
      {lowered.length === 0 && reasonOk && (
        <p className="text-xs text-muted-foreground">Muốn chấp nhận, hãy giảm tiền ít nhất 1 lỗi.</p>
      )}
    </FieldGroup>
  );
}
