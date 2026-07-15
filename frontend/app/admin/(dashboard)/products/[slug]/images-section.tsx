"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  FileUpload,
  Heading,
  HStack,
  Icon,
  Image,
  NativeSelect,
  SimpleGrid,
  Stack,
  Tag,
  Text,
} from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { ProductImageRole } from "@/lib/api";
import type { AdminProduct } from "@/lib/admin-api";
import { deleteImageAction, uploadAndAddImageAction } from "../actions";

function isProductImageRole(value: string): value is ProductImageRole {
  return value === "GALLERY" || value === "SWATCH";
}

export function ImagesSection({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState("");
  const [imageRole, setImageRole] = useState<ProductImageRole>("GALLERY");
  const swatchNeedsVariant = imageRole === "SWATCH" && !variantId;

  async function handleFileChange(files: File[]) {
    if (files.length === 0) return;
    if (swatchNeedsVariant) {
      setError("Select a variant before uploading a swatch.");
      return;
    }
    setUploading(true);
    setError(null);

    const startingSortOrder = product.images.length;
    const hasPrimaryGallery = product.images.some(
      (image) => image.image_role === "GALLERY" && image.is_primary,
    );
    const errors: string[] = [];
    for (const [index, file] of files.entries()) {
      const result = await uploadAndAddImageAction(product.id, product.slug, file, {
        sort_order: startingSortOrder + index,
        is_primary: imageRole === "GALLERY" && !hasPrimaryGallery && index === 0,
        image_role: imageRole,
        ...(variantId ? { variant_id: variantId } : {}),
      });
      if (!result.ok) errors.push(result.error);
    }

    setUploading(false);
    if (errors.length > 0) {
      setError(errors.join("; "));
    }
    router.refresh();
  }

  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="lg" p="6" bg="bg.panel">
      <Heading fontFamily="heading" size="md" mb="4">
        Images
      </Heading>

      <Stack gap="3" mb="4">
        <Field
          label="Variant"
          required={imageRole === "SWATCH"}
          helperText={
            imageRole === "SWATCH"
              ? "Required for stored swatches. Swatches are never shown publicly."
              : "Leave blank to share a gallery image across every variant."
          }
        >
          <NativeSelect.Root>
            <NativeSelect.Field value={variantId} onChange={(event) => setVariantId(event.target.value)}>
              <option value="">Shared across all colors</option>
              {product.variants
                .filter((variant) => variant.is_active)
                .map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.sku} · {variant.color.name} · {variant.size}
                  </option>
                ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field>

        <Field label="Image role">
          <NativeSelect.Root>
            <NativeSelect.Field
              value={imageRole}
              onChange={(event) => {
                const nextRole = event.target.value;
                if (isProductImageRole(nextRole)) setImageRole(nextRole);
              }}
            >
              <option value="GALLERY">Gallery photo</option>
              <option value="SWATCH">Swatch</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field>
      </Stack>

      <FileUpload.Root
        accept={["image/png", "image/jpeg", "image/webp"]}
        maxFiles={10}
        onFileAccept={(details) => handleFileChange(details.files)}
        mb="4"
      >
        <FileUpload.HiddenInput />
        <FileUpload.Trigger asChild>
          <Button
            size="sm"
            variant="outline"
            loading={uploading}
            disabled={swatchNeedsVariant}
          >
            <Icon>
              <LuUpload />
            </Icon>
            Upload images
          </Button>
        </FileUpload.Trigger>
      </FileUpload.Root>

      {error && (
        <Text color="red.600" fontSize="sm" mb="4">
          {error}
        </Text>
      )}

      {product.images.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          No images yet.
        </Text>
      ) : (
        <SimpleGrid columns={{ base: 2, sm: 4 }} gap="4">
          {product.images.map((image) => (
            <Box key={image.id} position="relative" borderWidth="1px" borderColor="border" borderRadius="md" overflow="hidden">
              <Image src={image.url} alt={image.alt_text ?? ""} w="full" aspectRatio={3 / 4} objectFit="cover" />
              <HStack position="absolute" top="2" left="2" gap="1">
                {image.is_primary && (
                  <Tag.Root size="sm" colorPalette="primary">
                    <Tag.Label>Primary</Tag.Label>
                  </Tag.Root>
                )}
                <Tag.Root size="sm" colorPalette="gray">
                  <Tag.Label>
                    {image.variant_id
                      ? (() => {
                          const variant = product.variants.find((item) => item.id === image.variant_id);
                          return variant
                            ? `${variant.sku} · ${variant.color.name}`
                            : "Unknown variant";
                        })()
                      : "Shared across all colors"}
                  </Tag.Label>
                </Tag.Root>
              </HStack>
              <Box p="2">
                <Text fontSize="xs" color="fg.muted" mb="2">
                  {image.image_role === "SWATCH" ? "Swatch" : "Gallery photo"}
                </Text>
                <ConfirmDeleteDialog
                  trigger={
                    <Button size="xs" colorPalette="red" variant="outline" w="full">
                      Delete
                    </Button>
                  }
                  title="Delete image"
                  description="This permanently removes the image. This cannot be undone."
                  onConfirm={async () => {
                    const result = await deleteImageAction(image.id, product.slug);
                    if (!result.ok) throw new Error(result.error);
                    router.refresh();
                  }}
                />
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
