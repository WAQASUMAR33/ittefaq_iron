import Script from "next/script";
import "./globals.css";
import CustomThemeProvider from "./providers/theme-provider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ChunkErrorRecovery from "./components/chunk-error-recovery";

export const metadata = {
  title: "Ittefaq Iron and Cement Store",
  description: "Ittefaq Iron and Cement Store - Point of Sale System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning={true}
      >
        <ChunkErrorRecovery />
        <Script src="/websdk.client.js" strategy="beforeInteractive" />
        <AppRouterCacheProvider>
          <CustomThemeProvider>
            {children}
          </CustomThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
