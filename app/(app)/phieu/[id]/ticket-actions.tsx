"use client";

import { Ban, RotateCcw } from "lucide-react";
import { cancelTicket, reopenTicket } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { MIN_REASON } from "@/lib/format";

export function TicketActions({ ticketId, canCancel, canReopen }: { ticketId: string; canCancel: boolean; canReopen: boolean }) {
  if (!canCancel && !canReopen) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canCancel && (
        <ConfirmButton
          label={
            <>
              <Ban aria-hidden /> Hủy phiếu (phát hành nhầm)
            </>
          }
          title="Hủy phiếu này?"
          variant="outline"
          className="text-destructive hover:text-destructive"
          confirmVariant="destructive"
          confirmLabel="Hủy phiếu"
          confirmText="Cửa hàng sẽ nhận được thông báo hủy. Không hoàn tác được."
          reasonLabel="Lý do hủy"
          minReason={MIN_REASON}
          successText="Đã hủy phiếu"
          onConfirm={(reason) => cancelTicket(ticketId, reason)}
        />
      )}
      {canReopen && (
        <ConfirmButton
          label={
            <>
              <RotateCcw aria-hidden /> Mở lại phiếu
            </>
          }
          title="Mở lại phiếu?"
          variant="outline"
          confirmLabel="Mở lại"
          confirmText="Phiếu sẽ quay về trạng thái Chờ chốt để QA chốt lại."
          reasonLabel="Lý do mở lại"
          minReason={MIN_REASON}
          successText="Đã mở lại phiếu"
          onConfirm={(reason) => reopenTicket(ticketId, reason)}
        />
      )}
    </div>
  );
}
