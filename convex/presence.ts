import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: {
    roomId: v.string(),
    userId: v.string(),
    sessionId: v.string(),
    interval: v.number(),
  },
  returns: v.object({
    roomToken: v.string(),
    sessionToken: v.string(),
  }),
  handler: async (ctx, args) => {
    return await presence.heartbeat(
      ctx,
      args.roomId,
      args.userId,
      args.sessionId,
      args.interval,
    );
  },
});

export const list = query({
  args: { roomToken: v.string() },
  returns: v.array(
    v.object({
      userId: v.string(),
      online: v.boolean(),
      lastDisconnected: v.number(),
      data: v.optional(v.any()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { roomToken }) => {
    return await presence.list(ctx, roomToken);
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await presence.disconnect(ctx, sessionToken);
    return null;
  },
});

export const cursorPulse = mutation({
  args: {
    boardId: v.id("boards"),
    sessionId: v.string(),
    userId: v.string(),
    name: v.string(),
    color: v.string(),
    x: v.number(),
    y: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { boardId, sessionId, userId, name, color, x, y }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cursors")
      .withIndex("by_board_session", (q) =>
        q.eq("boardId", boardId).eq("sessionId", sessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { x, y, updatedAt: now, name, color, userId });
    } else {
      await ctx.db.insert("cursors", {
        boardId,
        sessionId,
        userId,
        name,
        color,
        x,
        y,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const cursorsByBoard = query({
  args: { boardId: v.id("boards") },
  returns: v.array(
    v.object({
      _id: v.id("cursors"),
      _creationTime: v.number(),
      boardId: v.id("boards"),
      sessionId: v.string(),
      userId: v.string(),
      name: v.string(),
      color: v.string(),
      x: v.number(),
      y: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, { boardId }) => {
    const cutoff = Date.now() - 1500;
    const all = await ctx.db
      .query("cursors")
      .withIndex("by_board", (q) => q.eq("boardId", boardId))
      .collect();
    return all.filter((cursor) => cursor.updatedAt >= cutoff);
  },
});
