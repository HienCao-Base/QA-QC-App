"use client"; // Error boundary phải là Client Component

import { ErrorView } from "@/components/error-view";

/** Lỗi ở cấp cao hơn (vd: không lấy được thông tin người dùng trong layout). */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto max-w-md px-safe py-10">
      <ErrorView error={error} retry={retry} />
    </main>
  );
}
