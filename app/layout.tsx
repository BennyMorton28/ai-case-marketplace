import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';

export const metadata: Metadata = {
  title: "Noyes AI Demos",
  description: "Demo dashboard for Noyes AI applications",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.className} antialiased`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-grow">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
