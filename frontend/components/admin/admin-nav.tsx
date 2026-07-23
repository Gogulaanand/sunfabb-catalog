"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button, HStack, Link, Stack } from "@chakra-ui/react";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/colors", label: "Colors" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Box as="nav" borderBottomWidth="1px" borderColor="border" bg="bg.panel">
      <Stack maxW="6xl" mx="auto" px="6" py="3" gap="3">
        <HStack justify="space-between">
          <Box fontFamily="heading" fontWeight="600" fontSize="lg">
            Sunfabb Admin
          </Box>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </HStack>
        <Box overflowX="auto" maxW="100%">
          <HStack gap="4" fontSize="sm" minW="max-content" whiteSpace="nowrap">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                asChild
                fontWeight={pathname === link.href ? "600" : "400"}
                textDecoration={pathname === link.href ? "underline" : "none"}
              >
                <NextLink href={link.href}>{link.label}</NextLink>
              </Link>
            ))}
          </HStack>
        </Box>
      </Stack>
    </Box>
  );
}
