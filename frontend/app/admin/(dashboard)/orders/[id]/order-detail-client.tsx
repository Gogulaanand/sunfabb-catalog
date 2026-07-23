"use client";

import NextLink from "next/link";
import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Link,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { formatPrice } from "@/lib/api";
import type { AdminOrderDetail, AdminOrderStatus } from "@/lib/admin-api";
import { adminOrderStatusSchema } from "@/lib/admin-order-status";
import { OrderStatusBadge, orderStatusLabel } from "@/components/admin/order-status";
import { OrderStatusTimeline } from "@/components/admin/order-status-timeline";
import { updateAdminOrderStatusAction } from "./actions";

export function OrderDetailClient({ initialOrder }: { initialOrder: AdminOrderDetail }) {
  const [order, setOrder] = useState(initialOrder);
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatus | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusUpdate() {
    if (!selectedStatus || submitting) return;
    const nextStatus = selectedStatus;
    const previousOrder = order;
    setError(null);
    setSubmitting(true);
    setOrder({ ...order, status: nextStatus, allowed_next_statuses: [] });

    try {
      const result = await updateAdminOrderStatusAction(order.id, nextStatus);
      if (result.ok) {
        setOrder(result.data);
        setSelectedStatus("");
      } else {
        setOrder(previousOrder);
        setSelectedStatus("");
        setError(result.error);
      }
    } catch {
      setOrder(previousOrder);
      setSelectedStatus("");
      setError("Could not update order status");
    } finally {
      setSubmitting(false);
    }
  }

  const statusOptions = submitting && selectedStatus ? [selectedStatus] : order.allowed_next_statuses;

  return (
    <Stack gap="8">
      <Stack gap="3">
        <Link asChild fontSize="sm" color="fg.muted">
          <NextLink href="/admin/orders">← Back to orders</NextLink>
        </Link>
        <HStack justify="space-between" align={{ base: "start", md: "center" }}>
          <Box>
            <Heading fontFamily="heading" size="lg">
              {order.order_number}
            </Heading>
            <Text color="fg.muted" mt="1">
              Created {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}
            </Text>
          </Box>
          <OrderStatusBadge status={order.status} />
        </HStack>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
        <Box borderWidth="1px" borderColor="border" rounded="lg" p="5">
          <Heading size="sm" mb="4">
            Customer
          </Heading>
          <Stack gap="1">
            <Text fontWeight="600">{order.customer.full_name ?? "Guest customer"}</Text>
            <Text>{order.customer.email}</Text>
            <Text color="fg.muted">{order.customer.phone ?? "No phone number"}</Text>
          </Stack>
        </Box>
        <Box borderWidth="1px" borderColor="border" rounded="lg" p="5">
          <Heading size="sm" mb="4">
            Update status
          </Heading>
          <Stack gap="3">
            <Field label="Next legal status" invalid={!!error} errorText={error ?? undefined}>
              <NativeSelect.Root disabled={submitting}>
                <NativeSelect.Field
                  aria-label="Update status"
                  value={selectedStatus}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") {
                      setSelectedStatus("");
                      return;
                    }
                    const parsed = adminOrderStatusSchema.safeParse(value);
                    setSelectedStatus(parsed.success ? parsed.data : "");
                  }}
                >
                  <option value="">Select a status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {orderStatusLabel(status)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field>
            <Button
              type="button"
              colorPalette="primary"
              disabled={!selectedStatus || submitting}
              loading={submitting}
              onClick={handleStatusUpdate}
            >
              Confirm status update
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>

      <Box borderWidth="1px" borderColor="border" rounded="lg" p={{ base: "4", md: "5" }}>
        <Heading size="sm" mb="4">
          Status timeline
        </Heading>
        <OrderStatusTimeline
          status={order.status}
          allowedNextStatuses={order.allowed_next_statuses}
        />
      </Box>

      <Box>
        <Heading size="md" mb="4">
          Line items
        </Heading>
        <Box overflowX="auto" borderWidth="1px" borderColor="border" rounded="lg">
          <Table.Root size="sm" variant="outline" minW="680px">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Product</Table.ColumnHeader>
                <Table.ColumnHeader>SKU</Table.ColumnHeader>
                <Table.ColumnHeader>Qty</Table.ColumnHeader>
                <Table.ColumnHeader>Unit price</Table.ColumnHeader>
                <Table.ColumnHeader>Line total</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {order.items.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <Stack gap="0">
                      <Text fontWeight="600">{item.product_name}</Text>
                      <Text color="fg.muted" fontSize="sm">
                        {item.variant_label}
                      </Text>
                    </Stack>
                  </Table.Cell>
                  <Table.Cell>{item.sku}</Table.Cell>
                  <Table.Cell>{item.quantity}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">{formatPrice(item.unit_price_paise)}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">{formatPrice(item.line_total_paise)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="6">
        <Box borderWidth="1px" borderColor="border" rounded="lg" p="5">
          <Heading size="sm" mb="4">
            Payment information
          </Heading>
          <Stack gap="4">
            {order.payments.map((payment) => (
              <Stack key={payment.id} gap="1">
                <HStack justify="space-between">
                  <Text fontWeight="600">{payment.status}</Text>
                  <Text>{formatPrice(payment.amount_paise)}</Text>
                </HStack>
                <Text color="fg.muted" fontSize="sm">
                  Method: {payment.method ?? "—"}
                </Text>
                <Text color="fg.muted" fontSize="sm">
                  Razorpay payment: {payment.razorpay_payment_id ?? "—"}
                </Text>
                <Text color="fg.muted" fontSize="sm">
                  Razorpay order: {payment.razorpay_order_id ?? "—"}
                </Text>
              </Stack>
            ))}
            {order.payments.length === 0 && <Text color="fg.muted">No payment attempts recorded.</Text>}
          </Stack>
        </Box>
        <Box borderWidth="1px" borderColor="border" rounded="lg" p="5">
          <Heading size="sm" mb="4">
            Order totals
          </Heading>
          <Stack gap="2">
            <HStack justify="space-between"><Text>Subtotal</Text><Text>{formatPrice(order.subtotal_paise)}</Text></HStack>
            <HStack justify="space-between"><Text>Shipping</Text><Text>{formatPrice(order.shipping_paise)}</Text></HStack>
            <HStack justify="space-between"><Text>Tax</Text><Text>{formatPrice(order.tax_paise)}</Text></HStack>
            <HStack justify="space-between"><Text>Discount</Text><Text>{formatPrice(order.discount_paise)}</Text></HStack>
            <HStack justify="space-between" borderTopWidth="1px" borderColor="border" pt="3" fontWeight="700">
              <Text>Total</Text>
              <Text>{formatPrice(order.total_paise)}</Text>
            </HStack>
          </Stack>
        </Box>
      </SimpleGrid>
    </Stack>
  );
}
