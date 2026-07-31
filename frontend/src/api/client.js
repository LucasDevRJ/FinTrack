import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Runs before every request: if we have a token stored, attach it as the
// Authorization header automatically, so individual API calls never need
// to worry about it.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("fintrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
