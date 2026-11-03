"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Nội dung dùng chung cho các file error.tsx. */
export function ErrorView({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  return (
    <Empty role="alert" className="border bg-card py-12 shadow-xs">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-11 rounded-full bg-amber-100 text-amber-700 [&_svg:not([class*='size-'])]:size-5">
          <WifiOff aria-hidden />
        </EmptyMedia>
        <EmptyTitle className="text-base">Không tải được trang</EmptyTitle>
        <EmptyDescription>
          Có thể do mạng yếu hoặc máy chủ đang bận. Dữ liệu đã lưu trước đó không bị mất.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => retry()}>
            <RotateCw aria-hidden /> Thử lại
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Về trang chủ</Link>
          </Button>
        </div>
        {digest && <p className="tnum text-xs text-muted-foreground">Mã lỗi: {digest}</p>}
      </EmptyContent>
    </Empty>
  );
}
