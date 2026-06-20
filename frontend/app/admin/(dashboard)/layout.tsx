import { Box } from "@chakra-ui/react";
import { AdminNav } from "@/components/admin/admin-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100vh" bg="bg" fontFamily="body" color="fg">
      <AdminNav />
      <Box as="main" maxW="6xl" mx="auto" px="6" py="8">
        {children}
      </Box>
    </Box>
  );
}
