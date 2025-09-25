import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import usePresence from "@convex-dev/presence/react";

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CursorLayer } from "~/components/CursorLayer";
import { NoteCard } from "~/components/NoteCard";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { slugToTitle, toSlug } from "~/lib/slug";
import { colorFromSeed } from "~/lib/colors";
import { persistDisplayName, readDisplayName } from "~/lib/display-name";
import { getSessionId } from "~/lib/session";
import { useClientValue } from "~/lib/use-client-value";
import { useThrottle } from "~/lib/throttle";
import { getConvexUrl } from "~/lib/convex-url";

const NOTE_WIDTH = 260;
const NOTE_HEIGHT = 180;

export const Route = createFileRoute("/board/$boardId")({
  loader: async ({ params, context }) => {
    const slug = toSlug(params.boardId);
    if (!slug) {
      throw new Response("Board not found", { status: 404 });
    }

    const ensureInput = { slug, name: slugToTitle(slug) };
    if (typeof window === "undefined") {
      const serverClient =
        context.convexQueryClient.serverHttpClient ?? new ConvexHttpClient(getConvexUrl());
      await serverClient.mutation(api.boards.ensure, ensureInput);
    } else {
      await context.convexClient.mutation(api.boards.ensure, ensureInput);
    }
    const board = await context.queryClient.ensureQueryData({
      ...convexQuery(api.boards.getBySlug, { slug }),
      gcTime: 60_000,
    });
    if (!board) {
      throw new Response("Board not found", { status: 404 });
    }

    await Promise.all([
      context.queryClient.ensureQueryData({
        ...convexQuery(api.notes.list, { boardId: board._id }),
        gcTime: 60_000,
      }),
      context.queryClient.ensureQueryData({
        ...convexQuery(api.presence.cursorsByBoard, { boardId: board._id }),
        gcTime: 2_000,
      }),
    ]);

    return {
      boardId: board._id,
      boardSlug: board.slug,
      boardName: board.name,
    };
  },
  component: BoardPage,
});

function BoardPage() {
  const loaderData = Route.useLoaderData();
  const boardId: Id<"boards"> = loaderData.boardId;
  const notesResult = useSuspenseQuery({
    ...convexQuery(api.notes.list, { boardId }),
    gcTime: 60_000,
  });
  const cursorsResult = useSuspenseQuery({
    ...convexQuery(api.presence.cursorsByBoard, { boardId }),
    gcTime: 2_000,
  });
  const notes = notesResult.data;
  const cursorDocs = cursorsResult.data;

  const upsertNote = useConvexMutation(api.notes.upsert);
  const removeNote = useConvexMutation(api.notes.remove);
  const pulseCursor = useConvexMutation(api.presence.cursorPulse);

  const fallbackSession = React.useId();
  const sessionId = useClientValue(() => getSessionId() ?? fallbackSession, fallbackSession);
  const storedName = useClientValue(() => readDisplayName() ?? "", "");

  const [displayName, setDisplayName] = React.useState(storedName);
  const [nameDialogOpen, setNameDialogOpen] = React.useState(() => storedName.length === 0);

  React.useEffect(() => {
    if (storedName && !displayName) {
      setDisplayName(storedName);
      setNameDialogOpen(false);
    }
  }, [storedName, displayName]);

  const initials = React.useMemo(() => {
    const key = displayName || sessionId;
    return key ? key.slice(-4).toUpperCase() : "GUEST";
  }, [displayName, sessionId]);

  const userColor = React.useMemo(() => colorFromSeed(`${sessionId}-${displayName || initials}`), [
    sessionId,
    displayName,
    initials,
  ]);

  const presenceUserId = sessionId;
  usePresence(api.presence, boardId, presenceUserId);

  const peers = React.useMemo(() => {
    return cursorDocs.map((cursor) => ({
      sessionId: cursor.sessionId,
      name: cursor.name,
      color: cursor.color,
      x: cursor.x,
      y: cursor.y,
    }));
  }, [cursorDocs]);

  const sendPulse = React.useMemo(
    () =>
      useThrottle(async (x: number, y: number) => {
        if (!sessionId || !displayName) {
          return;
        }
        const qx = Math.round(x / 4) * 4;
        const qy = Math.round(y / 4) * 4;
        await pulseCursor({
          boardId,
          sessionId,
          userId: presenceUserId,
          name: displayName,
          color: userColor,
          x: qx,
          y: qy,
        });
      }, 32),
    [boardId, sessionId, presenceUserId, displayName, userColor, pulseCursor],
  );

  const sortedNotes = React.useMemo(() => {
    return [...notes].sort((a, b) => a.z - b.z);
  }, [notes]);

  async function handleAddNote() {
    const now = Date.now();
    const width = typeof window !== "undefined" ? window.innerWidth : 1200;
    const height = typeof window !== "undefined" ? window.innerHeight : 800;
    const offsetX = (width - NOTE_WIDTH) / 2;
    const offsetY = (height - NOTE_HEIGHT) / 2;
    await upsertNote({
      boardId,
      noteId: undefined,
      x: Math.max(32, offsetX + Math.random() * 160 - 80),
      y: Math.max(32, offsetY + Math.random() * 160 - 80),
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      text: "New idea",
      color: colorFromSeed(`${boardId}-${now}`),
      z: now,
    });
  }

  function handleNameSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = (formData.get("displayName") as string).trim();
    if (!value) {
      return;
    }
    persistDisplayName(value);
    setDisplayName(value);
    setNameDialogOpen(false);
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-muted-foreground">Board</span>
          <h1 className="text-2xl font-semibold text-foreground">{loaderData.boardName}</h1>
          <span className="text-xs text-muted-foreground">/{loaderData.boardSlug}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setNameDialogOpen(true)}>
            {displayName ? `You are ${displayName}` : "Set your name"}
          </Button>
          <Button onClick={handleAddNote}>Add note</Button>
          <Link
            to="/board"
            className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
            preload="intent"
          >
            All boards
          </Link>
        </div>
      </div>

      <div
        className="relative flex-1 overflow-hidden bg-muted/40"
        onPointerMove={(event) => sendPulse(event.clientX, event.clientY)}
      >
        <div className="relative h-full w-full">
          {sortedNotes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onDragEnd={async ({ x, y }) => {
                await upsertNote({
                  noteId: note._id,
                  boardId,
                  x,
                  y,
                  width: note.width,
                  height: note.height,
                  text: note.text,
                  color: note.color,
                  z: Date.now(),
                });
              }}
              onChange={async (text) => {
                await upsertNote({
                  noteId: note._id,
                  boardId,
                  x: note.x,
                  y: note.y,
                  width: note.width,
                  height: note.height,
                  text,
                  color: note.color,
                  z: Date.now(),
                });
              }}
              onRemove={async () => {
                await removeNote({ noteId: note._id });
              }}
            />
          ))}
          <CursorLayer
            me={{ sessionId, name: displayName || initials, color: userColor }}
            peers={peers}
          />
        </div>
      </div>

      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a display name</DialogTitle>
            <DialogDescription>
              Your name and cursor color appear to everyone else in this board.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleNameSubmit}>
            <Input
              name="displayName"
              defaultValue={displayName}
              placeholder="Ada Lovelace"
              autoFocus
            />
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
