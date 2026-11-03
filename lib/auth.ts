import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export const USERNAME_DOMAIN = "qaqc.example.com";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

/** Người dùng hiện tại (đọc 1 lần mỗi request). Chưa đăng nhập -> /login. */
export const getCurrentUser = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, role, store_id, employee_id, active, stores(name)")
    .eq("id", auth.user.id)
    .single();

  if (!profile || !profile.active) redirect("/login?error=inactive");
  const store = profile.stores as unknown as { name: string } | null;
  return {
    id: profile.id,
    username: profile.username,
    full_name: profile.full_name,
    role: profile.role as Role,
    store_id: profile.store_id,
    store_name: store?.name ?? null,
    employee_id: profile.employee_id,
    active: profile.active,
  };
});

export async function requireRole(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) redirect("/");
  return user;
}
