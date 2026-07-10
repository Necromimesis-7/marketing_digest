import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing Digest",
  description: "Internal marketing case publisher with POPO distribution."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
