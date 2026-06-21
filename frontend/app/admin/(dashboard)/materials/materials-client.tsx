"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Dialog, Heading, HStack, Input, Portal, Table } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Material } from "@/lib/api";
import { createMaterialAction, deleteMaterialAction, updateMaterialAction } from "./actions";

function MaterialFormDialog({
  trigger,
  title,
  initialName,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initialName: string;
  onSubmit: (name: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(initialName);
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(name);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save material");
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
                <Field label="Name" errorText={error ?? undefined} invalid={!!error}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </Field>
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

export function MaterialsClient({ materials }: { materials: Material[] }) {
  const router = useRouter();

  return (
    <Box>
      <HStack justify="space-between" mb="6">
        <Heading fontFamily="heading" size="lg">
          Materials
        </Heading>
        <MaterialFormDialog
          trigger={<Button colorPalette="primary">Add material</Button>}
          title="Add material"
          initialName=""
          onSubmit={async (name) => {
            const result = await createMaterialAction({ name });
            return result.ok ? { ok: true } : { ok: false, error: result.error };
          }}
        />
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {materials.map((material) => (
            <Table.Row key={material.id}>
              <Table.Cell>{material.name}</Table.Cell>
              <Table.Cell textAlign="end">
                <HStack justify="flex-end" gap="2">
                  <MaterialFormDialog
                    trigger={
                      <Button size="xs" variant="outline">
                        Edit
                      </Button>
                    }
                    title="Edit material"
                    initialName={material.name}
                    onSubmit={async (name) => {
                      const result = await updateMaterialAction(String(material.id), { name });
                      return result.ok ? { ok: true } : { ok: false, error: result.error };
                    }}
                  />
                  <ConfirmDeleteDialog
                    trigger={
                      <Button size="xs" colorPalette="red" variant="outline">
                        Delete
                      </Button>
                    }
                    title="Delete material"
                    description={`This permanently deletes "${material.name}". This cannot be undone.`}
                    onConfirm={async () => {
                      const result = await deleteMaterialAction(String(material.id));
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
