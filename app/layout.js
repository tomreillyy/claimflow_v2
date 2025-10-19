import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://aird.com.au'),
  title: {
    default: "Aird - R&D Evidence Tracking",
    template: "%s | Aird"
  },
  description: "Track your R&D work and build evidence as you go. Capture innovation as it unfolds — no archaeology required.",
  keywords: ['R&D tax credit', 'R&D evidence', 'innovation documentation', 'R&D tracking', 'ATO R&D', 'technical documentation', 'R&D tax incentive'],
  authors: [{ name: 'Aird' }],
  creator: 'Aird',
  publisher: 'Aird',
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: 'https://aird.com.au',
    siteName: 'Aird',
    title: 'Aird - R&D Evidence Tracking',
    description: 'Track your R&D work and build evidence as you go. Capture innovation as it unfolds — no archaeology required.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aird - R&D Evidence Tracking',
    description: 'Track your R&D work and build evidence as you go. Capture innovation as it unfolds — no archaeology required.',
  },
  icons: {
    icon: "/aird-favicon.png",
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
