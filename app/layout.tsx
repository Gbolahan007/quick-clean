import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./[locale]/globals.css";

const geistSans = Geist({
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://frosh.com"),

  title: {
    default: "Frosh | Professional Home & Office Cleaning Services",
    template: "%s | Frosh",
  },

  description:
    "Frosh is a trusted cleaning company providing professional home and office cleaning services.",

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistMono.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
