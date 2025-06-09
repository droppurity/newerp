
import type {Metadata} from 'next';
import { Rubik } from 'next/font/google'; // Changed font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Using Rubik as a more modern, rounded sans-serif font
const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-sans', // Use --font-sans for main font
});


export const metadata: Metadata = {
  title: 'DropPurity',
  description: 'Water purification service management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rubik.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
