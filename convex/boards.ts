import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const BOARD_RETURN = v.object({
  _id: v.id("boards"),
  _creationTime: v.number(),
  slug: v.string(),
  name: v.string(),
  createdAt: v.number(),
});

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function fallbackName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Untitled Board";
}

export const list = query({
  args: {},
  returns: v.array(BOARD_RETURN),
  handler: async (ctx) => {
    const boards = await ctx.db.query("boards").collect();
    return boards.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(v.null(), BOARD_RETURN),
  handler: async (ctx, { slug }) => {
    const normalized = normalizeSlug(slug);
    if (!normalized) {
      return null;
    }
    const board = await ctx.db
      .query("boards")
      .withIndex("by_slug", (q) => q.eq("slug", normalized))
      .first();
    return board ?? null;
  },
});

export const ensure = mutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
  },
  returns: BOARD_RETURN,
  handler: async (ctx, { slug, name }) => {
    const normalized = normalizeSlug(slug);
    if (!normalized) {
      throw new Error("Board slug must contain at least one alphanumeric character.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("boards")
      .withIndex("by_slug", (q) => q.eq("slug", normalized))
      .first();

    if (existing) {
      const label = name?.trim();
      if (label && existing.name !== label) {
        await ctx.db.patch(existing._id, { name: label });
        const updated = await ctx.db.get(existing._id);
        if (!updated) {
          throw new Error("Failed to load board after updating its name.");
        }
        return updated;
      }
      return existing;
    }

    const label = name?.trim() || fallbackName(normalized);
    const boardId = await ctx.db.insert("boards", {
      slug: normalized,
      name: label,
      createdAt: now,
    });
    const board = await ctx.db.get(boardId);
    if (!board) {
      throw new Error("Failed to load board after creation.");
    }
    return board;
  },
});
