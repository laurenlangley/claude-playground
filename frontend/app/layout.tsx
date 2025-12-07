import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthOps - Personal Health Analytics",
  description: "Track, analyze, and optimize your health data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
