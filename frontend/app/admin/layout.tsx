import type { Metadata } from "next";
import { Provider } from "@/components/ui/provider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
