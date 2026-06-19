import { API_BASE_URL } from "./config";

/**
 * Custom fetch wrapper that prepends the API_BASE_URL (if relative path)
 * and automatically injects `credentials: "include"` for CORS session sharing.
 */
export function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Force credentials to ensure Django session cookies are sent/received
  options.credentials = "include";
  
  return fetch(url, options);
}
