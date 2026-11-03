import { Hourglass, MessageSquareWarning } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/queries";
import { TicketList } from "@/components/ticket-card";
import { PageTitle, Section, StatRow } from "@/components/common";

export default async function NvHome() {
  const user = await requireRole("nv");
  const supabase = await createClient();

  const [pending, recent] = await Promise.all([
    listTickets(supabase, { status: ["pending_explanation"], storeId: user.store_id!, orderBy: "due_at", ascending: true }),
    listTickets(supabase, { status: ["pending_decision", "locked"], storeId: user.store_id!, limit: 30 }),
  ]);

  const mine = (t: (typeof pending)[number]) => t.items.some((i) => i.employee_id === user.employee_id);
  const todo = pending.filter((t) => mine(t) && t.items.some((i) => i.employee_id === user.employee_id && !i.explained_by));
  const drafted = pending.filter((t) => mine(t) && !todo.includes(t));
  const myRecent = recent.filter(mine).slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <PageTitle title="Việc của tôi" sub={`Lỗi của bạn tại ${user.store_name}`} />
        <StatRow
          items={[
            { label: "Cần giải trình", count: todo.length, href: "#can-giai-trinh", urgent: true, icon: <MessageSquareWarning /> },
            { label: "Chờ CHT gửi", count: drafted.length, href: "#cho-cht-gui", icon: <Hourglass /> },
          ]}
        />
      </div>

      <Section id="can-giai-trinh" title="Lỗi của tôi cần giải trình" count={todo.length}>
        <TicketList tickets={todo} showStore={false} empty="Bạn không có lỗi nào cần giải trình." />
      </Section>

      {drafted.length > 0 && (
        <Section id="cho-cht-gui" title="Đã soạn, chờ cửa hàng trưởng gửi" count={drafted.length}>
          <TicketList tickets={drafted} showStore={false} empty="" />
        </Section>
      )}

      <Section title="Phiếu có lỗi của tôi gần đây">
        <TicketList tickets={myRecent} showStore={false} empty="Chưa có phiếu nào." />
      </Section>
    </div>
  );
}
