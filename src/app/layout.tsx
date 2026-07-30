import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appName } from "@/lib/env";

export const metadata: Metadata = {
  title: `${appName()} · 物品位置与过期管理`,
  description: "拍照记录物品、存放位置和过期日期。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
