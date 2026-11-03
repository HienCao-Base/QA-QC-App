import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const font = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Phiếu lỗi QA/QC",
  description: "Ghi nhận, giải trình và chốt phiếu lỗi cửa hàng",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f8fafc" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`h-full ${font.variable}`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
