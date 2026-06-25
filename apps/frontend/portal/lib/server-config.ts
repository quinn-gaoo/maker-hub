export function getApiBaseUrl() {
  const value = process.env.API_BASE_URL;
  if (!value) {
    throw new Error("Missing API_BASE_URL.");
  }
  return value.replace(/\/$/, "");
}
