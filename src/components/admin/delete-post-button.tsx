"use client";

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
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const shouldDelete = window.confirm(
          `Delete "${postTitle}"? This action cannot be undone.`
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
        Delete
      </button>
    </form>
  );
}
