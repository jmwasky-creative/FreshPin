import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "FreshPin | 智能物品过期与位置管理",
  description: "记录物品的位置和保质期，在临期前收到提醒。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
