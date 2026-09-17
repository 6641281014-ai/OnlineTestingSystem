import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบทดสอบออนไลน์เพื่อประเมินผลสัมฤทธิ์ทางการเรียน",
  description: "Online Testing System for Evaluating Academic Achievement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
