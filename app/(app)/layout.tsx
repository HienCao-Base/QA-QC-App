import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <AppShell
      user={{ id: user.id, full_name: user.full_name, role: user.role, store_name: user.store_name ?? null }}
      unread={count ?? 0}
    >
      {children}
    </AppShell>
  );
}
