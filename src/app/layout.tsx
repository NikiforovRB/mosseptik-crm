import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "МОССЕПТИК CRM",
  description: "CRM для управления заявками",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
