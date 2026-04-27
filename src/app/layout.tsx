import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import PermanentExpensesSidebar from "@/components/PermanentExpensesSidebar";
import { getRecurringExpensesAction } from "./actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ohana Finance",
  description: "Simple finance tracking for small business",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ohana Finance",
  },
  icons: {
    apple: "/icon-ohana.png",
    icon: "/icon-ohana.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const recurringExpenses = await getRecurringExpensesAction();

  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 pb-20 md:pb-0 md:pt-16`}
      >
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 min-h-screen">
            <main className="md:col-span-7 lg:col-span-6 xl:col-span-7 py-4 max-w-md mx-auto w-full">
              {children}
            </main>
            <aside className="hidden md:block md:col-span-5 lg:col-span-6 xl:col-span-5 py-8">
              <PermanentExpensesSidebar expenses={recurringExpenses} />
            </aside>
          </div>
        </div>
      </body>
    </html>
  );
}
