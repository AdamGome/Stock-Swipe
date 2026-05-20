import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StockSwipe",
  description:
    "A swipe-style stock discovery app for saving watchlist and passed stocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}