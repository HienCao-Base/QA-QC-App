"use client";

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type FilterValues = { status: string; store: string; from: string; to: string; code: string };
type Store = { id: string; code: string; name: string };

/** Giữ các bộ lọc không nằm trong form hiện tại khi gửi form GET. */
function Keep({ f, keys }: { f: FilterValues; keys: (keyof FilterValues)[] }) {
  return keys.map((k) => (f[k] ? <input key={k} type="hidden" name={k} value={f[k]} /> : null));
}

function StoreAndDates({ f, stores, showStore, prefix }: { f: FilterValues; stores: Store[]; showStore: boolean; prefix: string }) {
  return (
    <>
      {showStore && (
        <Field>
          <FieldLabel htmlFor={`${prefix}-store`}>Cửa hàng</FieldLabel>
          <NativeSelect id={`${prefix}-store`} name="store" defaultValue={f.store} className="w-full">
            <NativeSelectOption value="">Tất cả cửa hàng</NativeSelectOption>
            {stores.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.code} · {s.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field>
        <FieldLabel htmlFor={`${prefix}-from`}>Từ ngày</FieldLabel>
        <Input id={`${prefix}-from`} type="date" name="from" defaultValue={f.from} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${prefix}-to`}>Đến ngày</FieldLabel>
        <Input id={`${prefix}-to`} type="date" name="to" defaultValue={f.to} />
      </Field>
    </>
  );
}

/**
 * Bộ lọc danh sách phiếu (form GET). Trạng thái lọc bằng các nút phía trên danh sách.
 * Điện thoại: ô tìm mã phiếu + nút "Lọc" mở bảng trượt từ dưới lên.
 * Màn hình rộng: một hàng bộ lọc đầy đủ.
 */
export function Filters({
  f,
  stores,
  showStore,
  activeCount,
  hasAny,
}: {
  f: FilterValues;
  stores: Store[];
  showStore: boolean;
  /** Số bộ lọc đang bật trong bảng trượt (cửa hàng, ngày). */
  activeCount: number;
  hasAny: boolean;
}) {
  const codeInput = (id: string) => (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        name="code"
        defaultValue={f.code}
        placeholder="Tìm mã phiếu, VD: QC-…"
        enterKeyHint="search"
        aria-label="Mã phiếu"
      />
    </InputGroup>
  );

  return (
    <>
      {/* Điện thoại */}
      <div className="flex gap-2 sm:hidden">
        <form className="min-w-0 flex-1">
          <Keep f={f} keys={["status", "store", "from", "to"]} />
          {codeInput("m-code")}
        </form>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <SlidersHorizontal aria-hidden />
              Lọc
              {activeCount > 0 && (
                <Badge className="tnum h-5 min-w-5 rounded-full px-1.5" aria-label={`${activeCount} bộ lọc đang bật`}>
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetHeader className="pb-0">
              <SheetTitle>Lọc phiếu</SheetTitle>
              <SheetDescription>Theo cửa hàng và khoảng ngày phát hành.</SheetDescription>
            </SheetHeader>
            <form className="flex flex-col gap-4 overflow-y-auto px-4">
              <Keep f={f} keys={["status", "code"]} />
              <StoreAndDates f={f} stores={stores} showStore={showStore} prefix="m" />
              <SheetFooter className="flex-row px-0">
                {hasAny && (
                  <Button variant="outline" asChild className="flex-1">
                    <Link href="/phieu">Xóa lọc</Link>
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  Áp dụng
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Màn hình rộng */}
      <Card className="py-4 shadow-xs max-sm:hidden">
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <Keep f={f} keys={["status"]} />
            <Field className="min-w-48 flex-[2]">
              <FieldLabel htmlFor="d-code">Mã phiếu</FieldLabel>
              {codeInput("d-code")}
            </Field>
            <div className={showStore ? "grid flex-[5] grid-cols-3 gap-3" : "grid flex-[3] grid-cols-2 gap-3"}>
              <StoreAndDates f={f} stores={stores} showStore={showStore} prefix="d" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Áp dụng</Button>
              {hasAny && (
                <Button variant="ghost" asChild>
                  <Link href="/phieu">Xóa lọc</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
