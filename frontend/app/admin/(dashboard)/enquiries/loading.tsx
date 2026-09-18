import { Box, Heading, Skeleton, Stack } from "@chakra-ui/react";

export default function AdminEnquiriesLoading() {
  return (
    <Stack gap="6" aria-label="Loading enquiries">
      <Heading fontFamily="heading" size="lg">
        Enquiries
      </Heading>
      <Box borderWidth="1px" borderColor="border" rounded="lg" p="5">
        <Stack gap="4">
          <Skeleton height="8" />
          <Skeleton height="8" />
          <Skeleton height="8" />
        </Stack>
      </Box>
    </Stack>
  );
}
