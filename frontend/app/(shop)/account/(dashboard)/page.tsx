import { redirect } from "next/navigation";
import { AddressManager } from "@/components/account/address-manager";
import { CustomerApiError, listAddresses, me } from "@/lib/customer-api";

export default async function AccountDashboardPage() {
  let customer;
  let addresses;
  try {
    [customer, addresses] = await Promise.all([me(), listAddresses()]);
  } catch (error) {
    if (error instanceof CustomerApiError && error.status === 401) {
      redirect("/account/login");
    }
    throw error;
  }

  return (
    <div className="flex flex-col gap-10 max-w-3xl">
      <section>
        <h2 className="text-title-sm text-on-surface mb-4">Profile</h2>
        <div className="border border-outline-variant rounded-sm p-4 text-body-sm text-on-surface-variant flex flex-col gap-1">
          <p>
            <span className="text-on-surface">{customer.full_name ?? "—"}</span>
          </p>
          <p>{customer.email}</p>
          {customer.phone && <p>{customer.phone}</p>}
          <p className={customer.email_verified ? "text-primary" : "text-error"}>
            {customer.email_verified ? "Email verified" : "Email not verified"}
          </p>
        </div>
      </section>

      <section>
        <AddressManager addresses={addresses} />
      </section>

      <section>
        <h2 className="text-title-sm text-on-surface mb-4">Order History</h2>
        <div className="border border-outline-variant rounded-sm p-4 text-body-sm text-on-surface-variant">
          You haven&apos;t placed any orders yet.
        </div>
      </section>
    </div>
  );
}
