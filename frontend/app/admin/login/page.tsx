"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Heading, Input, Stack } from "@chakra-ui/react";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Login failed" }));
        setError(body.message ?? "Invalid credentials");
        return;
      }

      router.push("/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="bg" px="4">
      <Box
        as="form"
        onSubmit={handleSubmit}
        bg="bg.panel"
        borderRadius="lg"
        boxShadow="md"
        p="8"
        w="full"
        maxW="sm"
      >
        <Stack gap="6">
          <Heading fontFamily="heading" size="lg" textAlign="center">
            Admin Login
          </Heading>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Password" errorText={error ?? undefined} invalid={!!error}>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" colorPalette="primary" loading={submitting}>
            Log in
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
