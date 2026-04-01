import { saveAboutContentAction } from "@/actions/about";
import { AboutEditorForm } from "@/components/admin/about-editor-form";
import { getRequestI18n } from "@/lib/i18n/server";
import { getAboutContent } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAboutPage() {
  const { dictionary } = await getRequestI18n();
  dictionary.admin.about.title;
  const aboutContent = (await getAboutContent()) ?? "";

  return (
    <AboutEditorForm
      initialContent={aboutContent}
      action={saveAboutContentAction}
    />
  );
}
