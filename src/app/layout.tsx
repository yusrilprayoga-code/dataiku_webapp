import type { Metadata } from "next";
import "./globals.css";
import UniversalHeader from "@/components/layout/UniversalHeader";

export const metadata: Metadata = {
  title: "Data Platform",
  description: "Universal data analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <UniversalHeader />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
