import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InkForm — Open-source form backend for static sites',
  description:
    'Self-hosted form backend on Cloudflare. Point your HTML form at it, get submissions in a dashboard. Free tier forever, one-click deploy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
