import type { Metadata } from "next";
import { Kanit, Inter } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";
import { UIProvider } from "./providers";

const kanit = Kanit({
  weight: ['300', '400', '500', '600'],
  subsets: ['thai', 'latin'],
  variable: '--font-kanit',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "กมลาศรม สสจ.พิษณุโลก",
  description: "ระบบจองคิวกมลาศรม สสจ.พิษณุโลก",
  other: {
    'font-link': 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${kanit.variable} ${inter.variable} antialiased bg-primary-50 text-stone-800 selection:bg-primary-200`}
        style={{ fontFamily: "'Sarabun', var(--font-kanit), var(--font-inter), sans-serif" }}
      >
        <UIProvider>
          <BookingProvider>{children}</BookingProvider>
        </UIProvider>
      </body>
    </html>
  );
}
