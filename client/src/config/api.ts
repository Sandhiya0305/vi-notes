const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_BASE = envApiBase && envApiBase.length > 0 ? envApiBase : '/api';
