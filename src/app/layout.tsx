import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  weight: ["600", "700", "800"],
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  variable: "--font-mono",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full bg-agri-base text-agri-text`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
