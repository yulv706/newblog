"use client";

import { useLocaleContext } from "@/components/i18n/locale-provider";

type DeletePostButtonProps = {
  postId: number;
  postTitle: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function DeletePostButton({
  postId,
  postTitle,
  action,
}: DeletePostButtonProps) {
  const { dictionary } = useLocaleContext();
  const postsDictionary = dictionary.admin.posts;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const shouldDelete = window.confirm(
          postsDictionary.actions.deleteConfirmTemplate.replace("{title}", postTitle)
        );

        if (!shouldDelete) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        className="rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10"
      >
        {postsDictionary.actions.delete}
      </button>
    </form>
  );
}
