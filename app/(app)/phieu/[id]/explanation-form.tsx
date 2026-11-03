"use client";

import { useState, useTransition } from "react";
import { Eye, Lightbulb, MessageSquareWarning, Save, Send, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { saveExplanation, type ExplanationInput } from "@/app/actions";
import { ExplainerNote, ExplanationView, ItemHeader, type ItemFull } from "@/components/item-summary";
import { PhotoPicker } from "@/components/photos";
import { ConfirmButton } from "@/components/confirm-button";
import { ActionBar, Panel } from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const toRow = (i: ItemFull): ExplanationInput => ({
  id: i.id,
  cht_response: i.cht_response,
  explanation: i.explanation ?? "",
  cause: i.cause ?? "",
  corrective_action: i.corrective_action ?? "",
  explanation_paths: i.explanation_paths ?? [],
});

/**
 * Form giải trình.
 * - Cửa hàng trưởng (canSubmit): sửa mọi lỗi, lưu nháp và gửi cả phiếu.
 * - Nhân viên: chỉ sửa lỗi của mình (editableIds), chỉ lưu; CHT là người gửi.
 */
export function ExplanationForm({
  ticketId,
  items,
  urls,
  canSubmit,
  editableIds,
}: {
  ticketId: string;
  items: ItemFull[];
  urls: Record<string, string>;
  canSubmit: boolean;
  editableIds: string[];
}) {
  const [rows, setRows] = useState<ExplanationInput[]>(() => items.map(toRow));
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [prevItems, setPrevItems] = useState(items);
  const [saving, start] = useTransition();
  const editable = new Set(editableIds);

  // Dữ liệu trên server thay đổi (nhân viên vừa lưu giải trình, QA vừa sửa / thêm / xóa lỗi):
  // dựng lại theo danh sách lỗi mới, giữ nội dung đang gõ dở — trừ lỗi QA vừa sửa
  // (khi đó phần giải trình cũ không còn đúng, server đã đặt lại).
  if (items !== prevItems) {
    const prevById = new Map(prevItems.map((i) => [i.id, i]));
    // Chỉ "thay đổi lớn" (đổi lỗi / nhân viên) mới đặt lại giải trình; sửa mô tả, thêm ảnh thì giữ.
    const editedIds = items
      .filter((i) => {
        const p = prevById.get(i.id);
        return p && (p.violation_type_id !== i.violation_type_id || p.employee_id !== i.employee_id);
      })
      .map((i) => i.id);
    setPrevItems(items);
    setRows((rs) =>
      items.map((i) => {
        const r = rs.find((x) => x.id === i.id);
        return r && dirty.has(i.id) && !editedIds.includes(i.id) ? r : toRow(i);
      }),
    );
    if (editedIds.length) {
      setDirty((d) => new Set([...d].filter((id) => !editedIds.includes(id))));
      setTouched((d) => new Set([...d].filter((id) => !editedIds.includes(id))));
    }
  }

  const update = (idx: number, patch: Partial<ExplanationInput>) => {
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
    setDirty((d) => new Set(d).add(rows[idx].id));
  };

  const mine = rows.filter((r) => editable.has(r.id));
  const missingDispute = mine.filter((r) => r.cht_response === "dispute" && !r.explanation.trim()).length;
  const untouched = rows.filter((r) => !r.cht_response).length;

  function save() {
    start(async () => {
      const r = await saveExplanation(ticketId, mine, false);
      if (r.ok) setDirty(new Set());
      if (r.ok) toast.success(canSubmit ? "Đã lưu nháp giải trình" : "Đã lưu. Cửa hàng trưởng sẽ xem lại và gửi.");
      else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-3">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <Lightbulb aria-hidden />
        <AlertDescription className="text-amber-900">
          {canSubmit ? (
            <p>
              Với từng lỗi, chọn <b>Chấp nhận</b> hoặc <b>Không đồng ý</b> và nhập thông tin. Nhân viên có thể soạn trước phần
              lỗi của họ để bạn xem lại. Lỗi bỏ trống sẽ được coi là chấp nhận. Quá hạn mà chưa gửi, hệ thống sẽ tự áp mức đề xuất.
            </p>
          ) : (
            <p>
              Bạn soạn giải trình cho <b>lỗi của mình</b> rồi bấm <b>Lưu</b>. Cửa hàng trưởng sẽ xem lại và gửi cho QA.
            </p>
          )}
        </AlertDescription>
      </Alert>

      {items.map((it, idx) => {
        const row = rows[idx];
        if (!editable.has(it.id))
          return (
            <Panel key={it.id} className="space-y-4 p-5">
              <Badge variant="secondary" className="gap-1.5">
                <Eye aria-hidden /> Không thuộc phần của bạn · chỉ xem
              </Badge>
              <ItemHeader item={it} index={idx} urls={urls} />
              <ExplanationView item={it} urls={urls} />
            </Panel>
          );

        const expInvalid = row.cht_response === "dispute" && !row.explanation.trim() && touched.has(it.id);
        return (
          <Panel key={it.id} className="space-y-5 p-5">
            <ItemHeader item={it} index={idx} urls={urls} />

            <div className="space-y-2 border-t pt-4">
              <FieldTitle id={`resp-${it.id}`}>Phản hồi của cửa hàng</FieldTitle>
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                className="grid w-full grid-cols-2"
                aria-labelledby={`resp-${it.id}`}
                value={row.cht_response ?? ""}
                onValueChange={(v) => update(idx, { cht_response: (v || null) as ExplanationInput["cht_response"] })}
              >
                <ToggleGroupItem
                  value="accept"
                  className="w-full font-semibold data-[state=on]:border-emerald-600 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-800"
                >
                  <ThumbsUp aria-hidden /> Chấp nhận lỗi
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dispute"
                  className="w-full font-semibold data-[state=on]:border-amber-600 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-900"
                >
                  <MessageSquareWarning aria-hidden /> Không đồng ý
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {row.cht_response && (
              <FieldGroup className="gap-4">
                {row.cht_response === "dispute" && (
                  <Field data-invalid={expInvalid || undefined}>
                    <FieldLabel htmlFor={`exp-${it.id}`}>
                      Nội dung giải trình <span className="text-destructive" aria-hidden>*</span>
                    </FieldLabel>
                    <Textarea
                      id={`exp-${it.id}`}
                      rows={3}
                      required
                      aria-invalid={expInvalid || undefined}
                      aria-describedby={expInvalid ? `exp-err-${it.id}` : undefined}
                      value={row.explanation}
                      onChange={(e) => update(idx, { explanation: e.target.value })}
                      onBlur={() => setTouched((t) => new Set(t).add(it.id))}
                      placeholder="Vì sao không đồng ý với lỗi này?"
                    />
                    {expInvalid && <FieldError id={`exp-err-${it.id}`}>Cần nhập lý do khi không đồng ý.</FieldError>}
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor={`cause-${it.id}`}>Nguyên nhân</FieldLabel>
                  <Textarea id={`cause-${it.id}`} rows={2} value={row.cause} onChange={(e) => update(idx, { cause: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`fix-${it.id}`}>Biện pháp khắc phục</FieldLabel>
                  <Textarea
                    id={`fix-${it.id}`}
                    rows={2}
                    value={row.corrective_action}
                    onChange={(e) => update(idx, { corrective_action: e.target.value })}
                  />
                </Field>
                <Field>
                  <FieldTitle>Ảnh minh chứng của cửa hàng</FieldTitle>
                  <PhotoPicker
                    folder={`tickets/${ticketId}/cht`}
                    value={row.explanation_paths}
                    onChange={(p) => update(idx, { explanation_paths: p })}
                    urls={urls}
                  />
                </Field>
              </FieldGroup>
            )}
            <ExplainerNote item={it} />
          </Panel>
        );
      })}

      {mine.length > 0 && (
        <ActionBar>
          {missingDispute > 0 && (
            <p id="exp-missing" className="text-sm text-destructive">
              Còn {missingDispute} lỗi “Không đồng ý” chưa có nội dung giải trình.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={canSubmit ? "outline" : "default"}
              size="lg"
              className={canSubmit ? "" : "w-full"}
              onClick={save}
              disabled={saving}
            >
              {saving ? <Spinner /> : <Save aria-hidden />} {canSubmit ? "Lưu nháp" : "Lưu giải trình"}
            </Button>
            {canSubmit && (
              <ConfirmButton
                label={
                  <>
                    <Send aria-hidden /> Gửi giải trình
                  </>
                }
                title="Gửi giải trình?"
                size="lg"
                className="flex-1"
                disabled={missingDispute > 0}
                confirmLabel="Gửi"
                confirmText={
                  untouched > 0
                    ? `Có ${untouched} lỗi chưa phản hồi, sẽ được coi là chấp nhận. Sau khi gửi không sửa được nữa.`
                    : "Sau khi gửi không sửa được nữa."
                }
                successText="Đã gửi giải trình"
                onConfirm={() => saveExplanation(ticketId, rows, true)}
              />
            )}
          </div>
        </ActionBar>
      )}
    </div>
  );
}
