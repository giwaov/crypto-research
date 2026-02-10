import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { AppWrapper } from "@/components/AppWrapper";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blind Auctions | Arcium MPC on Solana",
  description: "Private, encrypted auctions powered by Arcium multi-party computation on Solana. Place confidential bids that remain hidden until auction close.",
  keywords: ["Solana", "Arcium", "MPC", "blind auction", "encrypted", "privacy", "blockchain"],
  openGraph: {
    title: "Blind Auctions | Arcium MPC on Solana",
    description: "Private, encrypted auctions powered by Arcium multi-party computation on Solana.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${firaCode.variable} antialiased`}
      >
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
