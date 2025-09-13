/**
 * Environment and API configuration utilities
 */

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
// Safe check for deployment environment without using window
export const isDeployment = typeof window !== 'undefined' ? window.location.hostname !== 'localhost' : isProduction;

/**
 * Get the backend API URL with fallback for different environments
 */
export function getBackendApiUrl(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    if (typeof window !== 'undefined') {
      console.warn('NEXT_PUBLIC_API_URL is not configured');
    }
    return null;
  }
  
  // In production/deployment, validate that the URL is reachable
  if (isProduction && !apiUrl.startsWith('http')) {
    if (typeof window !== 'undefined') {
      console.error('Invalid API URL format in production:', apiUrl);
    }
    return null;
  }
  
  return apiUrl;
}

/**
 * Check if we should use internal API routes vs direct backend calls
 */
export function shouldUseInternalApi(): boolean {
  // Always use internal API routes in production deployments
  if (isProduction) {
    return true;
  }
  
  // In development, use internal API if backend URL is not available
  const backendUrl = getBackendApiUrl();
  return !backendUrl;
}

/**
 * Get the appropriate API endpoint (internal or external)
 */
export function getApiEndpoint(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  if (shouldUseInternalApi()) {
    return `/api/${cleanPath}`;
  }
  
  const backendUrl = getBackendApiUrl();
  if (!backendUrl) {
    throw new Error('No API URL available');
  }
  
  return `${backendUrl}/api/${cleanPath}`;
}

/**
 * Environment-aware logging (client-side safe)
 */
export function debugLog(message: string, ...args: any[]) {
  if (isDevelopment && typeof window !== 'undefined') {
    console.log(`[API Debug] ${message}`, ...args);
  }
}

export function errorLog(message: string, ...args: any[]) {
  if (typeof window !== 'undefined') {
    console.error(`[API Error] ${message}`, ...args);
  }
}