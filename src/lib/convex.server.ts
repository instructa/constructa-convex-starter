import { createServerFn } from '@tanstack/react-start';
import { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';

import { api } from '../../convex/_generated/api';
import { getConvexUrl } from './convex-url';

const ensureBoardInput = z.object({
  slug: z.string().min(1, 'Slug is required'),
  name: z.string().min(1, 'Name is required').max(80, 'Name is too long').optional(),
});

export const ensureBoard = createServerFn({ method: 'POST' })
  .inputValidator((value) => ensureBoardInput.parse(value))
  .handler(async ({ data }) => {
    const client = new ConvexHttpClient(getConvexUrl());
    return await client.mutation(api.boards.ensure, data);
  });
