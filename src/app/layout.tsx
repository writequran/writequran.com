import type { Metadata } from "next";
import { Inter, Scheherazade_New, Gabriela } from "next/font/google";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const gabriela = Gabriela({
  variable: "--font-gabriela",
  weight: ["400"],
  subsets: ["latin"],
});

const scheherazade = Scheherazade_New({
  variable: "--font-quran",
  weight: ["400", "700"],
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "WriteQuran",
  description: "Practice writing and memorizing the Qur'an, letter by letter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" translate="no" className={`${inter.variable} ${scheherazade.variable} ${gabriela.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 font-sans transition-colors duration-300">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
