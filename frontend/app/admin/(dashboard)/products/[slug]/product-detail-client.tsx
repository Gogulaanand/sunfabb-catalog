"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Tag,
  Textarea,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Category, Color, Material } from "@/lib/api";
import type { AdminProduct } from "@/lib/admin-api";
import { deleteProductAction, updateProductAction } from "../actions";
import { VariantsSection } from "./variants-section";
import { ImagesSection } from "./images-section";

export function ProductDetailClient({
  product,
  categories,
  materials,
  colors,
}: {
  product: AdminProduct;
  categories: Category[];
  materials: Material[];
  colors: Color[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    care_instructions: product.care_instructions ?? "",
    category_id: product.category_id,
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
    const result = await updateProductAction(product.id, product.slug, {
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
    if (form.slug !== product.slug) {
      router.push(`/admin/products/${form.slug}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Stack gap="8">
      <HStack justify="space-between">
        <HStack gap="3">
          <Heading fontFamily="heading" size="lg">
            {product.name}
          </Heading>
          <Tag.Root colorPalette={product.is_active ? "green" : "gray"} size="sm">
            <Tag.Label>{product.is_active ? "Active" : "Inactive"}</Tag.Label>
          </Tag.Root>
        </HStack>
        {product.is_active && (
          <ConfirmDeleteDialog
            trigger={
              <Button size="sm" colorPalette="red" variant="outline">
                Deactivate product
              </Button>
            }
            title="Deactivate product"
            description={`This hides "${product.name}" from the public catalog. It can be reactivated later.`}
            onConfirm={async () => {
              const result = await deleteProductAction(product.id);
              if (!result.ok) throw new Error(result.error);
              router.refresh();
            }}
          />
        )}
      </HStack>

      <Box as="form" onSubmit={handleSubmit} borderWidth="1px" borderColor="border" borderRadius="lg" p="6" bg="bg.panel">
        <Stack gap="4" maxW="lg">
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
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field
            label="Care instructions"
            optionalText="Optional"
            errorText={error ?? undefined}
            invalid={!!error}
          >
            <Textarea
              value={form.care_instructions}
              onChange={(e) => setForm({ ...form, care_instructions: e.target.value })}
            />
          </Field>
          <Button type="submit" colorPalette="primary" loading={submitting} alignSelf="flex-start">
            Save changes
          </Button>
        </Stack>
      </Box>

      <VariantsSection product={product} materials={materials} colors={colors} />
      <ImagesSection product={product} />
    </Stack>
  );
}
