import { API_BASE_URL } from "./config";

export function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  options.credentials = "include";

  return fetch(url, options);
}
