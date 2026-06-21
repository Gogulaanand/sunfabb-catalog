"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Dialog, Heading, HStack, Input, Portal, Stack, Table } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Color } from "@/lib/api";
import { createColorAction, deleteColorAction, updateColorAction } from "./actions";

interface ColorFormState {
  name: string;
  hex_code: string;
}

function ColorFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initial: ColorFormState;
  onSubmit: (form: ColorFormState) => Promise<{ ok: boolean; error?: string }>;
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
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save color");
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
                  <Field label="Name">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </Field>
                  <Field label="Hex code" optionalText="Optional" errorText={error ?? undefined} invalid={!!error}>
                    <Input
                      value={form.hex_code}
                      onChange={(e) => setForm({ ...form, hex_code: e.target.value })}
                      placeholder="#973100"
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

export function ColorsClient({ colors }: { colors: Color[] }) {
  const router = useRouter();

  return (
    <Box>
      <HStack justify="space-between" mb="6">
        <Heading fontFamily="heading" size="lg">
          Colors
        </Heading>
        <ColorFormDialog
          trigger={<Button colorPalette="primary">Add color</Button>}
          title="Add color"
          initial={{ name: "", hex_code: "" }}
          onSubmit={async (form) => {
            const result = await createColorAction({ name: form.name, hex_code: form.hex_code || undefined });
            return result.ok ? { ok: true } : { ok: false, error: result.error };
          }}
        />
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Swatch</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {colors.map((color) => (
            <Table.Row key={color.id}>
              <Table.Cell>{color.name}</Table.Cell>
              <Table.Cell>
                {color.hex_code && (
                  <HStack gap="2">
                    <Box w="4" h="4" borderRadius="full" borderWidth="1px" borderColor="border" bg={color.hex_code} />
                    {color.hex_code}
                  </HStack>
                )}
              </Table.Cell>
              <Table.Cell textAlign="end">
                <HStack justify="flex-end" gap="2">
                  <ColorFormDialog
                    trigger={
                      <Button size="xs" variant="outline">
                        Edit
                      </Button>
                    }
                    title="Edit color"
                    initial={{ name: color.name, hex_code: color.hex_code ?? "" }}
                    onSubmit={async (form) => {
                      const result = await updateColorAction(String(color.id), {
                        name: form.name,
                        hex_code: form.hex_code || undefined,
                      });
                      return result.ok ? { ok: true } : { ok: false, error: result.error };
                    }}
                  />
                  <ConfirmDeleteDialog
                    trigger={
                      <Button size="xs" colorPalette="red" variant="outline">
                        Delete
                      </Button>
                    }
                    title="Delete color"
                    description={`This permanently deletes "${color.name}". This cannot be undone.`}
                    onConfirm={async () => {
                      const result = await deleteColorAction(String(color.id));
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
    </Box>
  );
}
