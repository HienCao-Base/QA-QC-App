import { Hourglass, MessageSquareWarning } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/queries";
import { TicketList } from "@/components/ticket-card";
import { PageTitle, Section, StatRow } from "@/components/common";

export default async function ChtHome() {
  const user = await requireRole("cht");
  const supabase = await createClient();

  const [todo, waiting, recent] = await Promise.all([
    listTickets(supabase, { status: ["pending_explanation"], storeId: user.store_id!, orderBy: "due_at", ascending: true }),
    listTickets(supabase, { status: ["pending_decision"], storeId: user.store_id!, orderBy: "submitted_at" }),
    listTickets(supabase, { status: ["locked"], storeId: user.store_id!, limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <PageTitle title="Việc của tôi" sub={`Phiếu lỗi của ${user.store_name}`} />
        <StatRow
          items={[
            { label: "Cần giải trình", count: todo.length, href: "#can-giai-trinh", urgent: true, icon: <MessageSquareWarning /> },
            { label: "Chờ QA chốt", count: waiting.length, href: "#cho-qa-chot", icon: <Hourglass /> },
          ]}
        />
      </div>

      <Section id="can-giai-trinh" title="Cần giải trình" count={todo.length}>
        <TicketList tickets={todo} showStore={false} empty="Cửa hàng không có phiếu nào cần giải trình." />
      </Section>

      {waiting.length > 0 && (
        <Section id="cho-qa-chot" title="Đã gửi, chờ QA chốt" count={waiting.length}>
          <TicketList tickets={waiting} showStore={false} empty="" />
        </Section>
      )}

      <Section title="Đã khóa gần đây">
        <TicketList tickets={recent} showStore={false} empty="Chưa có phiếu nào." />
      </Section>
    </div>
  );
}
