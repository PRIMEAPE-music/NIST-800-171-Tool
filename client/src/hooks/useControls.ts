import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlService, ControlFilters } from '@/services/controlService';

// Query keys for React Query caching
export const controlKeys = {
  all: ['controls'] as const,
  lists: () => [...controlKeys.all, 'list'] as const,
  list: (filters?: ControlFilters) => [...controlKeys.lists(), filters] as const,
  details: () => [...controlKeys.all, 'detail'] as const,
  detail: (id: number) => [...controlKeys.details(), id] as const,
  detailByControlId: (controlId: string) => [...controlKeys.details(), 'controlId', controlId] as const,
  stats: () => [...controlKeys.all, 'stats'] as const,
};

/**
 * Hook to fetch all controls with optional filters
 */
export function useControls(filters?: ControlFilters) {
  return useQuery({
    queryKey: controlKeys.list(filters),
    queryFn: () => controlService.getAllControls(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch compliance statistics
 */
export function useComplianceStats() {
  return useQuery({
    queryKey: controlKeys.stats(),
    queryFn: () => controlService.getComplianceStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single control by database ID
 */
export function useControl(id: number) {
  return useQuery({
    queryKey: controlKeys.detail(id),
    queryFn: () => controlService.getControlById(id),
    enabled: !!id && id > 0, // Only fetch if ID is valid
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a control by NIST control ID (e.g., "03.01.01" for Rev 3)
 */
export function useControlByControlId(controlId: string) {
  return useQuery({
    queryKey: controlKeys.detailByControlId(controlId),
    queryFn: () => controlService.getControlByControlId(controlId),
    enabled: !!controlId, // Only fetch if controlId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update control status
 * Returns a mutation function that invalidates relevant queries on success
 */
export function useUpdateControlStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        status: string;
        implementationNotes?: string;
        assignedTo?: string;
      };
    }) => controlService.updateControlStatus(id, data),
    onSuccess: (_data, variables) => {
      // Invalidate and refetch affected queries
      queryClient.invalidateQueries({ queryKey: controlKeys.lists() });
      queryClient.invalidateQueries({ queryKey: controlKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: controlKeys.stats() });
    },
  });
}
