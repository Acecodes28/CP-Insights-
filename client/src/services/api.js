import axios from "axios";

// We dynamically grab the base URL (Vercel or Localhost) 
// and explicitly force "/api" to the end of it every single time.
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${baseURL}/api`, 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cpInsightsToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;