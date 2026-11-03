import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

const REASON: Record<string, string> = {
  inactive: "Tài khoản của bạn đã bị khóa hoặc chưa được cấp quyền. Liên hệ Admin.",
  session: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  const reason = typeof error === "string" ? REASON[error] : undefined;
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-safe py-10">
      {/* Nền: vệt sáng màu thương hiệu + lưới chấm mờ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_50%_-10%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]"
      />

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            aria-hidden
            className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/25"
          >
            QC
          </div>
          <h1 className="text-2xl font-semibold">Phiếu lỗi QA/QC</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Ghi nhận, giải trình và chốt lỗi cửa hàng</p>
        </div>
        {reason && (
          <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
            <TriangleAlert aria-hidden />
            <AlertDescription className="text-amber-900">{reason}</AlertDescription>
          </Alert>
        )}
        <LoginForm />
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden /> Tài khoản do Admin cấp. Quên mật khẩu, liên hệ Admin.
        </p>
      </div>
    </main>
  );
}
