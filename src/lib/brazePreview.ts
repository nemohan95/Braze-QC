import axios from "axios";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";

export function isHostAllowed(targetUrl: URL): boolean {
  const allowedHosts = (process.env.ALLOWED_PREVIEW_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    return true;
  }

  const hostname = targetUrl.hostname.toLowerCase();
  return allowedHosts.some((host) => host === hostname || hostname.endsWith(`.${host}`));
}

export async function fetchBrazePreviewHtml(targetUrl: URL): Promise<string> {
  const response = await axios.get<string>(targetUrl.toString(), {
    responseType: "text",
    timeout: 15000,
    headers: { "User-Agent": DEFAULT_USER_AGENT },
  });

  if (!response.data || typeof response.data !== "string") {
    throw new Error("Preview response returned empty body");
  }

  return response.data;
}
