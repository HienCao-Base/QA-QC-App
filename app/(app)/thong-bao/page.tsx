import { BellOff, CheckCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime, cn } from "@/lib/format";
import { markAllRead, openNotification } from "@/app/actions";
import { Empty, PageTitle, Panel } from "@/components/common";
import { Button } from "@/components/ui/button";

export default async function Notifications() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, message, ticket_id, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const unread = data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div>
      <PageTitle
        title="Thông báo"
        sub={unread ? `${unread} chưa đọc` : "Đã đọc hết"}
        action={
          unread > 0 && (
            <form action={markAllRead}>
              <Button variant="outline">
                <CheckCheck aria-hidden /> Đánh dấu đã đọc
              </Button>
            </form>
          )
        }
      />
      {data?.length ? (
        <Panel>
          <ul className="divide-y">
            {data.map((n) => {
              const cls = cn("flex gap-3 px-4 py-3.5", !n.read_at && "bg-accent/40");
              const body = (
                <>
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")}
                  />
                  <span className="min-w-0 space-y-0.5">
                    {!n.read_at && <span className="sr-only">Chưa đọc: </span>}
                    <span className={cn("block text-sm", !n.read_at ? "font-semibold" : "text-foreground/90")}>{n.message}</span>
                    <span className="tnum block text-xs text-muted-foreground">{dateTime(n.created_at)}</span>
                  </span>
                </>
              );
              // Chưa đọc hoặc có phiếu liên quan: bấm -> đánh dấu đã đọc (server) rồi mở phiếu.
              const clickable = !n.read_at || n.ticket_id;
              return (
                <li key={n.id}>
                  {clickable ? (
                    <form action={openNotification.bind(null, n.id, n.ticket_id)}>
                      <button
                        className={cn(
                          cls,
                          "w-full text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        )}
                      >
                        {body}
                      </button>
                    </form>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <Empty icon={<BellOff />}>Chưa có thông báo nào.</Empty>
      )}
    </div>
  );
}
