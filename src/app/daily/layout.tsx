import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getCurrentUser } from "@/lib/user-auth";

export default async function ProtectedDailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      redirect("/account/login?next=/daily");
    }
  }

  return children;
}
