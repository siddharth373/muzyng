const productionSiteUrl = "https://muzyng.vercel.app";

export function getAuthSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || productionSiteUrl;
}
