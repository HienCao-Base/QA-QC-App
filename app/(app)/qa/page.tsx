import Link from "next/link";
import { ClipboardCheck, FilePen, Hourglass, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/queries";
import { TicketList } from "@/components/ticket-card";
import { PageTitle, Section, StatRow } from "@/components/common";
import { Button } from "@/components/ui/button";

export default async function QaHome() {
  const user = await requireRole("qa");
  const supabase = await createClient();

  const [drafts, toDecide, waiting] = await Promise.all([
    listTickets(supabase, { status: ["draft"], createdBy: user.id }),
    listTickets(supabase, { status: ["pending_decision"], createdBy: user.id, orderBy: "submitted_at", ascending: true }),
    listTickets(supabase, { status: ["pending_explanation"], createdBy: user.id, orderBy: "due_at", ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <PageTitle
          title="Việc của tôi"
          sub="Phiếu cần chốt, phiếu nháp và phiếu đang chờ cửa hàng"
          action={
            <Button asChild className="max-md:hidden">
              <Link href="/phieu/moi">
                <Plus aria-hidden /> Tạo phiếu
              </Link>
            </Button>
          }
        />
        <StatRow
          items={[
            { label: "Cần chốt", count: toDecide.length, href: "#can-chot", urgent: true, icon: <ClipboardCheck /> },
            { label: "Chờ cửa hàng", count: waiting.length, href: "#cho-cua-hang", icon: <Hourglass /> },
            { label: "Phiếu nháp", count: drafts.length, href: "#phieu-nhap", icon: <FilePen /> },
          ]}
        />
      </div>

      <Section id="can-chot" title="Cần chốt" count={toDecide.length}>
        <TicketList tickets={toDecide} empty="Không có phiếu nào chờ chốt." />
      </Section>

      {drafts.length > 0 && (
        <Section id="phieu-nhap" title="Phiếu nháp" count={drafts.length}>
          <TicketList tickets={drafts} empty="" />
        </Section>
      )}

      <Section id="cho-cua-hang" title="Đang chờ cửa hàng giải trình" count={waiting.length}>
        <TicketList tickets={waiting} empty="Không có phiếu nào đang chờ." />
      </Section>
    </div>
  );
}
