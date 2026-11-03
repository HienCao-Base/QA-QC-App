import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createBaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Client chạy trên server với quyền của người đang đăng nhập (tuân theo RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Gọi từ Server Component: bỏ qua, proxy.ts sẽ làm mới phiên.
          }
        },
      },
    },
  );
}

/** Client quyền quản trị (bỏ qua RLS). CHỈ dùng trong server action của Admin. */
export function createAdminClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
