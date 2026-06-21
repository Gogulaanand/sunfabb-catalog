import NextLink from "next/link";
import { Box, Heading, Link, SimpleGrid, Text } from "@chakra-ui/react";

const SECTIONS = [
  { href: "/admin/categories", label: "Categories", description: "Shop sections, e.g. Bedspreads, Towels." },
  { href: "/admin/materials", label: "Materials", description: "Fabric lookup table used by variants." },
  { href: "/admin/colors", label: "Colors", description: "Color lookup table used by variants." },
  { href: "/admin/products", label: "Products", description: "Catalog products, variants, and images." },
];

export default function AdminDashboardPage() {
  return (
    <Box>
      <Heading fontFamily="heading" size="xl" mb="6">
        Catalog Admin
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
        {SECTIONS.map((section) => (
          <Box
            key={section.href}
            borderWidth="1px"
            borderColor="border"
            borderRadius="lg"
            p="5"
            bg="bg.panel"
          >
            <Link asChild fontWeight="600" fontSize="lg">
              <NextLink href={section.href}>{section.label}</NextLink>
            </Link>
            <Text color="fg.muted" fontSize="sm" mt="1">
              {section.description}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
