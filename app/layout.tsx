import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guwahati Run",
  description: "Our trip companion for the IIT Guwahati hackathon finals.",
  applicationName: "Guwahati Run",
  robots: { index: false, follow: false, nocache: true },
  appleWebApp: { capable: true, title: "Guwahati Run", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16191f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
};

// Applies a saved light/dark override before first paint (no flash).
const themeScript = `try{var t=localStorage.getItem("gr-theme");if(t==="dark"||t==="light")document.documentElement.classList.add(t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-[100dvh]">{children}</body>
    </html>
  );
}
