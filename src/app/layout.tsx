import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#090909",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "NeoTunes - AI Music OS",
  description: "A premium hybrid music streaming platform combining Spotify, Apple Music, and YouTube playback.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeoTunes",
  },
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
