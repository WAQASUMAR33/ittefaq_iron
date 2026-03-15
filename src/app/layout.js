import { Poppins } from "next/font/google";
import "./globals.css";
import CustomThemeProvider from "./providers/theme-provider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  preload: true,
});

export const metadata = {
  title: "Ittefaq Iron and Cement Store",
  description: "Ittefaq Iron and Cement Store - Point of Sale System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AppRouterCacheProvider>
          <CustomThemeProvider>
            {children}
          </CustomThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
