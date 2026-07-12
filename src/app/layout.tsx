import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import QueryProvider from "@/providers/QueryProvider";
import YouTubePlayer from "@/components/player/YouTubePlayer";
import MiniPlayer from "@/components/player/MiniPlayer";
import AppLayout from "@/components/navigation/AppLayout";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "NeoTunes - The Future Sounds Better",
  description: "A premium hybrid music streaming platform combining Spotify, Apple Music, and YouTube playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AppLayout>
              {children}
            </AppLayout>
            <YouTubePlayer />
            <MiniPlayer />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
