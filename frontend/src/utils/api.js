export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
};

export default apiUrl;
