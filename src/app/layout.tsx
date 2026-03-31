import type { Metadata } from "next";
import { Outfit, Lato } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "OTM Client Portal",
  description: "Your strategy engagement progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${lato.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-otm-light font-lato text-otm-gray">
        {children}
      </body>
    </html>
  );
}
