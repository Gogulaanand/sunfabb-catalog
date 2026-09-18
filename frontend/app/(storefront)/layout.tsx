import { Header } from "@/components/storefront/Header";
import { MotionProvider } from "@/components/motion";
import Footer from "@/components/storefront/footer";
import { getPublicCategories } from "@/lib/api";

export default async function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const categories = await getPublicCategories().catch(() => []);

  return (
    <MotionProvider>
      <div className="min-h-full flex flex-col">
        <Header categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </MotionProvider>
  );
}
