"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Heading,
  HStack,
  Image,
  Input,
  NativeSelect,
  Stack,
  Tag,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Category, Color, Material } from "@/lib/api";
import type { AdminProduct } from "@/lib/admin-api";
import {
  deleteProductAction,
  publishProductAction,
  restoreProductAction,
  updateProductAction,
} from "../actions";
import { VariantsSection } from "./variants-section";
import { ImagesSection } from "./images-section";

const INTERNAL_COPY_PATTERN = /\b(?:admin(?:\s+catalog)?|internal|placeholder|refine|tbd|todo)\b/i;

function nullableText(value: string): string | null {
  return value.trim() ? value : null;
}

function nullablePositiveNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
    measured_width_cm: product.measured_width_cm?.toString() ?? "",
    measured_length_cm: product.measured_length_cm?.toString() ?? "",
    set_contents: product.set_contents ?? "",
    category_id: product.category_id,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationError, setPublicationError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const hasCustomerSafeDescription = Boolean(
    form.description.trim() && !INTERNAL_COPY_PATTERN.test(form.description),
  );
  const hasCareInstructions = Boolean(form.care_instructions.trim());
  const hasMeasuredDimensions =
    nullablePositiveNumber(form.measured_width_cm) !== null &&
    nullablePositiveNumber(form.measured_length_cm) !== null;
  const hasSetContents = Boolean(form.set_contents.trim());
  const hasAvailableVariant = product.variants.some(
    (variant) => variant.is_active && variant.price > 0 && variant.stock_quantity > 0,
  );
  const hasPrimaryGallery = product.images.some(
    (image) => image.image_role === "GALLERY" && image.is_primary,
  );
  const isComplete =
    hasCustomerSafeDescription &&
    hasCareInstructions &&
    hasMeasuredDimensions &&
    hasSetContents &&
    hasAvailableVariant &&
    hasPrimaryGallery;
  const isDraft = !product.is_active && product.published_at === null;
  const isHidden = !product.is_active && product.published_at !== null;
  const status = product.is_active ? "Published" : isHidden ? "Hidden" : "Draft";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.category_id) {
      setError("Name, slug, and category are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const result = await updateProductAction(product.id, product.slug, {
      name: form.name,
      slug: form.slug,
      // Empty strings are intentional clears. Omitting these keys means the
      // backend cannot distinguish “clear” from “leave unchanged”.
      description: nullableText(form.description),
      care_instructions: nullableText(form.care_instructions),
      measured_width_cm: nullablePositiveNumber(form.measured_width_cm),
      measured_length_cm: nullablePositiveNumber(form.measured_length_cm),
      set_contents: nullableText(form.set_contents),
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
      setSaved(true);
      router.refresh();
    }
  }

  async function handlePublication(action: "publish" | "restore") {
    setPublishing(true);
    setPublicationError(null);
    const result =
      action === "publish"
        ? await publishProductAction(product.id, product.slug)
        : await restoreProductAction(product.id, product.slug);
    setPublishing(false);
    if (!result.ok) {
      setPublicationError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Stack gap="8">
      <HStack justify="space-between" align="start" gap="4" wrap="wrap">
        <HStack gap="3">
          <Heading fontFamily="heading" size="lg">
            {product.name}
          </Heading>
          <Tag.Root
            colorPalette={product.is_active ? "green" : isHidden ? "orange" : "gray"}
            size="sm"
          >
            <Tag.Label>{status}</Tag.Label>
          </Tag.Root>
        </HStack>
        <HStack gap="2" wrap="wrap">
          <Button size="sm" variant="outline" onClick={() => setPreviewOpen((open) => !open)}>
            {previewOpen ? "Close preview" : "Preview"}
          </Button>
          {product.is_active ? (
            <ConfirmDeleteDialog
              trigger={
                <Button size="sm" colorPalette="red" variant="outline">
                  Hide product
                </Button>
              }
              title="Hide product"
              description={`This hides "${product.name}" from the public catalog. It can be restored after the completeness checks pass.`}
              onConfirm={async () => {
                const result = await deleteProductAction(product.id, product.slug);
                if (!result.ok) throw new Error(result.error);
                router.refresh();
              }}
            />
          ) : isDraft ? (
            <Button
              size="sm"
              colorPalette="primary"
              loading={publishing}
              disabled={!isComplete}
              onClick={() => void handlePublication("publish")}
            >
              Publish
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              loading={publishing}
              disabled={!isComplete}
              onClick={() => void handlePublication("restore")}
            >
              Restore
            </Button>
          )}
        </HStack>
      </HStack>

      {isDraft && !isComplete && (
        <Text color="fg.muted" fontSize="sm" role="status">
          Publish when customer-safe copy, care instructions, measured dimensions, set contents, an active material-backed variant with positive price and stock, and a primary gallery image are present.
        </Text>
      )}
      {isHidden && !isComplete && (
        <Text color="fg.muted" fontSize="sm" role="status">
          Restore when customer-safe copy, care instructions, measured dimensions, set contents, an active material-backed variant with positive price and stock, and a primary gallery image are present.
        </Text>
      )}
      {isHidden && isComplete && (
        <Text color="fg.muted" fontSize="sm" role="status">
          This hidden product is not customer-visible. Restore it when you are ready.
        </Text>
      )}
      {publicationError && (
        <Text color="red.600" fontSize="sm" role="alert">
          {publicationError}
        </Text>
      )}

      {previewOpen && (
        <Box borderWidth="1px" borderColor="border" borderRadius="lg" p="6" bg="bg.panel" aria-label="Customer preview">
          <Stack gap="4" maxW="xl">
            <Heading fontFamily="heading" size="md">
              Customer preview
            </Heading>
            {product.images.find((image) => image.image_role === "GALLERY" && image.is_primary) && (
              <Image
                src={product.images.find((image) => image.image_role === "GALLERY" && image.is_primary)?.url}
                alt={product.name}
                maxH="260px"
                objectFit="cover"
                borderRadius="md"
              />
            )}
            <Heading size="lg">{form.name}</Heading>
            <Text>{form.description || "Description is not ready for customers yet."}</Text>
            {hasMeasuredDimensions && (
              <Text color="fg.muted">
                {form.measured_width_cm} × {form.measured_length_cm} cm
              </Text>
            )}
            {form.set_contents && <Text color="fg.muted">Set: {form.set_contents}</Text>}
            {form.care_instructions && <Text color="fg.muted">{form.care_instructions}</Text>}
            <Text fontSize="sm" color="fg.muted">
              {product.variants.filter((variant) => variant.is_active).length} active variant(s)
            </Text>
          </Stack>
        </Box>
      )}

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
          <HStack gap="4" align="start">
            <Field label="Measured width (cm)" optionalText="Required to publish">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.measured_width_cm}
                onChange={(e) => setForm({ ...form, measured_width_cm: e.target.value })}
              />
            </Field>
            <Field label="Measured length (cm)" optionalText="Required to publish">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.measured_length_cm}
                onChange={(e) => setForm({ ...form, measured_length_cm: e.target.value })}
              />
            </Field>
          </HStack>
          <Field label="Set contents" optionalText="Required to publish">
            <Textarea
              value={form.set_contents}
              onChange={(e) => setForm({ ...form, set_contents: e.target.value })}
              placeholder="For example: 1 bedspread and 2 pillow covers"
            />
          </Field>
          <Button type="submit" colorPalette="primary" loading={submitting} alignSelf="flex-start">
            Save changes
          </Button>
          {saved && (
            <Text color="green.700" fontSize="sm" role="status">
              Changes saved. The detail view has been refreshed.
            </Text>
          )}
        </Stack>
      </Box>

      <VariantsSection product={product} materials={materials} colors={colors} />
      <ImagesSection product={product} />
    </Stack>
  );
}
