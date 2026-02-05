import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "UIXScore",
  description: "AI-powered UI/UX Audits",
  icons: {
    icon: "/uixscore-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID || "";
  const cleanId = adClientId.replace("pub-", "");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {cleanId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${cleanId}`}
            crossOrigin="anonymous"
          ></script>
        )}
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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