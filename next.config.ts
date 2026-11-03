import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * Địa chỉ IPv4 mạng LAN của máy đang chạy dev server.
 * Next.js chặn tài nguyên dev (JS, HMR) khi mở trang bằng host khác "localhost",
 * nên mở app trên điện thoại qua http://<IP máy>:3000 sẽ không chạy JavaScript
 * (nút, menu, chọn ảnh… đều không bấm được). Chỉ ảnh hưởng `next dev`.
 */
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

// App nội bộ, mọi trang đều phụ thuộc người đăng nhập nên dùng mô hình render động
// (không bật cacheComponents) cho đơn giản.
const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
