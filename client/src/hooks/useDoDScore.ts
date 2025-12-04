import { useState, useEffect, useCallback } from 'react';
import { DoDScoreSummary, DoDScoreResult } from '../types/dodScore';

const API_BASE = '/api/dod-score';

export function useDoDScoreSummary() {
  const [data, setData] = useState<DoDScoreSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/summary`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch DoD score');
      }
    } catch (err) {
      setError('Network error fetching DoD score');
      console.error('DoD score fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { data, loading, error, refetch: fetchScore };
}

export function useDoDScoreDetails() {
  const [data, setData] = useState<DoDScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_BASE);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch DoD score details');
      }
    } catch (err) {
      setError('Network error fetching DoD score details');
      console.error('DoD score details fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  return { data, loading, error, refetch: fetchScore };
}
