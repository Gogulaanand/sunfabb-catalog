"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, FileUpload, Heading, HStack, Icon, Image, SimpleGrid, Tag, Text } from "@chakra-ui/react";
import { LuUpload } from "react-icons/lu";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { AdminProduct } from "@/lib/admin-api";
import { deleteImageAction, uploadAndAddImageAction } from "../actions";

export function ImagesSection({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    const result = await uploadAndAddImageAction(product.id, product.slug, files[0], {
      sort_order: product.images.length,
      is_primary: product.images.length === 0,
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="lg" p="6" bg="bg.panel">
      <Heading fontFamily="heading" size="md" mb="4">
        Images
      </Heading>

      <FileUpload.Root
        accept={["image/png", "image/jpeg", "image/webp"]}
        maxFiles={1}
        onFileAccept={(details) => handleFileChange(details.files)}
        mb="4"
      >
        <FileUpload.HiddenInput />
        <FileUpload.Trigger asChild>
          <Button size="sm" variant="outline" loading={uploading}>
            <Icon>
              <LuUpload />
            </Icon>
            Upload image
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
              </HStack>
              <Box p="2">
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
