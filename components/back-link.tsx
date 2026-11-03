"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Số lần chuyển trang bên trong app kể từ lần tải trang gần nhất.
// Biến cấp module: giữ nguyên khi điều hướng phía client, về 0 khi tải lại trang.
let inAppNavigations = 0;
let lastPath: string | null = null;

/** Gọi một lần trong layout để đếm số lần chuyển trang. */
export function useTrackNavigation() {
  const path = usePathname();
  useEffect(() => {
    if (path === lastPath) return;
    if (lastPath !== null) inAppNavigations += 1;
    lastPath = path;
  }, [path]);
}

/**
 * "Quay lại" về đúng trang trước (giữ bộ lọc, vị trí cuộn).
 * Nếu trang được mở trực tiếp (từ link chia sẻ, tab mới…) thì về trang chủ theo vai trò.
 */
export function BackLink() {
  const router = useRouter();
  return (
    <Button asChild variant="ghost" className="-ml-3 text-muted-foreground hover:text-foreground">
      <Link
        href="/"
        onClick={(e) => {
          if (inAppNavigations > 0) {
            e.preventDefault();
            router.back();
          }
        }}
      >
        <ArrowLeft aria-hidden /> Quay lại
      </Link>
    </Button>
  );
}
