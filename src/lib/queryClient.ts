import { QueryClient } from '@tanstack/react-query';

/** Client TanStack Query condiviso — istanziato una volta per tutta l'app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000, // 30s
      refetchOnWindowFocus: false,
    },
  },
});
