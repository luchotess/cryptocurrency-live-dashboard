import type { CryptoPair, GetAveragesResponse, GetLastResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

class ApiError extends Error {
  public status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function fetchWithError(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const apiClient = {
  /**
   * Get hourly averages for a specific pair
   */
  async getAverages(
    pair: CryptoPair,
    from?: string,
    to?: string
  ): Promise<GetAveragesResponse> {
    const params = new URLSearchParams({ pair });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const response = await fetchWithError(`${API_BASE}/api/averages?${params}`);
    return response.json();
  },

  /**
   * Get last ticks for all pairs
   */
  async getLastTicks(): Promise<GetLastResponse> {
    const response = await fetchWithError(`${API_BASE}/api/last`);
    return response.json();
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetchWithError(`${API_BASE}/health/live`);
    return response.json();
  },
};