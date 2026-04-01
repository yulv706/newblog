import { LoginForm } from "@/components/admin/login-form";
import { getRequestI18n } from "@/lib/i18n/server";

export default async function AdminLoginPage() {
  const { dictionary } = await getRequestI18n();
  const loginDictionary = dictionary.admin.login;

  return (
    <div className="mx-auto w-full max-w-md py-16">
      <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{loginDictionary.title}</h1>
          <p className="text-sm text-muted">{loginDictionary.description}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
