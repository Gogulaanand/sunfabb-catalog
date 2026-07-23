"use client";

import NextLink from "next/link";
import { Box, Button, Heading, HStack, Input, Link, NativeSelect, Stack, Table, Text } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { formatPrice } from "@/lib/api";
import type { AdminOrdersQuery, AdminOrdersResponse } from "@/lib/admin-api";
import { ORDER_STATUS_OPTIONS, OrderStatusBadge } from "@/components/admin/order-status";

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function queryString(filters: AdminOrdersQuery, page: number, limit: number): string {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params.toString();
}

export function OrdersClient({
  response,
  filters,
}: {
  response: AdminOrdersResponse;
  filters: AdminOrdersQuery;
}) {
  const totalPages = Math.ceil(response.total / response.limit);
  const previousHref = `/admin/orders?${queryString(filters, response.page - 1, response.limit)}`;
  const nextHref = `/admin/orders?${queryString(filters, response.page + 1, response.limit)}`;

  return (
    <Stack gap="6">
      <HStack justify="space-between" align={{ base: "start", md: "center" }}>
        <Box>
          <Heading fontFamily="heading" size="lg">
            Orders
          </Heading>
          <Text color="fg.muted" mt="1">
            {response.total} order{response.total === 1 ? "" : "s"} in the catalog
          </Text>
        </Box>
      </HStack>

      <Box borderWidth="1px" borderColor="border" rounded="lg" p={{ base: "4", md: "5" }}>
        <form action="/admin/orders" method="get">
          <Stack direction={{ base: "column", md: "row" }} gap="4" align={{ base: "stretch", md: "end" }}>
            <Field label="Status">
              <NativeSelect.Root>
                <NativeSelect.Field name="status" aria-label="Status" defaultValue={filters.status ?? ""}>
                  <option value="">All statuses</option>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field>
            <Field label="From date">
              <Input type="date" name="date_from" aria-label="From date" defaultValue={filters.date_from} />
            </Field>
            <Field label="To date">
              <Input type="date" name="date_to" aria-label="To date" defaultValue={filters.date_to} />
            </Field>
            <input type="hidden" name="limit" value={response.limit} />
            <Button type="submit" colorPalette="primary">
              Apply filters
            </Button>
          </Stack>
        </form>
      </Box>

      <Box overflowX="auto" borderWidth="1px" borderColor="border" rounded="lg">
        <Table.Root size="sm" variant="outline" minW="760px">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Order</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Customer</Table.ColumnHeader>
              <Table.ColumnHeader>Total</Table.ColumnHeader>
              <Table.ColumnHeader>Date</Table.ColumnHeader>
              <Table.ColumnHeader>Items</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {response.orders.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>
                  <Link asChild fontWeight="600">
                    <NextLink href={`/admin/orders/${order.id}`}>{order.order_number}</NextLink>
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <OrderStatusBadge status={order.status} />
                </Table.Cell>
                <Table.Cell>
                  <Stack gap="0">
                    <Text>{order.customer.full_name ?? "Guest customer"}</Text>
                    <Text color="fg.muted" fontSize="sm">
                      {order.customer.email}
                    </Text>
                  </Stack>
                </Table.Cell>
                <Table.Cell whiteSpace="nowrap">{formatPrice(order.total_paise)}</Table.Cell>
                <Table.Cell whiteSpace="nowrap">{formatOrderDate(order.created_at)}</Table.Cell>
                <Table.Cell>{order.item_count}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
        {response.orders.length === 0 && (
          <Text color="fg.muted" px="5" py="8" textAlign="center">
            No orders match these filters.
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
