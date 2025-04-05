import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "AI Web Search",
  description: "AI web search by Noether Tech",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      >
        {children}
      </body>
    </html>
  );
}
