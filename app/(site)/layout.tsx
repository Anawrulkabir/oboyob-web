import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        মূল অংশে যান
      </a>
      <Navbar />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  );
}
