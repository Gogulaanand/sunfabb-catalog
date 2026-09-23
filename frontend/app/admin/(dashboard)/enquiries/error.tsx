"use client";

import NextLink from "next/link";
import { Button, Heading, Link, Stack, Text } from "@chakra-ui/react";

export default function AdminEnquiriesError({ reset }: { reset: () => void }) {
  return (
    <Stack gap="5" align="start" maxW="xl" py="12">
      <Heading size="lg">Enquiries could not be loaded</Heading>
      <Text color="fg.muted">
        The contact enquiry service did not respond. Try again, or return to the dashboard.
      </Text>
      <Stack direction={{ base: "column", sm: "row" }} gap="3">
        <Button type="button" colorPalette="primary" onClick={reset}>
          Try again
        </Button>
        <Link asChild>
          <NextLink href="/admin">Back to dashboard</NextLink>
        </Link>
      </Stack>
    </Stack>
  );
}
