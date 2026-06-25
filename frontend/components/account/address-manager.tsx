"use client";

import { useState } from "react";
import type { Address, AddressInput } from "@/lib/customer-api";
import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
} from "@/app/(shop)/account/(dashboard)/actions";

const EMPTY_FORM: AddressInput = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  is_default: false,
};

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    setPendingDeleteId(id);
    const result = await deleteAddressAction(id);
    setPendingDeleteId(null);
    if ("error" in result) setError(result.error);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title-sm text-on-surface">Saved Addresses</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-label-caps text-primary hover:underline"
          >
            + Add address
          </button>
        )}
      </div>

      {error && <p className="text-body-sm text-error mb-4">{error}</p>}

      <div className="flex flex-col gap-3">
        {addresses.length === 0 && !showAddForm && (
          <p className="text-body-sm text-on-surface-variant">No saved addresses yet.</p>
        )}
        {addresses.map((address) =>
          editingId === address.id ? (
            <AddressForm
              key={address.id}
              initial={{
                full_name: address.full_name,
                phone: address.phone,
                line1: address.line1,
                line2: address.line2 ?? "",
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                country: address.country,
                is_default: address.is_default,
              }}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
              onError={setError}
              submit={(input) => updateAddressAction(address.id, input)}
            />
          ) : (
            <div
              key={address.id}
              className="border border-outline-variant rounded-sm p-4 flex items-start justify-between gap-4"
            >
              <div className="text-body-sm text-on-surface-variant">
                <p className="text-body-md text-on-surface font-medium">
                  {address.full_name}
                  {address.is_default && (
                    <span className="ml-2 text-label-caps text-primary">Default</span>
                  )}
                </p>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.pincode}
                </p>
                <p>{address.country}</p>
                <p>{address.phone}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(address.id)}
                  className="text-label-caps text-on-surface-variant hover:text-primary transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  disabled={pendingDeleteId === address.id}
                  className="text-label-caps text-error hover:underline disabled:opacity-60"
                >
                  {pendingDeleteId === address.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {showAddForm && (
        <div className="mt-4">
          <AddressForm
            initial={EMPTY_FORM}
            onCancel={() => setShowAddForm(false)}
            onSaved={() => setShowAddForm(false)}
            onError={setError}
            submit={(input) => createAddressAction(input)}
          />
        </div>
      )}
    </div>
  );
}

function AddressForm({
  initial,
  onCancel,
  onSaved,
  onError,
  submit,
}: {
  initial: AddressInput;
  onCancel: () => void;
  onSaved: () => void;
  onError: (message: string | null) => void;
  submit: (input: AddressInput) => Promise<{ ok: true } | { error: string }>;
}) {
  const [form, setForm] = useState<AddressInput>(initial);
  const [submitting, setSubmitting] = useState(false);

  function field<K extends keyof AddressInput>(key: K) {
    return {
      value: (form[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setSubmitting(true);
    try {
      const result = await submit(form);
      if ("error" in result) {
        onError(result.error);
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-outline-variant rounded-sm p-4 flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Full name</span>
          <input required className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("full_name")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">Phone</span>
          <input required className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("phone")} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps text-on-surface-variant">Address line 1</span>
        <input required className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("line1")} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-label-caps text-on-surface-variant">Address line 2 (optional)</span>
        <input className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("line2")} />
      </label>
      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">City</span>
          <input required className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("city")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">State</span>
          <input required className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm" {...field("state")} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-label-caps text-on-surface-variant">PIN code</span>
          <input
            required
            pattern="[1-9][0-9]{5}"
            title="6-digit Indian PIN code"
            className="border border-outline-variant rounded-sm px-3 py-2 text-body-sm"
            {...field("pincode")}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
        <input
          type="checkbox"
          checked={form.is_default ?? false}
          onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
        />
        Set as default address
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-on-primary rounded-sm px-4 py-2 text-label-caps disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-label-caps text-on-surface-variant hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
