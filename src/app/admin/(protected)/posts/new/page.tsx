import { createPostAction } from "@/actions/posts";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { getPostCategories } from "@/lib/posts";

export default async function NewAdminPostPage() {
  const categories = await getPostCategories();

  return (
    <PostEditorForm
      mode="create"
      categories={categories}
      action={createPostAction}
      initialValues={{
        title: "",
        slug: "",
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
