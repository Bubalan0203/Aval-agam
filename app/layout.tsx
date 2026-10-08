import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.avalagam.com"),
  title: "Aval Agam — Her Inner World",
  description: "A soulspace to know, grow & thrive. Wellness circles, workshops and literary events in Coimbatore.",
  icons: { icon: "/logo.png" },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aval Agam — Her Inner World",
    description: "A soulspace to know, grow & thrive. Wellness circles, workshops and literary events in Coimbatore.",
    url: "/",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
