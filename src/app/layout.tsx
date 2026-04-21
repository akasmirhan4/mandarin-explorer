import "~/styles/globals.css";

import { type Metadata } from "next";
import { DM_Sans, Noto_Serif_SC } from "next/font/google";

import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "词语探索 — Mandarin Explorer",
  description:
    "Translate English to Chinese, learn strokes & pronunciation, build your vocabulary",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-noto-serif-sc",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${notoSerifSC.variable}`}
      suppressHydrationWarning
    >
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  );
}
