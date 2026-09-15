// Helper to retrieve auth token and headers for authenticated API requests
export function getAuthToken(): string | null {
  try {
    const saved = localStorage.getItem('fg_user');
    if (!saved) return null;
    const user = JSON.parse(saved);
    return user?.token || null;
  } catch {
    return null;
  }
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle automatic logout on token invalidation or expiry
  if (response.status === 401 && !url.includes('/api/auth/login')) {
    const currentPath = window.location.pathname;
    // Don't auto reload if already on login or error
    console.warn('Session expired or unauthorized request, please log in again.');
  }

  return response;
}
