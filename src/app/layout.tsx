import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "vidplay — turn a photo into a video",
  description: "Upload a photo, describe an action, get a generated video.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-neutral-950 text-neutral-100`}
      >
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#171717", color: "#fafafa", border: "1px solid #262626" },
          }}
        />
      </body>
    </html>
  );
}
