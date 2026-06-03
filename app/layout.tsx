import type { Metadata, Viewport } from "next";
import "./globals.css";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const site = require("../site.config.js") as { title: string };

export const metadata: Metadata = {
  title: site.title,
  description:
    "Carica le foto del matrimonio di Andrea e Francesca — dal telefono in pochi secondi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f4f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
