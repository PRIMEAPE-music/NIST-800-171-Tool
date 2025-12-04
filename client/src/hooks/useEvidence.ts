import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evidenceService } from '../services/evidenceService';
import {
  EvidenceFilters,
  EvidenceType,
  EvidenceRelationship,
} from '../types/evidence.types';

/**
 * Get all evidence with filters
 */
export function useEvidence(filters?: EvidenceFilters) {
  return useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => evidenceService.getEvidence(filters),
  });
}

/**
 * Get evidence by ID
 */
export function useEvidenceById(id: number) {
  return useQuery({
    queryKey: ['evidence', id],
    queryFn: () => evidenceService.getEvidenceById(id),
    enabled: !!id,
  });
}

/**
 * Get evidence for control
 */
export function useEvidenceForControl(controlId: number) {
  return useQuery({
    queryKey: ['evidence', 'control', controlId],
    queryFn: () => evidenceService.getEvidenceForControl(controlId),
    enabled: !!controlId,
  });
}

/**
 * Get evidence statistics
 */
export function useEvidenceStats() {
  return useQuery({
    queryKey: ['evidence', 'stats'],
    queryFn: () => evidenceService.getEvidenceStats(),
  });
}

/**
 * Get evidence coverage
 */
export function useEvidenceCoverage(family?: string) {
  return useQuery({
    queryKey: ['evidence', 'coverage', family],
    queryFn: () => evidenceService.getEvidenceCoverage(family),
  });
}

/**
 * Get evidence gaps
 */
export function useEvidenceGaps() {
  return useQuery({
    queryKey: ['evidence', 'gaps'],
    queryFn: () => evidenceService.getEvidenceGaps(),
  });
}

/**
 * Get manual review evidence summary
 */
export function useManualReviewEvidence() {
  return useQuery({
    queryKey: ['evidence', 'manual-reviews'],
    queryFn: () => evidenceService.getManualReviewEvidenceSummary(),
  });
}

/**
 * Suggest controls for evidence
 */
export function useSuggestControls(filename: string, evidenceType?: EvidenceType) {
  return useQuery({
    queryKey: ['evidence', 'suggest-controls', filename, evidenceType],
    queryFn: () => evidenceService.suggestControlsForEvidence(filename, evidenceType),
    enabled: !!filename,
  });
}

/**
 * Upload evidence mutation
 */
export function useUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      data,
      onProgress,
    }: {
      file: File;
      data: {
        evidenceType?: EvidenceType;
        description?: string;
        uploadedBy?: string;
        tags?: string[];
        controlMappings?: Array<{
          controlId: number;
          relationship: EvidenceRelationship;
          notes?: string;
        }>;
      };
      onProgress?: (progress: number) => void;
    }) => evidenceService.uploadEvidence(file, data, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Bulk upload evidence mutation
 */
export function useBulkUploadEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      data,
      onProgress,
    }: {
      files: File[];
      data: {
        evidenceType?: EvidenceType;
        uploadedBy?: string;
        defaultControlMappings?: Array<{
          controlId: number;
          relationship: EvidenceRelationship;
          notes?: string;
        }>;
      };
      onProgress?: (progress: number) => void;
    }) => evidenceService.bulkUploadEvidence(files, data, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Update evidence mutation
 */
export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        description?: string;
        tags?: string[];
        evidenceType?: EvidenceType;
        status?: string;
        reviewNotes?: string;
      };
    }) => evidenceService.updateEvidence(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Add control mapping mutation
 */
export function useAddControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      data,
    }: {
      evidenceId: number;
      data: {
        controlId: number;
        relationship: EvidenceRelationship;
        notes?: string;
        mappedBy?: string;
        requirementId?: number;
      };
    }) => evidenceService.addControlMapping(evidenceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Update control mapping mutation
 */
export function useUpdateControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      mappingId,
      data,
    }: {
      evidenceId: number;
      mappingId: number;
      data: {
        relationship?: EvidenceRelationship;
        notes?: string;
        isVerified?: boolean;
        verifiedBy?: string;
      };
    }) => evidenceService.updateControlMapping(evidenceId, mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Remove control mapping mutation
 */
export function useRemoveControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, mappingId }: { evidenceId: number; mappingId: number }) =>
      evidenceService.removeControlMapping(evidenceId, mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Verify control mapping mutation
 */
export function useVerifyControlMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      evidenceId,
      mappingId,
      verifiedBy,
    }: {
      evidenceId: number;
      mappingId: number;
      verifiedBy?: string;
    }) => evidenceService.verifyControlMapping(evidenceId, mappingId, verifiedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Delete evidence mutation
 */
export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => evidenceService.deleteEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Archive evidence mutation
 */
export function useArchiveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      archivedBy,
      reason,
    }: {
      id: number;
      archivedBy?: string;
      reason?: string;
    }) => evidenceService.archiveEvidence(id, archivedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}

/**
 * Unarchive evidence mutation
 */
export function useUnarchiveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => evidenceService.unarchiveEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
    },
  });
}
