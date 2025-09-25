import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const NOTE_RETURN = v.object({
  _id: v.id("notes"),
  _creationTime: v.number(),
  boardId: v.id("boards"),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  text: v.string(),
  color: v.string(),
  z: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: { boardId: v.id("boards") },
  returns: v.array(NOTE_RETURN),
  handler: async (ctx, { boardId }) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_board", (q) => q.eq("boardId", boardId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    noteId: v.optional(v.id("notes")),
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    text: v.string(),
    color: v.string(),
    z: v.number(),
  },
  returns: NOTE_RETURN,
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.noteId) {
      await ctx.db.patch(args.noteId, {
        x: args.x,
        y: args.y,
        width: args.width,
        height: args.height,
        text: args.text,
        color: args.color,
        z: args.z,
        updatedAt: now,
      });
      const updated = await ctx.db.get(args.noteId);
      if (!updated) {
        throw new Error("Note no longer exists.");
      }
      return updated;
    }

    const noteId = await ctx.db.insert("notes", {
      boardId: args.boardId,
      x: args.x,
      y: args.y,
      width: args.width,
      height: args.height,
      text: args.text,
      color: args.color,
      z: args.z,
      updatedAt: now,
    });
    const note = await ctx.db.get(noteId);
    if (!note) {
      throw new Error("Failed to create note.");
    }
    return note;
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  returns: v.null(),
  handler: async (ctx, { noteId }) => {
    await ctx.db.delete(noteId);
    return null;
  },
});
