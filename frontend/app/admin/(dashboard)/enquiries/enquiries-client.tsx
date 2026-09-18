import NextLink from "next/link";
import { Box, Heading, HStack, Link, Stack, Table, Text } from "@chakra-ui/react";
import type { AdminEnquiriesQuery, AdminEnquiriesResponse } from "@/lib/admin-enquiries";

function formatEnquiryDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function queryString(filters: AdminEnquiriesQuery, page: number, limit: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (key !== "page" && value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export function EnquiriesClient({
  response,
  filters,
}: {
  response: AdminEnquiriesResponse;
  filters: AdminEnquiriesQuery;
}) {
  const totalPages = Math.ceil(response.total / response.limit);
  const previousHref = `/admin/enquiries?${queryString(filters, response.page - 1, response.limit)}`;
  const nextHref = `/admin/enquiries?${queryString(filters, response.page + 1, response.limit)}`;

  return (
    <Stack gap="6">
      <HStack justify="space-between" align={{ base: "start", md: "center" }}>
        <Box>
          <Heading fontFamily="heading" size="lg">
            Enquiries
          </Heading>
          <Text color="fg.muted" mt="1">
            {response.total} contact {response.total === 1 ? "enquiry" : "enquiries"}
          </Text>
        </Box>
      </HStack>

      <Box overflowX="auto" borderWidth="1px" borderColor="border" rounded="lg">
        <Table.Root size="sm" variant="outline" minW="860px">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Submitted by</Table.ColumnHeader>
              <Table.ColumnHeader>Contact</Table.ColumnHeader>
              <Table.ColumnHeader>Message</Table.ColumnHeader>
              <Table.ColumnHeader>Received</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {response.enquiries.map((enquiry) => (
              <Table.Row key={enquiry.id}>
                <Table.Cell verticalAlign="top">
                  <Text fontWeight="600">{enquiry.name}</Text>
                </Table.Cell>
                <Table.Cell verticalAlign="top">
                  <Stack gap="0">
                    <Text whiteSpace="nowrap">{enquiry.phone}</Text>
                    {enquiry.email && (
                      <Text color="fg.muted" fontSize="sm">
                        {enquiry.email}
                      </Text>
                    )}
                  </Stack>
                </Table.Cell>
                <Table.Cell verticalAlign="top" maxW="420px">
                  <Text whiteSpace="pre-wrap">{enquiry.message}</Text>
                </Table.Cell>
                <Table.Cell verticalAlign="top" whiteSpace="nowrap">
                  {formatEnquiryDate(enquiry.created_at)}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        {response.enquiries.length === 0 && (
          <Text color="fg.muted" px="5" py="8" textAlign="center">
            No contact enquiries have been submitted yet.
          </Text>
        )}
      </Box>

      {totalPages > 1 && (
        <HStack justify="space-between">
          {response.page > 1 ? (
            <Link asChild>
              <NextLink href={previousHref} aria-label="Previous page">
                Previous
              </NextLink>
            </Link>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Previous
            </Text>
          )}
          <Text color="fg.muted" fontSize="sm">
            Page {response.page} of {totalPages}
          </Text>
          {response.page < totalPages ? (
            <Link asChild>
              <NextLink href={nextHref} aria-label="Next page">
                Next
              </NextLink>
            </Link>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Next
            </Text>
          )}
        </HStack>
      )}
    </Stack>
  );
}
