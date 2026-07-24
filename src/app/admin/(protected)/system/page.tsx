import { SystemHealthDashboard } from "@/components/admin/system-health-dashboard";
import { getSystemHealthSnapshot } from "@/lib/admin/system-health";
import { getRequestI18n } from "@/lib/i18n/server";
import { getSystemHealthCopy } from "@/lib/system-health-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSystemHealthPage() {
  const { locale } = await getRequestI18n();

  return (
    <SystemHealthDashboard
      initialSnapshot={getSystemHealthSnapshot()}
      copy={getSystemHealthCopy(locale)}
      locale={locale}
    />
  );
}
