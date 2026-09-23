import { listAdminEnquiries, parseAdminEnquiriesQuery } from "@/lib/admin-enquiries";
import { EnquiriesClient } from "./enquiries-client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const filters = parseAdminEnquiriesQuery(raw);
  const response = await listAdminEnquiries(filters);

  return <EnquiriesClient response={response} filters={filters} />;
}
