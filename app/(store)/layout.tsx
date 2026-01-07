import type { Metadata } from "next";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { Toaster } from "@/components/ui/sonner";
import { getSystemSettings } from "@/lib/actions/system-settings";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, siteDescription } = await getSystemSettings();

  return {
    title: {
      default: `${siteName} - 自动发卡系统`,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
  };
}

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { siteName, siteIcon } = await getSystemSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <Header siteName={siteName} siteIcon={siteIcon} />
      <main className="flex-1">{children}</main>
      <Footer siteName={siteName} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
