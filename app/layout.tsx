import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata = {
  title: "Diagnóstico Financeiro",
  description: "Ferramenta interna de diagnóstico financeiro para PMEs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
