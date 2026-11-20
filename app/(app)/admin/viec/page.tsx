import { Gavel } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/queries";
import { TicketList } from "@/components/ticket-card";
import { PageTitle, Section, StatRow } from "@/components/common";

export default async function AdminTasks() {
  await requireRole("admin");
  const supabase = await createClient();

  const appeals = await listTickets(supabase, {
    appealPending: true,
    status: ["locked"],
    orderBy: "locked_at",
    ascending: true,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <PageTitle title="Việc của tôi" sub="Khiếu nại của cửa hàng đang chờ Admin xử lý" />
        <StatRow
          items={[{ label: "Khiếu nại chờ xử lý", count: appeals.length, href: "#khieu-nai", urgent: true, icon: <Gavel /> }]}
        />
      </div>

      <Section id="khieu-nai" title="Khiếu nại chờ xử lý" count={appeals.length}>
        <TicketList tickets={appeals} empty="Không có khiếu nại nào chờ xử lý." />
      </Section>
    </div>
  );
}
