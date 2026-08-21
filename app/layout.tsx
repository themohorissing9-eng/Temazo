import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { getBackgroundTrackId } from "@/lib/config";

export const metadata: Metadata = {
  title: "TEMAZO — música de tu grupo",
  description:
    "Subí tu música, escuchá la de los demás, votá y descubrí cuál es el TEMAZO del grupo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const bgTrackId = getBackgroundTrackId();

  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(251,146,60,0.10),transparent_55%)]" />
        <Header />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">{children}</main>
        {bgTrackId && <BackgroundMusic trackId={bgTrackId} />}
      </body>
    </html>
  );
}
