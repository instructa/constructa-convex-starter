import { ConvexQueryClient } from '@convex-dev/react-query';
import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
import { NotFound } from './components/NotFound';
import { routeTree } from './routeTree.gen';
import { getConvexUrl } from './lib/convex-url';

// Initialize browser-echo for TanStack Start (manual import required)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  void import('virtual:browser-echo');
}

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 60_000,
      },
    },
  });

  const convexQueryClient = new ConvexQueryClient(getConvexUrl(), { queryClient });
  queryClient.setDefaultOptions({
    queries: {
      ...queryClient.getDefaultOptions().queries,
      queryFn: convexQueryClient.queryFn(),
      queryKeyHashFn: convexQueryClient.hashFn(),
      staleTime: Infinity,
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: {
      queryClient,
      convexQueryClient,
      convexClient: convexQueryClient.convexClient,
    },
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
  });

  return routerWithQueryClient(router, queryClient);
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
