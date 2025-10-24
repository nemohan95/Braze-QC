import Link from "next/link";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Email QC",
  description:
    "Automated quality control for Braze marketing emails with copy doc validation, disclaimers, and link checks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                Email QC
              </Link>
              <nav className="flex gap-4 text-sm font-medium text-slate-600">
                <Link className="hover:text-slate-900" href="/qc/new">
                  New QC
                </Link>
                <Link className="hover:text-slate-900" href="/qc">
                  Past Runs
                </Link>
                <Link className="hover:text-slate-900" href="/admin/rules">
                  Admin Rules
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-xs text-slate-500">
              <span>© {new Date().getFullYear()} Email QC MVP</span>
              <span>Built for Braze QA workflows</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
