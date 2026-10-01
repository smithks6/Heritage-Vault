import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Heritage Vault",
    template: "%s — Heritage Vault",
  },
  description:
    "Preserve the voices, stories, and memories of the people who shaped your family.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-parchment-100">{children}</body>
    </html>
  );
}
