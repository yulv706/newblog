import { notFound } from "next/navigation";
import { updatePostAction } from "@/actions/posts";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { getTagOptions } from "@/lib/admin/category-tags";
import { getPostCategories, getPostForEdit } from "@/lib/posts";

type EditAdminPostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminPostPage({ params }: EditAdminPostPageProps) {
  const { id } = await params;
  const postId = Number.parseInt(id, 10);

  if (Number.isNaN(postId)) {
    notFound();
  }

  const [categories, tagOptions, post] = await Promise.all([
    getPostCategories(),
    getTagOptions(),
    getPostForEdit(postId),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <PostEditorForm
      mode="edit"
      categories={categories}
      availableTags={tagOptions.map((tag) => tag.name)}
      action={updatePostAction}
      postId={post.id}
      initialValues={{
        title: post.title,
        slug: post.slug,
        date: post.publishedAt ?? post.createdAt,
        content: post.content,
        excerpt: post.excerpt ?? "",
        categoryId: post.categoryId ? String(post.categoryId) : "",
        tags: post.tags.join(", "),
        coverImage: post.coverImage ?? "",
        status: post.status,
      }}
    />
  );
}
