import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";

import { api } from "../../../convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { toSlug } from "~/lib/slug";

export const Route = createFileRoute("/board/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      ...convexQuery(api.boards.list, {}),
      gcTime: 60_000,
    });
    return null;
  },
  component: BoardIndexPage,
});

function BoardIndexPage() {
  const router = useRouter();
  const boardsResult = useSuspenseQuery({
    ...convexQuery(api.boards.list, {}),
    gcTime: 60_000,
  });
  const boards = boardsResult.data;

  const ensureBoard = useConvexMutation(api.boards.ensure);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = toSlug(name);
    if (!slug) {
      setError("Enter at least one letter or number for the board name.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const board = await ensureBoard({ slug, name: name.trim() });
      setName("");
      await router.navigate({ to: "/board/$boardId", params: { boardId: board.slug } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create board.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold">Boards</h1>
        <p className="text-sm text-muted-foreground">
          Create collaborative canvases and jump into any board to edit notes together in real time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border bg-background/70 p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <label htmlFor="board-name" className="text-sm font-medium text-foreground">
            New board name
          </label>
          <Input
            id="board-name"
            placeholder="Product discovery"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create and open"}
          </Button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Link
            key={board._id}
            to="/board/$boardId"
            params={{ boardId: board.slug }}
            className="group"
            preload="intent"
          >
            <Card className="h-full rounded-lg border bg-card p-4 shadow-sm transition group-hover:border-primary group-hover:shadow-md">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium uppercase text-muted-foreground">Board</span>
                <h2 className="text-xl font-semibold text-foreground">{board.name}</h2>
                <p className="text-sm text-muted-foreground">/{board.slug}</p>
              </div>
            </Card>
          </Link>
        ))}
        {boards.length === 0 ? (
          <Card className="col-span-full flex h-24 items-center justify-center border-dashed">
            <span className="text-sm text-muted-foreground">Create your first board to get started.</span>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
