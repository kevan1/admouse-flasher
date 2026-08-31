import type { Metadata } from "next";
import { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-Regular.ttf", weight: "400" },
    { path: "./fonts/Poppins-Medium.ttf", weight: "500" },
    { path: "./fonts/Poppins-SemiBold.ttf", weight: "600" },
    { path: "./fonts/Poppins-Bold.ttf", weight: "700" },
    { path: "./fonts/Poppins-ExtraBold.ttf", weight: "800" },
  ],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Configurador de botones | AdMouse",
  description: "Configurá las acciones de tus botones AdMouse desde Chrome.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className={poppins.variable}>
        <div className="site-shell">{children}</div>
      </body>
    </html>
  );
}
