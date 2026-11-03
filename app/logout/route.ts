import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Đăng xuất phía server rồi về trang đăng nhập (kèm lý do nếu có).
 * Dùng khi phiên đăng nhập còn trong cookie nhưng không dùng được nữa
 * (tài khoản bị xóa / bị khóa / không có hồ sơ): Server Component không xóa được cookie,
 * nếu chỉ chuyển về /login thì proxy.ts lại đẩy về "/" -> vòng lặp chuyển hướng.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});

  const url = new URL("/login", request.url);
  const error = request.nextUrl.searchParams.get("error");
  if (error) url.searchParams.set("error", error);

  const res = NextResponse.redirect(url);
  // Chắc chắn xóa cookie phiên Supabase kể cả khi signOut báo lỗi (VD: tài khoản đã bị xóa)
  for (const c of request.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  return res;
}
