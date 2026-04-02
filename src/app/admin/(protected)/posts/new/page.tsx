import { createPostAction } from "@/actions/posts";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { getTagOptions } from "@/lib/admin/category-tags";
import { getRequestI18n } from "@/lib/i18n/server";
import { getPostCategories } from "@/lib/posts";

export default async function NewAdminPostPage() {
  await getRequestI18n();
  const [categories, tagOptions] = await Promise.all([
    getPostCategories(),
    getTagOptions(),
  ]);

  return (
    <PostEditorForm
      mode="create"
      categories={categories}
      availableTags={tagOptions.map((tag) => tag.name)}
      action={createPostAction}
      initialValues={{
        title: "",
        slug: "",
        date: "",
        content: "",
        excerpt: "",
        categoryId: "",
        tags: "",
        coverImage: "",
        status: "draft",
      }}
    />
  );
}
