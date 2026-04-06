import type { Metadata } from "next";
import { Inter, Scheherazade_New, Gabriela } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { LanguageProvider } from "@/lib/i18n";
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
  title: "WriteQuran — Practice & Memorize the Qur'an",
  description: "A focused, distraction-free tool to practice writing and memorizing the Qur'an, letter by letter.",
  icons: {
    icon: "/wq.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" translate="no" className={`${inter.variable} ${scheherazade.variable} ${gabriela.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#FDFBF7] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50 font-sans transition-colors duration-300">
        <ThemeInitializer />
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
