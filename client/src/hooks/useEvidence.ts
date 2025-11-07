import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '../services/evidenceService';
import { EvidenceFilters } from '../types/evidence.types';

export function useEvidence(filters?: EvidenceFilters) {
  return useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => evidenceService.getEvidence(filters),
  });
}

export function useEvidenceById(id: number) {
  return useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceService.getEvidenceById(id),
    enabled: !!id,
  });
}

export function useEvidenceForControl(controlId: number) {
  return useQuery({
    queryKey: ['evidence', 'control', controlId],
    queryFn: () => evidenceService.getEvidenceForControl(controlId),
    enabled: !!controlId,
  });
}

export function useEvidenceGaps() {
  return useQuery({
    queryKey: ['evidence', 'gaps'],
    queryFn: () => evidenceService.getEvidenceGaps(),
  });
}

export function useEvidenceStats() {
  return useQuery({
    queryKey: ['evidence', 'stats'],
    queryFn: () => evidenceService.getEvidenceStats(),
  });
}

export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      controlId,
      description,
      tags,
    }: {
      files: File[];
      controlId: number;
      description?: string;
      tags?: string[];
    }) => evidenceService.uploadEvidence(files, controlId, description, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      updates: { description?: string; tags?: string[]; isArchived?: boolean };
    }) => evidenceService.updateEvidence(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => evidenceService.deleteEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}
