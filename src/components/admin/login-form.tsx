"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormErrors = {
  username?: string;
  password?: string;
  form?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};

    if (!username.trim()) {
      nextErrors.username = "Username is required";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required";
    }

    if (nextErrors.username || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;

        setErrors({
          form: result?.error ?? "Invalid credentials",
        });
        return;
      }

      router.replace("/admin");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-medium text-foreground">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? "username-error" : undefined}
          required
        />
        {errors.username ? (
          <p id="username-error" className="text-sm text-destructive">
            {errors.username}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          required
        />
        {errors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        ) : null}
      </div>

      {errors.form ? (
        <p
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errors.form}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
