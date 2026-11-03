"use client";

import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

// Đồng hồ dùng chung, cập nhật mỗi 30 giây; trên server trả null để tránh lệch khi hydrate.
const TICK = 30_000;
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
};
const getNow = () => Math.floor(Date.now() / TICK) * TICK;

/** Đếm ngược tới hạn giải trình. Xám > 24h, vàng 4–24h, đỏ < 4h, nền đỏ khi quá hạn. */
export function Countdown({ dueAt, compact }: { dueAt: string; compact?: boolean }) {
  const now = useSyncExternalStore(subscribe, getNow, () => null);

  if (now == null)
    return (
      <Badge variant="outline" className="text-muted-foreground">
        …
      </Badge>
    );

  const ms = new Date(dueAt).getTime() - now;
  const h = ms / 3_600_000;
  const style =
    ms <= 0 ? "border-transparent bg-rose-600 text-white"
    : h < 4 ? "border-rose-200 bg-rose-50 text-rose-700"
    : h < 24 ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-border bg-muted text-muted-foreground";

  let text: string;
  if (ms <= 0) text = "Quá hạn";
  else {
    const hh = Math.floor(h);
    const mm = Math.floor((ms % 3_600_000) / 60_000);
    text = `${compact ? "" : "Còn "}${hh}h ${String(mm).padStart(2, "0")}p`;
  }
  return (
    <Badge variant="outline" className={cn("tnum", style)}>
      <Clock aria-hidden />
      {text}
    </Badge>
  );
}
