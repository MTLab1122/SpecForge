import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecForge | AI Discovery, Estimation & Handover SaaS",
  description: "AI-assisted discovery, requirements, estimation, proposal, client-approval, and delivery-handover SaaS platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
