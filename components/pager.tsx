import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";

/**
 * Phân trang. Dùng được ở server (truyền `href`, mỗi trang là một link giữ nguyên bộ lọc trên URL)
 * và ở client (truyền `onPage`, đổi trang trong bộ nhớ). Không vẽ gì khi chỉ có 1 trang.
 */
export function Pager({
  page,
  pages,
  total,
  size,
  unit,
  href,
  onPage,
  className,
}: {
  /** Trang hiện tại, bắt đầu từ 1 */
  page: number;
  pages: number;
  total: number;
  size: number;
  /** "phiếu", "thông báo", "mục" */
  unit: string;
  href?: (page: number) => string;
  onPage?: (page: number) => void;
  className?: string;
}) {
  if (pages <= 1) return null;
  const first = (page - 1) * size + 1;
  const last = Math.min(page * size, total);

  const go = (p: number, label: React.ReactNode, opts: { current?: boolean; aria?: string; className?: string } = {}) => {
    const disabled = p < 1 || p > pages;
    const common = {
      variant: opts.current ? ("default" as const) : ("outline" as const),
      className: cn("tnum min-w-11 px-3 sm:min-w-9", opts.className),
    };
    if (disabled || opts.current)
      return (
        <Button {...common} type="button" disabled={disabled} aria-current={opts.current ? "page" : undefined} aria-label={opts.aria}>
          {label}
        </Button>
      );
    if (href)
      return (
        <Button {...common} asChild>
          <Link href={href(p)} aria-label={opts.aria} scroll>
            {label}
          </Link>
        </Button>
      );
    return (
      <Button
        {...common}
        type="button"
        aria-label={opts.aria}
        onClick={() => {
          onPage?.(p);
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <nav aria-label="Phân trang" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="tnum text-sm text-muted-foreground">
        {first}–{last} / {total} {unit}
      </p>
      <ul className="flex items-center gap-1.5">
        <li>{go(page - 1, <ChevronLeft aria-hidden />, { aria: "Trang trước" })}</li>
        {/* Điện thoại: chỉ "2 / 7"; máy tính: các số trang */}
        <li className="tnum px-2 text-sm font-medium sm:hidden">
          {page} / {pages}
        </li>
        {pageList(page, pages).map((p, i) => (
          <li key={i} className="max-sm:hidden">
            {p === null ? (
              <span className="px-1 text-muted-foreground" aria-hidden>
                …
              </span>
            ) : (
              go(p, p, { current: p === page, aria: `Trang ${p}` })
            )}
          </li>
        ))}
        <li>{go(page + 1, <ChevronRight aria-hidden />, { aria: "Trang sau" })}</li>
      </ul>
    </nav>
  );
}

/** 1 … 4 5 6 … 20 (null = dấu …) */
export function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const out: (number | null)[] = [];
  let prev = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (p - prev === 2) out.push(prev + 1);
    else if (p - prev > 2) out.push(null);
    out.push(p);
    prev = p;
  }
  return out;
}
