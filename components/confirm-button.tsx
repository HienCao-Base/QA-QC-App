"use client";

import { useId, useState, useTransition } from "react";
import type { VariantProps } from "class-variance-authority";
import { toast } from "sonner";
import type { ActionResult } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn, reasonLength } from "@/lib/format";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type Variant = VariantProps<typeof buttonVariants>["variant"];

/**
 * Nút thao tác có hộp thoại xác nhận.
 * Nếu `reasonLabel` có giá trị thì bắt buộc nhập lý do trước khi xác nhận.
 */
export function ConfirmButton({
  label,
  title,
  confirmText,
  confirmLabel = "Xác nhận",
  reasonLabel,
  variant = "default",
  size,
  className,
  confirmVariant,
  successText,
  disabled,
  minReason = 1,
  onConfirm,
}: {
  label: React.ReactNode;
  /** Tiêu đề hộp thoại; mặc định lấy theo nhãn nút nếu là chữ. */
  title?: string;
  confirmText: string;
  confirmLabel?: string;
  reasonLabel?: string;
  variant?: Variant;
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  /** Kiểu nút "Xác nhận"; mặc định giống nút mở. Dùng "destructive" cho thao tác xóa / hủy. */
  confirmVariant?: Variant;
  successText: string;
  disabled?: boolean;
  /** Lý do phải dài tối thiểu bao nhiêu ký tự (khớp kiểm tra trong SQL). */
  minReason?: number;
  onConfirm: (reason: string) => Promise<ActionResult | void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const id = useId();
  const len = reasonLength(reason);
  const reasonOk = !reasonLabel || len >= minReason;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!pending) setOpen(o);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className} disabled={disabled}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? (typeof label === "string" ? `${label}?` : "Xác nhận thao tác")}</AlertDialogTitle>
          <AlertDialogDescription>{confirmText}</AlertDialogDescription>
        </AlertDialogHeader>
        {reasonLabel && (
          <Field>
            <FieldLabel htmlFor={`${id}-reason`}>
              {reasonLabel} <span className="text-destructive" aria-hidden>*</span>
            </FieldLabel>
            <Textarea
              id={`${id}-reason`}
              rows={3}
              autoFocus
              required
              value={reason}
              aria-describedby={minReason > 1 ? `${id}-count` : undefined}
              onChange={(e) => setReason(e.target.value)}
            />
            {minReason > 1 && (
              <FieldDescription id={`${id}-count`} className={cn("tnum text-xs", len > 0 && !reasonOk && "text-destructive")}>
                {reasonOk ? `${len} ký tự` : `Cần ít nhất ${minReason} ký tự (${len}/${minReason})`}
              </FieldDescription>
            )}
          </Field>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Quay lại</AlertDialogCancel>
          <Button
            type="button"
            variant={confirmVariant ?? (variant === "outline" || variant === "ghost" ? "default" : variant)}
            disabled={pending || !reasonOk}
            onClick={() =>
              start(async () => {
                const r = await onConfirm(reason);
                if (r && !r.ok) toast.error(r.error);
                else {
                  toast.success(successText);
                  setOpen(false);
                  setReason("");
                }
              })
            }
          >
            {pending && <Spinner />} {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
