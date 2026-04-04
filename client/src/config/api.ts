const envApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

function normalizeApiBase(value: string): string {
	return value.replace(/\/+$/, '');
}

export const API_BASE = normalizeApiBase(
	envApiBase && envApiBase.length > 0 ? envApiBase : '/api',
);

export function buildApiUrl(path: string): string {
	return `${API_BASE}/${path.replace(/^\/+/, '')}`;
}
