"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Dialog, Heading, HStack, Input, NativeSelect, Portal, Stack, Table } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Color, Material } from "@/lib/api";
import { formatPrice } from "@/lib/api";
import type { AdminProduct, AdminProductVariant } from "@/lib/admin-api";
import { addVariantAction, deleteVariantAction, updateVariantAction } from "../actions";

function rupeesToPaise(rupees: string): number {
  return Math.round(parseFloat(rupees) * 100);
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

interface VariantFormState {
  material_id: string;
  color_id: string;
  size: string;
  price: string;
  stock_quantity: string;
  sku: string;
}

function VariantFormDialog({
  trigger,
  title,
  initial,
  materials,
  colors,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initial: VariantFormState;
  materials: Material[];
  colors: Color[];
  onSubmit: (form: VariantFormState) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setForm(initial);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.material_id || !form.color_id || !form.size || !form.price || !form.stock_quantity || !form.sku) {
      setError("All fields are required.");
      return;
    }
    if (Number.isNaN(rupeesToPaise(form.price))) {
      setError("Price must be a valid number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save variant");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => handleOpenChange(e.open)}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Box as="form" onSubmit={handleSubmit}>
              <Dialog.Header>
                <Dialog.Title>{title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap="4">
                  <Field label="Material">
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.material_id}
                        onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                      >
                        {materials.map((material) => (
                          <option key={material.id} value={String(material.id)}>
                            {material.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>
                  <Field label="Color">
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={form.color_id}
                        onChange={(e) => setForm({ ...form, color_id: e.target.value })}
                      >
                        {colors.map((color) => (
                          <option key={color.id} value={String(color.id)}>
                            {color.name}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field>
                  <Field label="Size">
                    <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} required />
                  </Field>
                  <Field label="Price (₹)">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Stock quantity">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock_quantity}
                      onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="SKU" errorText={error ?? undefined} invalid={!!error}>
                    <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
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
                  Save
                </Button>
              </Dialog.Footer>
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

const EMPTY_VARIANT_FORM: VariantFormState = {
  material_id: "",
  color_id: "",
  size: "",
  price: "",
  stock_quantity: "",
  sku: "",
};

export function VariantsSection({
  product,
  materials,
  colors,
}: {
  product: AdminProduct;
  materials: Material[];
  colors: Color[];
}) {
  const router = useRouter();

  return (
    <Box borderWidth="1px" borderColor="border" borderRadius="lg" p="6" bg="bg.panel">
      <HStack justify="space-between" mb="4">
        <Heading fontFamily="heading" size="md">
          Variants
        </Heading>
        <VariantFormDialog
          trigger={<Button size="sm" colorPalette="primary">Add variant</Button>}
          title="Add variant"
          initial={{
            ...EMPTY_VARIANT_FORM,
            material_id: materials[0] ? String(materials[0].id) : "",
            color_id: colors[0] ? String(colors[0].id) : "",
          }}
          materials={materials}
          colors={colors}
          onSubmit={async (form) => {
            const result = await addVariantAction(product.id, product.slug, {
              material_id: form.material_id,
              color_id: form.color_id,
              size: form.size,
              price: rupeesToPaise(form.price),
              stock_quantity: parseInt(form.stock_quantity, 10),
              sku: form.sku,
            });
            return result.ok ? { ok: true } : { ok: false, error: result.error };
          }}
        />
      </HStack>

      {product.variants.length === 0 ? (
        <Box color="fg.muted" fontSize="sm">
          No variants yet.
        </Box>
      ) : (
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>SKU</Table.ColumnHeader>
              <Table.ColumnHeader>Size</Table.ColumnHeader>
              <Table.ColumnHeader>Material</Table.ColumnHeader>
              <Table.ColumnHeader>Color</Table.ColumnHeader>
              <Table.ColumnHeader>Price</Table.ColumnHeader>
              <Table.ColumnHeader>Stock</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {product.variants.map((variant: AdminProductVariant) => (
              <Table.Row key={variant.id}>
                <Table.Cell>{variant.sku}</Table.Cell>
                <Table.Cell>{variant.size}</Table.Cell>
                <Table.Cell>{variant.material.name}</Table.Cell>
                <Table.Cell>{variant.color.name}</Table.Cell>
                <Table.Cell>{formatPrice(variant.price)}</Table.Cell>
                <Table.Cell>{variant.stock_quantity}</Table.Cell>
                <Table.Cell textAlign="end">
                  <HStack justify="flex-end" gap="2">
                    <VariantFormDialog
                      trigger={
                        <Button size="xs" variant="outline">
                          Edit
                        </Button>
                      }
                      title="Edit variant"
                      initial={{
                        material_id: variant.material_id,
                        color_id: variant.color_id,
                        size: variant.size,
                        price: paiseToRupees(variant.price),
                        stock_quantity: String(variant.stock_quantity),
                        sku: variant.sku,
                      }}
                      materials={materials}
                      colors={colors}
                      onSubmit={async (form) => {
                        const result = await updateVariantAction(variant.id, product.slug, {
                          material_id: form.material_id,
                          color_id: form.color_id,
                          size: form.size,
                          price: rupeesToPaise(form.price),
                          stock_quantity: parseInt(form.stock_quantity, 10),
                          sku: form.sku,
                        });
                        return result.ok ? { ok: true } : { ok: false, error: result.error };
                      }}
                    />
                    <ConfirmDeleteDialog
                      trigger={
                        <Button size="xs" colorPalette="red" variant="outline">
                          Remove
                        </Button>
                      }
                      title="Remove variant"
                      description={`This deactivates the "${variant.sku}" variant. It can be reactivated later via the API.`}
                      onConfirm={async () => {
                        const result = await deleteVariantAction(variant.id, product.slug);
                        if (!result.ok) throw new Error(result.error);
                        router.refresh();
                      }}
                    />
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
}
