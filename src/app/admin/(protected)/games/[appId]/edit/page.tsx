import { notFound } from "next/navigation";
import { updateSteamGameAction } from "@/actions/games";
import { SteamGameEditorForm } from "@/components/admin/steam-game-editor-form";
import { getSteamGameByAppId } from "@/lib/games";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditSteamGamePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId: appIdParam } = await params;
  const appId = Number.parseInt(appIdParam, 10);
  if (!Number.isInteger(appId) || appId <= 0) {
    notFound();
  }

  const game = await getSteamGameByAppId(appId);
  if (!game) {
    notFound();
  }

  return <SteamGameEditorForm game={game} action={updateSteamGameAction.bind(null, appId)} />;
}
