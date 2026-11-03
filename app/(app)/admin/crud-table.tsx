"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Pencil, Plus, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions";
import { cn } from "@/lib/format";
import { Empty, Panel } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field as FieldBox, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "textarea" | "checkbox" | "password";
  options?: { value: string; label: string }[];
  required?: boolean;
  inTable?: boolean;
  hint?: string;
  /** Chỉ hiện khi điều kiện đúng (vd: chọn cửa hàng khi role = cht). */
  showIf?: (v: Record<string, unknown>) => boolean;
  format?: (v: unknown, row: Record<string, unknown>) => string;
};

function ActiveBadge({ on }: { on: boolean }) {
  return on ? (
    <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800">
      <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" /> Hoạt động
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/50" /> Ngưng
    </Badge>
  );
}

export function CrudTable({
  title,
  rows,
  fields,
  defaults,
  onSave,
}: {
  title: string;
  rows: Record<string, unknown>[];
  fields: Field[];
  defaults: Record<string, unknown>;
  onSave: (id: string | null, values: Record<string, unknown>) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [query, setQuery] = useState("");
  const cols = fields.filter((f) => f.inTable);
  const textCols = cols.filter((c) => c.type !== "checkbox");
  const activeCol = cols.find((c) => c.type === "checkbox");

  const cell = (c: Field, r: Record<string, unknown>) => (c.format ? c.format(r[c.key], r) : String(r[c.key] ?? ""));
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => cols.some((c) => cell(c, r).toLowerCase().includes(q))) : rows;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <InputGroup className="max-w-sm flex-1">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder={`Tìm trong ${title.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Tìm trong ${title.toLowerCase()}`}
          />
        </InputGroup>
        <Button type="button" className="ml-auto shrink-0" onClick={() => setEditing({ ...defaults })}>
          <Plus aria-hidden /> Thêm
        </Button>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        <span className="tnum">{shown.length}</span>
        {q ? ` / ${rows.length}` : ""} mục
      </p>

      {shown.length === 0 ? (
        <Empty icon={<SearchX />}>Không có dữ liệu.</Empty>
      ) : (
        <>
          {/* Điện thoại: danh sách */}
          <Panel className="md:hidden">
            <ul className="divide-y">
              {shown.map((r) => (
                <li key={String(r.id)}>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                  >
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="block truncate text-sm font-medium">
                        {textCols.slice(0, 2).map((c) => cell(c, r)).filter(Boolean).join(" · ")}
                      </span>
                      {textCols.length > 2 && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {textCols.slice(2).map((c) => cell(c, r)).filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    {activeCol && <ActiveBadge on={!!r[activeCol.key]} />}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Màn hình rộng: bảng */}
          <Panel className="max-md:hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  {cols.map((c) => (
                    <TableHead key={c.key} className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-12">
                    <span className="sr-only">Thao tác</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((r) => (
                  <TableRow key={String(r.id)}>
                    {cols.map((c, i) => (
                      <TableCell key={c.key} className={cn("px-4 py-2.5 whitespace-normal", i === 0 && "font-medium")}>
                        {c.type === "checkbox" ? <ActiveBadge on={!!r[c.key]} /> : cell(c, r)}
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-1 text-right">
                      <Button type="button" variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label="Sửa">
                        <Pencil aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </>
      )}

      <Sheet
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      >
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {editing && (
            <EditForm
              key={String(editing.id ?? "new")}
              title={title}
              fields={fields}
              initial={editing}
              onCancel={() => setEditing(null)}
              onSave={async (values) => {
                const r = await onSave((editing.id as string) ?? null, values);
                if (r.ok) {
                  toast.success("Đã lưu");
                  setEditing(null);
                } else toast.error(r.error);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EditForm({
  title,
  fields,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, unknown>;
  onSave: (v: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [pending, start] = useTransition();
  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));
  const isNew = !initial.id;

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => onSave(values));
      }}
    >
      <SheetHeader className="border-b pt-[max(1rem,env(safe-area-inset-top))]">
        <SheetTitle>{isNew ? `Thêm ${title.toLowerCase()}` : `Sửa ${title.toLowerCase()}`}</SheetTitle>
        <SheetDescription>Các ô có dấu * là bắt buộc.</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <FieldGroup className="gap-4">
          {fields
            .filter((f) => !f.showIf || f.showIf(values))
            .map((f) => {
              const id = `f-${f.key}`;
              const v = values[f.key];
              if (f.type === "checkbox")
                return (
                  <FieldBox key={f.key} orientation="horizontal" className="rounded-lg border p-3">
                    <FieldContent>
                      <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
                    </FieldContent>
                    <Switch id={id} checked={!!v} onCheckedChange={(c) => set(f.key, c)} />
                  </FieldBox>
                );
              return (
                <FieldBox key={f.key}>
                  <FieldLabel htmlFor={id}>
                    {f.label} {f.required && <span className="text-destructive" aria-hidden>*</span>}
                  </FieldLabel>
                  {f.type === "select" ? (
                    <NativeSelect
                      id={id}
                      className="w-full"
                      value={String(v ?? "")}
                      required={f.required}
                      onChange={(e) => set(f.key, e.target.value)}
                    >
                      <NativeSelectOption value="">—</NativeSelectOption>
                      {f.options?.map((o) => (
                        <NativeSelectOption key={o.value} value={o.value}>
                          {o.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  ) : f.type === "textarea" ? (
                    <Textarea id={id} rows={3} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
                  ) : (
                    <Input
                      id={id}
                      className={f.type === "number" ? "tnum" : undefined}
                      type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
                      min={f.type === "number" ? 0 : undefined}
                      step={f.type === "number" ? 1000 : undefined}
                      value={String(v ?? "")}
                      required={f.required && !(f.type === "password" && !isNew)}
                      autoComplete={f.type === "password" ? "new-password" : "off"}
                      autoFocus={f === fields[0]}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}
                  {f.hint && <FieldDescription className="text-xs">{f.hint}</FieldDescription>}
                </FieldBox>
              );
            })}
        </FieldGroup>
      </div>

      <SheetFooter className="flex-row border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button className="flex-1" disabled={pending}>
          {pending && <Spinner />} Lưu
        </Button>
      </SheetFooter>
    </form>
  );
}
