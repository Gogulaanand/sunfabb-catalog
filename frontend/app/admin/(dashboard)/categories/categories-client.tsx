"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Dialog, Heading, HStack, Input, Portal, Stack, Table, Text } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import type { Category } from "@/lib/api";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

const EMPTY_FORM: CategoryFormState = { name: "", slug: "", description: "", image_url: "" };

function CategoryFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
}: {
  trigger: React.ReactNode;
  title: string;
  initial: CategoryFormState;
  onSubmit: (form: CategoryFormState) => Promise<{ ok: boolean; error?: string }>;
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
    if (!form.name || !form.slug) {
      setError("Name and slug are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to save category");
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
                  <Field label="Slug">
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
                  </Field>
                  <Field label="Description" optionalText="Optional">
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </Field>
                  <Field label="Image URL" optionalText="Optional" errorText={error ?? undefined} invalid={!!error}>
                    <Input
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      placeholder="https://..."
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

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();

  return (
    <Box>
      <HStack justify="space-between" mb="6">
        <Heading fontFamily="heading" size="lg">
          Categories
        </Heading>
        <CategoryFormDialog
          trigger={<Button colorPalette="primary">Add category</Button>}
          title="Add category"
          initial={EMPTY_FORM}
          onSubmit={async (form) => {
            const result = await createCategoryAction({
              name: form.name,
              slug: form.slug,
              description: form.description || undefined,
              image_url: form.image_url || undefined,
            });
            return result.ok ? { ok: true } : { ok: false, error: result.error };
          }}
        />
      </HStack>

      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Slug</Table.ColumnHeader>
            <Table.ColumnHeader>Description</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {categories.map((category) => (
            <Table.Row key={category.id}>
              <Table.Cell>{category.name}</Table.Cell>
              <Table.Cell>{category.slug}</Table.Cell>
              <Table.Cell>
                <Text color="fg.muted" fontSize="sm">
                  {category.description ?? "—"}
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="end">
                <HStack justify="flex-end" gap="2">
                  <CategoryFormDialog
                    trigger={
                      <Button size="xs" variant="outline">
                        Edit
                      </Button>
                    }
                    title="Edit category"
                    initial={{
                      name: category.name,
                      slug: category.slug,
                      description: category.description ?? "",
                      image_url: category.image_url ?? "",
                    }}
                    onSubmit={async (form) => {
                      const result = await updateCategoryAction(String(category.id), {
                        name: form.name,
                        slug: form.slug,
                        description: form.description || undefined,
                        image_url: form.image_url || undefined,
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
                    title="Delete category"
                    description={`This permanently deletes "${category.name}". This cannot be undone.`}
                    onConfirm={async () => {
                      const result = await deleteCategoryAction(String(category.id));
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
