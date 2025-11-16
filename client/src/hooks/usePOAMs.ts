import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { poamApi } from '../services/poam.api';
import {
  CreatePoamDto,
  UpdatePoamDto,
  PoamFilters,
  CreateMilestoneDto,
} from '../types/poam.types';

export const usePOAMs = (initialFilters?: PoamFilters) => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PoamFilters>(initialFilters || {});

  // Fetch all POAMs
  const {
    data: poams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['poams', filters],
    queryFn: () => poamApi.getAllPoams(filters),
  });

  // Fetch POAM stats
  const { data: stats } = useQuery({
    queryKey: ['poam-stats'],
    queryFn: poamApi.getPoamStats,
  });

  // Create POAM
  const createMutation = useMutation({
    mutationFn: (data: CreatePoamDto) => poamApi.createPoam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Update POAM
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePoamDto }) =>
      poamApi.updatePoam(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Update POAM status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      poamApi.updatePoamStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Delete POAM
  const deleteMutation = useMutation({
    mutationFn: (id: number) => poamApi.deletePoam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
      queryClient.invalidateQueries({ queryKey: ['poam-stats'] });
    },
  });

  // Add milestone
  const addMilestoneMutation = useMutation({
    mutationFn: ({ poamId, data }: { poamId: number; data: CreateMilestoneDto }) =>
      poamApi.addMilestone(poamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  // Complete milestone
  const completeMilestoneMutation = useMutation({
    mutationFn: ({ poamId, milestoneId }: { poamId: number; milestoneId: number }) =>
      poamApi.completeMilestone(poamId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  // Delete milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ poamId, milestoneId }: { poamId: number; milestoneId: number }) =>
      poamApi.deleteMilestone(poamId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poams'] });
    },
  });

  return useMemo(() => ({
    poams,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
    createPoam: createMutation.mutateAsync,
    updatePoam: updateMutation.mutateAsync,
    updatePoamStatus: updateStatusMutation.mutateAsync,
    deletePoam: deleteMutation.mutateAsync,
    addMilestone: addMilestoneMutation.mutateAsync,
    completeMilestone: completeMilestoneMutation.mutateAsync,
    deleteMilestone: deleteMilestoneMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }), [
    poams,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
    createMutation.mutateAsync,
    createMutation.isPending,
    updateMutation.mutateAsync,
    updateMutation.isPending,
    updateStatusMutation.mutateAsync,
    deleteMutation.mutateAsync,
    deleteMutation.isPending,
    addMilestoneMutation.mutateAsync,
    completeMilestoneMutation.mutateAsync,
    deleteMilestoneMutation.mutateAsync,
  ]);
};
