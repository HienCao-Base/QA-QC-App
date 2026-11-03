import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Section } from "@/components/common";
import { listTickets } from "@/lib/queries";
import { TicketList } from "@/components/ticket-card";
import { cn } from "@/lib/format";
import { AdminTabs } from "./tabs";

const TABS = [
  { key: "accounts", label: "Tài khoản" },
  { key: "stores", label: "Cửa hàng" },
  { key: "employees", label: "Nhân viên" },
  { key: "violations", label: "Danh mục lỗi" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export default async function AdminPage(props: PageProps<"/admin">) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "accounts") as TabKey;
  const supabase = await createClient();

  const [{ data: stores }, { data: employees }, appeals] = await Promise.all([
    supabase.from("stores").select("*").order("code"),
    supabase.from("employees").select("*").order("code"),
    listTickets(supabase, { appealPending: true, status: ["locked"], orderBy: "locked_at", ascending: true }),
  ]);
  const data =
    tab === "accounts" ? (await supabase.from("profiles").select("*").order("role").order("username")).data
    : tab === "employees" ? employees
    : tab === "violations" ? (await supabase.from("violation_types").select("*").order("code")).data
    : stores;

  return (
    <div className="space-y-4">
      <PageTitle title="Quản trị" sub="Khiếu nại, tài khoản và dữ liệu nền" />
      {appeals.length > 0 && (
        <div className="pb-4">
          <Section title="Khiếu nại chờ xử lý" count={appeals.length}>
            <TicketList tickets={appeals} empty="" />
          </Section>
        </div>
      )}
      <nav aria-label="Danh mục quản trị" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition-colors sm:h-8",
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
        </div>
      </nav>
      <AdminTabs tab={tab} rows={data ?? []} stores={stores ?? []} employees={employees ?? []} />
    </div>
  );
}
