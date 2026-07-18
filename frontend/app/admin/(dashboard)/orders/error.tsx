"use client";

import NextLink from "next/link";
import { Button, Heading, Link, Stack, Text } from "@chakra-ui/react";

export default function AdminOrdersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Stack gap="5" align="start" maxW="xl" py="12">
      <Heading size="lg">Orders could not be loaded</Heading>
      <Text color="fg.muted">
        The order service did not respond. Try again, or return to the orders list.
      </Text>
      <Stack direction={{ base: "column", sm: "row" }} gap="3">
        <Button type="button" colorPalette="primary" onClick={reset}>
          Try again
        </Button>
        <Link asChild>
          <NextLink href="/admin/orders">Back to orders</NextLink>
        </Link>
      </Stack>
    </Stack>
  );
}
