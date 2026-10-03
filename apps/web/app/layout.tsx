import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Explainer Studio",
  description: "Guided local production dashboard",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
