import { saveAboutContentAction } from "@/actions/about";
import { AboutEditorForm } from "@/components/admin/about-editor-form";
import { getAboutContent } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAboutPage() {
  const aboutContent = (await getAboutContent()) ?? "";

  return (
    <AboutEditorForm
      initialContent={aboutContent}
      action={saveAboutContentAction}
    />
  );
}
