import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import type { AdminOrderStatus } from "@/lib/admin-api";
import { orderStatusLabel } from "./order-status";

const FULFILMENT_PATH: AdminOrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function OrderStatusTimeline({
  status,
  allowedNextStatuses,
}: {
  status: AdminOrderStatus;
  allowedNextStatuses: AdminOrderStatus[];
}) {
  const currentIndex = FULFILMENT_PATH.indexOf(status);
  const isTerminal = !FULFILMENT_PATH.includes(status) && allowedNextStatuses.length === 0;

  return (
    <Stack gap="3" as="ol" aria-label="Order status timeline">
      {FULFILMENT_PATH.map((step, index) => {
        const isCurrent = step === status;
        const isComplete = currentIndex >= 0 && index < currentIndex;
        return (
          <HStack key={step} as="li" align="start" gap="3">
            <Box
              mt="1"
              boxSize="3"
              rounded="full"
              bg={isCurrent ? "colorPalette.solid" : isComplete ? "green.solid" : "bg.muted"}
              flexShrink="0"
              aria-hidden="true"
            />
            <Box>
              <Text fontWeight={isCurrent ? "700" : "500"}>{orderStatusLabel(step)}</Text>
              <Text color="fg.muted" fontSize="sm">
                {isCurrent ? "Current status" : isComplete ? "Completed" : "Upcoming"}
              </Text>
            </Box>
          </HStack>
        );
      })}
      {isTerminal && (
        <HStack as="li" align="start" gap="3">
          <Box mt="1" boxSize="3" rounded="full" bg="red.solid" flexShrink="0" aria-hidden="true" />
          <Box>
            <Text fontWeight="700">{orderStatusLabel(status)}</Text>
            <Text color="fg.muted" fontSize="sm">
              Current terminal status
            </Text>
          </Box>
        </HStack>
      )}
    </Stack>
  );
}
