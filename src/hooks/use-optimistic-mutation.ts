import { useState, useCallback } from "react";

export interface OptimisticMutationOptions<TData, TVariables> {
  onMutate: (variables: TVariables) => TData;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onError?: (error: any, rollbackData: TData, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables>(
  initialData: TData,
  options: OptimisticMutationOptions<TData, TVariables>
) {
  const [data, setData] = useState<TData>(initialData);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      const rollbackData = data;
      setIsPending(true);
      setError(null);

      // 1. Apply optimistic update immediately to UI
      const optimistic = options.onMutate(variables);
      setData(optimistic);

      try {
        // 2. Perform actual network mutation
        const result = await options.mutationFn(variables);
        setData(result);
        if (options.onSuccess) {
          options.onSuccess(result, variables);
        }
        return result;
      } catch (err: any) {
        // 3. Rollback on failure
        setData(rollbackData);
        setError(err);
        if (options.onError) {
          options.onError(err, rollbackData, variables);
        }
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [data, options]
  );

  return {
    data,
    mutate,
    isPending,
    error,
    setData
  };
}

