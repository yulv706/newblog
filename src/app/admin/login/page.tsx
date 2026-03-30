import { LoginForm } from "@/components/admin/login-form";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto w-full max-w-md py-16">
      <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Login</h1>
          <p className="text-sm text-muted">
            Sign in to access your admin dashboard.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
