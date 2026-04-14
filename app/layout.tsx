import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Visual Map",
  description: "Visual data element mapping tool",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
