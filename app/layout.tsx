import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: {
    default: "UIXScore - AI-Powered UX Audits",
    template: "%s | UIXScore",
  },
  description: "Automated heuristic evaluation and accessibility testing for modern web apps.",
  icons: {
    icon: "/uixscore-logo.png",
  },
  metadataBase: new URL('https://uixscore.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "";
  const cleanId = adClientId.replace("pub-", "");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {cleanId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${cleanId}`}
            crossOrigin="anonymous"
          ></script>
        )}
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}