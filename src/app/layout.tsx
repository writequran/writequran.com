import type { Metadata } from "next";
import { Inter, Amiri_Quran } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const amiri = Amiri_Quran({
  variable: "--font-amiri",
  weight: ["400"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Qur'an Typing App",
  description: "A minimal web app for typing and memorizing the Qur'an.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" translate="no" className={`${inter.variable} ${amiri.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 font-sans transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
