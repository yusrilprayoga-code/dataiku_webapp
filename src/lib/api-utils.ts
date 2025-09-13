/**
 * Utility functions for API calls with proper error handling for HTML error pages
 */

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Wrapper for fetch that handles HTML error pages and provides better error messages
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if the response is HTML (error page)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
        return {
          success: false,
          error: `Service unavailable (Status: ${response.status})`,
        };
      }
      
      return {
        success: false,
        error: `Request failed with status: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
    
  } catch (error) {
    // Only log to console on client-side or in development
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
      console.error('API call failed:', error);
    }
    
    // Check if it's a parsing error (likely HTML instead of JSON)
    if (error instanceof Error && error.message.includes('Unexpected token')) {
      return {
        success: false,
        error: 'Service returned invalid response (possibly HTML error page)',
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Makes a POST request with JSON data
 */
export async function apiPost<T = any>(
  endpoint: string,
  data: any
): Promise<ApiResponse<T>> {
  return safeFetch<T>(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Makes a GET request
 */
export async function apiGet<T = any>(
  endpoint: string
): Promise<ApiResponse<T>> {
  return safeFetch<T>(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an internal API endpoint URL
 */
export function createApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `/${cleanPath}`;
}