import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { getCurrentUser } from "@/lib/user-auth";

export default async function ProtectedGamesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      redirect("/account/login?next=/games");
    }
  }

  return children;
}
