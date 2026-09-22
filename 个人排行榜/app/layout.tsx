import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "我的评分宇宙",
  description: "私人动漫、游戏、电影与兴趣评分榜单。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

