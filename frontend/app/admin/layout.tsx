import { Provider } from "@/components/ui/provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
