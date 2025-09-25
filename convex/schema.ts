import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  boards: defineTable({
    slug: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  notes: defineTable({
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    text: v.string(),
    color: v.string(),
    z: v.number(),
    updatedAt: v.number(),
  }).index("by_board", ["boardId"]),

  cursors: defineTable({
    boardId: v.id("boards"),
    sessionId: v.string(),
    userId: v.string(),
    name: v.string(),
    color: v.string(),
    x: v.number(),
    y: v.number(),
    updatedAt: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_session", ["boardId", "sessionId"]),
});
