"use client"; // Error boundary phải là Client Component

import { ErrorView } from "@/components/error-view";

/** Lỗi trong một trang: giữ nguyên header và thanh điều hướng. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
