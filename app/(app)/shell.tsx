"use client";

import { createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell as BellIcon,
  ClipboardList,
  FileText,
  House,
  LogOut,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions";
import { ROLE_LABEL, cn } from "@/lib/format";
import type { Role } from "@/lib/types";
import { useTrackNavigation } from "@/components/back-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { href: string; label: string; short: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  qa: [
    { href: "/qa", label: "Việc của tôi", short: "Việc", icon: House },
    { href: "/phieu", label: "Tất cả phiếu", short: "Phiếu", icon: FileText },
    { href: "/phieu/moi", label: "Tạo phiếu", short: "Tạo phiếu", icon: Plus },
  ],
  cht: [
    { href: "/cht", label: "Việc của tôi", short: "Việc", icon: House },
    { href: "/phieu", label: "Phiếu cửa hàng", short: "Phiếu", icon: FileText },
  ],
  nv: [
    { href: "/nv", label: "Việc của tôi", short: "Việc", icon: House },
    { href: "/phieu", label: "Phiếu cửa hàng", short: "Phiếu", icon: FileText },
  ],
  admin: [
    { href: "/admin", label: "Quản trị", short: "Quản trị", icon: Settings },
    { href: "/phieu", label: "Tất cả phiếu", short: "Phiếu", icon: ClipboardList },
  ],
};

const isActive = (path: string, href: string) =>
  path === href || (href !== "/phieu" && path.startsWith(href + "/")) || (href === "/phieu" && /^\/phieu\/(?!moi)/.test(path));

/** Trang chi tiết / tạo phiếu có thanh nút riêng ở đáy nên ẩn thanh tab. */
const hidesTabBar = (path: string) => path.startsWith("/phieu/");

// ---------- Số thông báo chưa đọc (Supabase Realtime), dùng chung cho header và thanh tab ----------

const UnreadContext = createContext(0);

/**
 * Số chưa đọc luôn lấy từ server (layout đếm lại mỗi lần đọc / đánh dấu đã đọc).
 * Có thông báo mới qua Realtime: hiện toast rồi làm mới trang để server đếm lại —
 * không tự cộng ở trình duyệt, tránh lệch số với server.
 */
function useUnreadCount(userId: string, count: number) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      // Phải gắn phiên đăng nhập cho kênh realtime TRƯỚC khi đăng ký; nếu không kênh chạy
      // như khách chưa đăng nhập và RLS chặn mọi thông báo.
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel("notif-" + userId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            toast.info((payload.new as { message: string }).message);
            router.refresh();
          },
        )
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return count;
}

function CountDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "tnum absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-background",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function BellButton({ className }: { className?: string }) {
  const count = useContext(UnreadContext);
  return (
    <Button asChild variant="ghost" size="icon" className={cn("relative rounded-full", className)}>
      <Link href="/thong-bao" aria-label={`Thông báo, ${count} chưa đọc`}>
        <BellIcon className="size-5" aria-hidden />
        <CountDot count={count} className="-top-0.5 -right-0.5" />
      </Link>
    </Button>
  );
}

// ---------- Khung app ----------

export type ShellUser = { id: string; full_name: string; role: Role; store_name: string | null };

/** "Nguyễn Văn An (QA)" -> "VA": bỏ phần trong ngoặc và ký tự không phải chữ, lấy 2 chữ cuối của tên. */
const initials = (name: string) => {
  const w = name
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .map((x) => x.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  if (w.length === 0) return "?";
  return (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase();
};

export function AppShell({ user, unread, children }: { user: ShellUser; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const count = useUnreadCount(user.id, unread);
  useTrackNavigation();
  const items = NAV[user.role];
  const tabBar = !hidesTabBar(path);

  return (
    <UnreadContext.Provider value={count}>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-safe">
            <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Trang chủ">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-lg bg-primary text-[13px] font-bold tracking-tight text-primary-foreground shadow-sm"
              >
                QC
              </span>
              <span className="hidden text-sm font-semibold sm:block">Phiếu lỗi QA/QC</span>
            </Link>

            <nav aria-label="Điều hướng chính" className="ml-4 hidden items-center gap-1 md:flex">
              {items.map((i) => {
                const active = isActive(path, i.href);
                return (
                  <Link
                    key={i.href}
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <i.icon className="size-4" aria-hidden />
                    {i.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <BellButton className={cn(tabBar && "max-md:hidden")} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-11 gap-2 rounded-full px-1 sm:h-9 sm:pr-3 sm:pl-1" aria-label="Tài khoản">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {initials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user.full_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ROLE_LABEL[user.role]}
                      {user.store_name ? ` · ${user.store_name}` : ""}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="min-h-11 sm:min-h-9">
                    <Link href="/thong-bao">
                      <BellIcon aria-hidden /> Thông báo
                      {count > 0 && <span className="tnum ml-auto text-xs text-muted-foreground">{count}</span>}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-11 sm:min-h-9"
                    onSelect={() => {
                      void signOut();
                    }}
                  >
                    <LogOut aria-hidden /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className={cn("mx-auto max-w-4xl px-safe pt-6 pb-16", tabBar && "max-md:pb-28")}>{children}</main>

        {tabBar && (
          <nav
            aria-label="Điều hướng chính"
            className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden"
          >
            <ul className="mx-auto flex max-w-md px-safe">
              {[...items, { href: "/thong-bao", label: "Thông báo", short: "Thông báo", icon: BellIcon }].map((i) => {
                const active = isActive(path, i.href);
                const notif = i.href === "/thong-bao";
                return (
                  <li key={i.href} className="flex-1">
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={notif ? `Thông báo, ${count} chưa đọc` : undefined}
                      className={cn(
                        "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "relative grid h-7 w-14 place-items-center rounded-full transition-colors",
                          active && "bg-accent",
                        )}
                      >
                        <i.icon className="size-5" aria-hidden strokeWidth={active ? 2.25 : 2} />
                        {notif && <CountDot count={count} className="-top-1 right-1.5" />}
                      </span>
                      {i.short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </UnreadContext.Provider>
  );
}
