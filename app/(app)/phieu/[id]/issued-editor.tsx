"use client";

import { useState } from "react";
import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteIssuedItem } from "@/app/actions";
import { ExplanationView, ItemHeader, type ItemFull } from "@/components/item-summary";
import { ConfirmButton } from "@/components/confirm-button";
import { Panel } from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Employee, ViolationType } from "@/lib/types";
import { MIN_REASON } from "@/lib/format";
import { ItemForm } from "./draft-editor";

/**
 * QA lập phiếu xem và sửa phiếu đang chờ giải trình.
 * Quy tắc (lý do bắt buộc, đặt lại giải trình, gia hạn 24h, không xóa ảnh) do hàm SQL kiểm tra.
 */
export function IssuedEditor({
  ticketId,
  items,
  urls,
  violationTypes,
  employees,
}: {
  ticketId: string;
  items: ItemFull[];
  urls: Record<string, string>;
  violationTypes: ViolationType[];
  employees: Employee[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-3">
      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          Đang chờ cửa hàng giải trình. Bạn vẫn sửa được phiếu cho đến khi cửa hàng bấm Gửi. Đổi lỗi, đổi nhân viên,
          thêm hoặc xóa lỗi cần ghi lý do; cửa hàng sẽ được thông báo và có ít nhất 24 giờ để giải trình lại.
        </AlertDescription>
      </Alert>

      {items.map((it, idx) =>
        editing === it.id ? (
          <ItemForm
            key={it.id}
            mode="issued"
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
            <ExplanationView item={it} urls={urls} />
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button type="button" variant="outline" disabled={editing !== null} onClick={() => setEditing(it.id)}>
                <Pencil aria-hidden /> Sửa
              </Button>
              {items.length > 1 && (
                <ConfirmButton
                  label={
                    <>
                      <Trash2 aria-hidden /> Xóa
                    </>
                  }
                  title={`Xóa lỗi ${idx + 1} khỏi phiếu?`}
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={editing !== null}
                  confirmVariant="destructive"
                  confirmLabel="Xóa lỗi"
                  confirmText="Phiếu đã phát hành: cửa hàng sẽ nhận thông báo, hạn giải trình còn ít nhất 24 giờ. Thao tác được ghi vào lịch sử phiếu."
                  reasonLabel="Lý do xóa"
                  minReason={MIN_REASON}
                  successText="Đã xóa lỗi, cửa hàng đã được thông báo"
                  onConfirm={(reason) => deleteIssuedItem(ticketId, it.id, reason)}
                />
              )}
            </div>
          </Panel>
        ),
      )}

      {editing === "new" ? (
        <ItemForm
          mode="issued"
          ticketId={ticketId}
          urls={urls}
          violationTypes={violationTypes}
          employees={employees}
          onDone={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={editing !== null}
          className="w-full border-dashed bg-transparent text-muted-foreground shadow-none hover:border-primary hover:text-primary"
          onClick={() => setEditing("new")}
        >
          <Plus aria-hidden /> Thêm lỗi
        </Button>
      )}
    </div>
  );
}
