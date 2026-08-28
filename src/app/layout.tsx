import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AgriTrust",
  description: "Transparent agricultural supply chain verification.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-agri-base text-agri-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
