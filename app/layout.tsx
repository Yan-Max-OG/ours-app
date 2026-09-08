import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/favicon.svg' },
  title: 'OURS — A little world, just for two',
  description:
    'Your plans, places, memories, and everything in between. A private space for two.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script src="https://telegram.org/js/telegram-web-app.js" defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
