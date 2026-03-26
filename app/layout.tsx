import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéPrice — Pokemon Card Price Dashboard",
  description: "Search any Pokemon card and see aggregated prices from eBay, TCGplayer, and PriceCharting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
