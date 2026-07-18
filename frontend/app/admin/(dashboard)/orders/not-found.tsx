import NextLink from "next/link";
import { Button, Heading, Stack, Text } from "@chakra-ui/react";

export default function AdminOrderNotFound() {
  return (
    <Stack gap="5" align="start" maxW="xl" py="12">
      <Heading size="lg">Order not found</Heading>
      <Text color="fg.muted">The order ID is invalid or the order is not available.</Text>
      <Button asChild colorPalette="primary">
        <NextLink href="/admin/orders">Back to orders</NextLink>
      </Button>
    </Stack>
  );
}
