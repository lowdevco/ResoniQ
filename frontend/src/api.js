import { API_BASE_URL } from "./config";

export function apiFetch(endpoint, options = {}) {
  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  if (!endpoint.startsWith("http")) {
    const parts = url.split("://");
    if (parts.length === 2) {
      url = parts[0] + "://" + parts[1].replace(/\/+/g, "/");
    }
  }
  
  options.credentials = "include";
  
  return fetch(url, options);
}
