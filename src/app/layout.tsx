import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
  getAbsoluteUrl,
  getDefaultOgImageUrl,
  getSiteUrl,
} from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansSc = localFont({
  src: "./fonts/NotoSansCJKsc-Regular.otf",
  display: "block",
  preload: true,
  fallback: ["sans-serif"],
  variable: "--font-cjk",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  alternates: {
    types: {
      "application/rss+xml": getAbsoluteUrl("/feed.xml"),
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    url: getAbsoluteUrl("/"),
    images: [
      {
        url: getDefaultOgImageUrl(),
      },
    ],
  },
};

// Blocking script to prevent FOUC - reads localStorage theme before paint
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansSc.variable} ${jetBrainsMono.variable} flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <Script id="theme-blocking-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <Header />
          <main className="mx-auto w-full max-w-[var(--content-max-width)] flex-1 px-[var(--spacing-page)]">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
