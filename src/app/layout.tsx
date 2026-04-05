import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getRequestI18n } from "@/lib/i18n/server";
import {
  buildLocalizedMetadataAlternates,
  getAbsoluteUrl,
  getSiteUrl,
} from "@/lib/seo";
import "./globals.css";

const inter = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
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

const jetBrainsMono = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  await getRequestI18n();

  return {
    metadataBase: new URL(getSiteUrl()),
    alternates: {
      ...buildLocalizedMetadataAlternates("/"),
      types: {
        "application/rss+xml": getAbsoluteUrl("/feed.xml"),
      },
    },
  };
}

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dictionary } = await getRequestI18n();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansSc.variable} ${jetBrainsMono.variable} flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased`}
      >
        <Script id="theme-blocking-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <LocaleProvider locale={locale} dictionary={dictionary}>
            <Header />
            <main className="w-full flex-1 px-[var(--spacing-page)]">
              {children}
            </main>
            <Footer dictionary={dictionary.shell.footer} />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
