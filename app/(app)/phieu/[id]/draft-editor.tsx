"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Send, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { deleteDraft, deleteItem, editIssuedItem, issueTicket, saveItem } from "@/app/actions";
import { ItemHeader, itemSuggested, type ItemFull } from "@/components/item-summary";
import { PhotoPicker } from "@/components/photos";
import { ActionBar, Panel, SeverityChip } from "@/components/common";
import { ConfirmButton } from "@/components/confirm-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MIN_REASON, cn, money, reasonLength } from "@/lib/format";
import type { Employee, ViolationType } from "@/lib/types";

type Props = {
  ticketId: string;
  items: ItemFull[];
  urls: Record<string, string>;
  violationTypes: ViolationType[];
  employees: Employee[];
};

const MAX_MATCHES = 30;

export function DraftEditor({ ticketId, items, urls, violationTypes, employees }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(items.length === 0 ? "new" : null);
  const total = items.reduce((s, i) => s + itemSuggested(i), 0);

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
        Danh sách lỗi <span className="tnum font-normal text-muted-foreground">({items.length})</span>
      </h2>

      {items.map((it, idx) =>
        editing === it.id ? (
          <ItemForm
            key={it.id}
            ticketId={ticketId}
            item={it}
            urls={urls}
            violationTypes={violationTypes}
            employees={employees}
            onDone={() => setEditing(null)}
          />
        ) : (
          <Panel key={it.id} className="space-y-4 p-5">
            <ItemHeader item={it} index={idx} urls={urls} />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(it.id)}>
                <Pencil aria-hidden /> Sửa
              </Button>
              <ConfirmButton
                label={
                  <>
                    <Trash2 aria-hidden /> Xóa
                  </>
                }
                title={`Xóa lỗi ${idx + 1}?`}
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                confirmVariant="destructive"
                confirmLabel="Xóa lỗi"
                confirmText="Lỗi này cùng ảnh minh chứng sẽ bị xóa khỏi phiếu nháp."
                successText="Đã xóa lỗi"
                onConfirm={() => deleteItem(ticketId, it.id)}
              />
            </div>
          </Panel>
        ),
      )}

      {editing === "new" ? (
        <ItemForm
          ticketId={ticketId}
          urls={urls}
          violationTypes={violationTypes}
          employees={employees}
          onDone={() => setEditing(null)}
          onCancel={items.length ? () => setEditing(null) : undefined}
        />
      ) : (
        editing === null && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full border-dashed bg-transparent text-muted-foreground shadow-none hover:border-primary hover:text-primary"
            onClick={() => setEditing("new")}
          >
            <Plus aria-hidden /> Thêm lỗi
          </Button>
        )
      )}

      <div className="pt-2">
        <ConfirmButton
          label={
            <>
              <Trash2 aria-hidden /> Xóa phiếu nháp
            </>
          }
          title="Xóa phiếu nháp?"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          confirmVariant="destructive"
          confirmLabel="Xóa phiếu"
          confirmText="Phiếu nháp cùng tất cả lỗi đã nhập sẽ bị xóa."
          successText="Đã xóa phiếu nháp"
          onConfirm={() => deleteDraft(ticketId)}
        />
      </div>

      {items.length > 0 && editing === null && (
        <ActionBar>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{items.length} lỗi · tổng đề xuất</span>
            <span className="tnum text-lg font-semibold">{money(total)}</span>
          </div>
          <ConfirmButton
            label={
              <>
                <Send aria-hidden /> Phát hành phiếu
              </>
            }
            title="Phát hành phiếu?"
            size="lg"
            className="w-full"
            confirmLabel="Phát hành"
            confirmText="Sau khi phát hành, phiếu không sửa được nữa và cửa hàng có 48 giờ để giải trình."
            successText="Đã phát hành phiếu"
            onConfirm={() => issueTicket(ticketId)}
          />
        </ActionBar>
      )}
    </div>
  );
}

/**
 * Form thêm / sửa một lỗi.
 * - mode "draft": phiếu nháp, lưu thẳng.
 * - mode "issued": phiếu đã phát hành (chờ giải trình). Đổi lỗi / nhân viên hoặc thêm lỗi là
 *   "thay đổi lớn": bắt buộc lý do, giải trình của lỗi bị đặt lại, hạn còn ít nhất 24h.
 *   Ảnh đã phát hành không xóa được, chỉ thêm.
 */
export function ItemForm({
  ticketId,
  item,
  urls,
  violationTypes,
  employees,
  onDone,
  onCancel,
  mode = "draft",
}: {
  ticketId: string;
  item?: ItemFull;
  urls: Record<string, string>;
  violationTypes: ViolationType[];
  employees: Employee[];
  onDone: () => void;
  onCancel?: () => void;
  mode?: "draft" | "issued";
}) {
  const issued = mode === "issued";
  const [reason, setReason] = useState("");
  const [vtId, setVtId] = useState(item?.violation_type_id ?? "");
  const [query, setQuery] = useState("");
  const [employeeId, setEmployeeId] = useState(item?.employee_id ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [photos, setPhotos] = useState<string[]>(item?.evidence_paths ?? []);
  const [pending, start] = useTransition();
  const formId = item?.id ?? "new";

  // Phiếu đã phát hành, giữ nguyên lỗi: hiện theo bản chụp lúc phát hành (mức tiền có thể khác danh mục hiện tại).
  const keepsSnapshot = issued && item && vtId === item.violation_type_id;
  const selected = keepsSnapshot
    ? {
        code: item.violation_type?.code ?? "",
        name: item.violation_name ?? item.violation_type?.name ?? "",
        severity: item.severity ?? item.violation_type?.severity ?? null,
        amount: item.suggested_amount ?? item.violation_type?.amount ?? 0,
      }
    : violationTypes.find((v) => v.id === vtId);
  const major = issued && (!item || vtId !== item.violation_type_id || (employeeId || null) !== (item.employee_id || null));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? violationTypes.filter((v) => `${v.code} ${v.name} ${v.group_name ?? ""}`.toLowerCase().includes(q))
      : violationTypes;
  }, [query, violationTypes]);
  const matches = filtered.slice(0, MAX_MATCHES);
  const more = filtered.length - matches.length;

  const missing = [
    !vtId && "chọn lỗi vi phạm",
    photos.length === 0 && "thêm ít nhất 1 ảnh",
    major && reasonLength(reason) < MIN_REASON && `ghi lý do sửa (ít nhất ${MIN_REASON} ký tự)`,
  ].filter(Boolean);

  function submit() {
    start(async () => {
      const input = { violation_type_id: vtId, employee_id: employeeId || null, description, evidence_paths: photos };
      const r = issued
        ? await editIssuedItem(ticketId, item?.id ?? null, input, reason)
        : await saveItem(ticketId, item?.id ?? null, input);
      if (!r.ok) return void toast.error(r.error);
      toast.success(issued ? "Đã sửa phiếu, cửa hàng đã được thông báo" : item ? "Đã cập nhật lỗi" : "Đã thêm lỗi");
      onDone();
    });
  }

  return (
    <Panel className="p-5 ring-2 ring-primary/30">
      <p className="mb-5 text-base font-semibold">{item ? "Sửa lỗi" : "Thêm lỗi"}</p>
      <FieldGroup>
        {/* Chọn lỗi */}
        <Field>
          <FieldLabel htmlFor={`vt-search-${formId}`}>Lỗi vi phạm</FieldLabel>
          {selected ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-accent/60 p-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-semibold">
                  <span className="text-muted-foreground">{selected.code}</span> · {selected.name}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <SeverityChip severity={selected.severity} />
                  <span className="tnum font-semibold">{money(selected.amount)}</span>
                  <span className="text-xs text-muted-foreground">đề xuất</span>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="-my-1 shrink-0" onClick={() => setVtId("")} aria-label="Đổi lỗi vi phạm">
                Đổi
              </Button>
            </div>
          ) : (
            <Command shouldFilter={false} className="rounded-lg! border p-0 shadow-xs">
              <CommandInput
                id={`vt-search-${formId}`}
                value={query}
                onValueChange={setQuery}
                placeholder="Tìm theo mã hoặc tên lỗi…"
                enterKeyHint="search"
              />
              <CommandList className="max-h-80 p-1">
                <CommandEmpty>Không tìm thấy lỗi phù hợp.</CommandEmpty>
                {matches.map((v) => (
                  <CommandItem
                    key={v.id}
                    value={v.id}
                    onSelect={() => setVtId(v.id)}
                    className="min-h-11 justify-between gap-3 [&>svg:last-child]:hidden"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        <span className="text-muted-foreground">{v.code}</span> · {v.name}
                      </span>
                      {v.group_name && <span className="block text-xs text-muted-foreground">{v.group_name}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <SeverityChip severity={v.severity} />
                      <span className="tnum text-sm">{money(v.amount)}</span>
                    </span>
                  </CommandItem>
                ))}
                {more > 0 && (
                  <p className="px-2 py-2.5 text-xs text-muted-foreground">Còn {more} lỗi khác — gõ mã hoặc tên để thu hẹp.</p>
                )}
              </CommandList>
            </Command>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor={`emp-${formId}`}>Nhân viên vi phạm</FieldLabel>
          <NativeSelect id={`emp-${formId}`} className="w-full" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <NativeSelectOption value="">Lỗi chung của cửa hàng</NativeSelectOption>
            {employees.map((e) => (
              <NativeSelectOption key={e.id} value={e.id}>
                {e.full_name} ({e.code}){e.position ? ` · ${e.position}` : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor={`desc-${formId}`}>
            Mô tả <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
          </FieldLabel>
          <Textarea
            id={`desc-${formId}`}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: 2 hộp sữa tươi hết hạn 30/10 trong tủ mát"
          />
        </Field>

        <Field>
          <FieldTitle>
            Ảnh minh chứng <span className="font-normal text-muted-foreground">(bắt buộc, tối đa 5)</span>
          </FieldTitle>
          <PhotoPicker
            folder={`tickets/${ticketId}`}
            value={photos}
            onChange={setPhotos}
            urls={urls}
            locked={issued ? item?.evidence_paths : undefined}
          />
          {issued && item && <FieldDescription>Ảnh đã phát hành không xóa được, chỉ thêm ảnh mới.</FieldDescription>}
        </Field>

        {major && (
          <Field>
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <TriangleAlert aria-hidden />
              <AlertDescription className="text-amber-900">
                {item
                  ? "Đổi lỗi hoặc nhân viên sẽ xóa phần giải trình cửa hàng đã soạn cho lỗi này."
                  : "Thêm lỗi vào phiếu đã phát hành."}{" "}
                Hạn giải trình sẽ được gia hạn để còn ít nhất 24 giờ. Cửa hàng sẽ nhận thông báo.
              </AlertDescription>
            </Alert>
            <FieldLabel htmlFor={`reason-${formId}`}>
              Lý do sửa <span className="text-destructive" aria-hidden>*</span>
            </FieldLabel>
            <Textarea
              id={`reason-${formId}`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Chọn nhầm nhân viên ca chiều"
            />
            <FieldDescription className={cn("tnum text-xs", reason && reasonLength(reason) < MIN_REASON && "text-destructive")}>
              {reasonLength(reason) >= MIN_REASON
                ? `${reasonLength(reason)} ký tự`
                : `Cần ít nhất ${MIN_REASON} ký tự (${reasonLength(reason)}/${MIN_REASON})`}
            </FieldDescription>
          </Field>
        )}

        <div className="space-y-3 border-t pt-4">
          {missing.length > 0 && (
            <FieldDescription id={`need-${formId}`}>Cần {missing.join(" và ")} để lưu.</FieldDescription>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              disabled={pending || missing.length > 0}
              aria-describedby={missing.length > 0 ? `need-${formId}` : undefined}
              onClick={submit}
            >
              {pending && <Spinner />} {item ? "Lưu thay đổi" : "Lưu lỗi"}
            </Button>
            {(item || onCancel) && (
              <Button type="button" variant="ghost" onClick={onCancel ?? onDone} disabled={pending}>
                Hủy
              </Button>
            )}
          </div>
        </div>
      </FieldGroup>
    </Panel>
  );
}
