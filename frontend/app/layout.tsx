import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
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
        className={`${inter.variable} ${poppins.variable} antialiased`}
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
