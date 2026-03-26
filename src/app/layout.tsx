import type { Metadata } from "next";
import "./globals.css";
import { Inter, Source_Code_Pro } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
});

export const metadata: Metadata = {
  title: "Novedades Policiales",
  description: "App para el registro de novedades policiales",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isLocalDev = process.env.NODE_ENV !== "production";

  return (
    <html lang="es" className={`${inter.variable} ${sourceCodePro.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          {isLocalDev && (
            <div className="fixed right-3 top-3 z-[9999] rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold tracking-wide text-white shadow-lg">
              LOCAL DEV
            </div>
          )}
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
