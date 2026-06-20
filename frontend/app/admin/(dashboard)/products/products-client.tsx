"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  Box,
  Button,
  Dialog,
  Heading,
  HStack,
  Input,
  Link,
  NativeSelect,
  Portal,
  Stack,
  Table,
  Tag,
  Textarea,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import type { Category } from "@/lib/api";
import type { AdminProductListItem } from "@/lib/admin-api";
import { formatPrice } from "@/lib/api";
import { createProductAction } from "./actions";

interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  care_instructions: string;
  category_id: string;
}

function CreateProductDialog({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>({
    name: "",
    slug: "",
    description: "",
    care_instructions: "",
    category_id: categories[0] ? String(categories[0].id) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.category_id) {
      setError("Name, slug, and category are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await createProductAction({
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      care_instructions: form.care_instructions || undefined,
      category_id: form.category_id,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/admin/products/${result.data.slug}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
      <Dialog.Trigger asChild>
        <Button colorPalette="primary">Add product</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Box as="form" onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>Add product</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Field label="Name">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </Field>
                  <Field label="Slug">
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
                  </Field>
                  <Field label="Category">
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>
                  <Field label="Description" optionalText="Optional">
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </Field>
                  <Field label="Care instructions" optionalText="Optional" errorText={error ?? undefined} invalid={!!error}>
                    <Textarea
                      value={form.care_instructions}
                      onChange={(e) => setForm({ ...form, care_instructions: e.target.value })}
                    />
                  </Field>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Dialog.ActionTrigger>
                <Button type="submit" colorPalette="primary" loading={submitting}>
                  Create
                </Button>
              </Dialog.Footer>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

export function ProductsClient({
  products,
  categories,
}: {
  products: AdminProductListItem[];
  categories: Category[];
}) {
  return (
    <Box>
      <HStack justify="space-between" mb="6">
        <Heading fontFamily="heading" size="lg">
          Products
        </Heading>
        <CreateProductDialog categories={categories} />
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>From price</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {products.map((product) => (
            <Table.Row key={product.id}>
              <Table.Cell>{product.name}</Table.Cell>
              <Table.Cell>{product.category.name}</Table.Cell>
              <Table.Cell>{product.variants[0] ? formatPrice(product.variants[0].price) : "—"}</Table.Cell>
              <Table.Cell>
                <Tag.Root colorPalette={product.is_active ? "green" : "gray"} size="sm">
                  <Tag.Label>{product.is_active ? "Active" : "Inactive"}</Tag.Label>
                </Tag.Root>
              </Table.Cell>
              <Table.Cell textAlign="end">
                <Link asChild fontSize="sm" fontWeight="600">
                  <NextLink href={`/admin/products/${product.slug}`}>Manage</NextLink>
                </Link>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
