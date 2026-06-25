import { AccountNav } from "@/components/account/account-nav";

export default function AccountDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div>
      <AccountNav />
      {children}
    </div>
  );
}
