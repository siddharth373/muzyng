const AUDIUS_API_BASE_URL = process.env.AUDIUS_API_BASE_URL || "https://api.audius.co/v1";
const AUDIUS_APP_NAME = process.env.AUDIUS_APP_NAME || "musyko";

export async function audiusRequest<T>(path: string): Promise<T> {
  const url = new URL(`${AUDIUS_API_BASE_URL}${path}`);
  url.searchParams.set("app_name", AUDIUS_APP_NAME);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Audius request failed (${response.status})`);
  const payload = (await response.json()) as { data?: T; error?: string };
  if (!payload.data) throw new Error(payload.error ?? "Audius returned no data");
  return payload.data;
}