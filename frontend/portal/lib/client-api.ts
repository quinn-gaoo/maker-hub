export function getApiBaseUrl() {
  // const value = process.env.NEXT_PUBLIC_API_BASE_URL;
  // if (!value) {
  //   throw new Error("Missing NEXT_PUBLIC_API_BASE_URL.");
  // }
  // return value.replace(/\/$/, "");
  return '/api/v1'
}

export function apiPath(path: string) {
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export const clientApiPath = apiPath;
