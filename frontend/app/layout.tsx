import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HR Platform - Talent Acquisition & Recruitment",
  description: "HR Platform for job posting, skill matching, and career development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'oklch(0.1 0 0)',
                color: 'oklch(0.985 0 0)',
                border: '1px solid oklch(0.17 0 0)',
                borderRadius: 'var(--radius-lg)',
              },
              success: {
                iconTheme: {
                  primary: 'oklch(0.7 0.15 180)',
                  secondary: 'oklch(0.985 0 0)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'oklch(0.65 0.2 330)',
                  secondary: 'oklch(0.985 0 0)',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
