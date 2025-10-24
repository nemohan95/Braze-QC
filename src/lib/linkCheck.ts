import axios, { AxiosResponse } from "axios";
import pLimit from "p-limit";

export interface LinkCheckResult {
  url: string;
  statusCode?: number;
  ok?: boolean;
  redirected?: boolean;
  finalUrl?: string;
  notes?: string;
}

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10000;
const CONCURRENCY = 6;
const limit = pLimit(CONCURRENCY);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const devHostPatterns = ["wwwd", "dev", "staging"];

function getApprovedDomains(): string[] {
  return (process.env.APPROVED_LINK_DOMAINS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function hostnameMatchesApproved(hostname: string, approved: string[]): boolean {
  if (approved.length === 0) {
    return true;
  }

  const lowerHost = hostname.toLowerCase();
  return approved.some((domain) => {
    if (lowerHost === domain) {
      return true;
    }
    return lowerHost.endsWith(`.${domain}`);
  });
}

function containsDevPattern(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return devHostPatterns.some((pattern) => lower.includes(pattern));
}

function isNonHttpLink(url: string): boolean {
  return /^(mailto:|tel:|sms:)/i.test(url);
}

async function requestUrl(
  method: "HEAD" | "GET",
  targetUrl: string,
): Promise<AxiosResponse | null> {
  try {
    const response = await axios.request({
      method,
      url: targetUrl,
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    return response;
  } catch (error) {
    if (method === "HEAD") {
      return null;
    }
    throw error;
  }
}

async function followRedirects(initialUrl: string): Promise<LinkCheckResult> {
  let currentUrl = initialUrl;
  let redirected = false;
  let lastStatus: number | undefined;
  const approvedDomains = getApprovedDomains();

  for (let depth = 0; depth <= MAX_REDIRECTS; depth += 1) {
    const headResponse = await requestUrl("HEAD", currentUrl);
    let response = headResponse;

    if (!response || response.status === 405) {
      response = await requestUrl("GET", currentUrl);
    }

    if (!response) {
      return {
        url: initialUrl,
        ok: false,
        redirected,
        finalUrl: currentUrl,
        notes: "no_response",
      };
    }

    lastStatus = response.status;

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.location as string | undefined;
      if (!location) {
        return {
          url: initialUrl,
          statusCode: response.status,
          redirected,
          finalUrl: currentUrl,
          ok: false,
          notes: "redirect_missing_location",
        };
      }

      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = nextUrl;
      redirected = true;
      continue;
    }

    const finalHostname = new URL(currentUrl).hostname;

    if (containsDevPattern(finalHostname)) {
      return {
        url: initialUrl,
        statusCode: response.status,
        redirected,
        finalUrl: currentUrl,
        ok: false,
        notes: "dev_domain_detected",
      };
    }

    const isApproved = hostnameMatchesApproved(finalHostname, approvedDomains);

    if (response.status >= 200 && response.status < 300) {
      return {
        url: initialUrl,
        statusCode: response.status,
        redirected,
        finalUrl: currentUrl,
        ok: isApproved,
        notes: isApproved ? undefined : "unapproved_domain",
      };
    }

    if (REDIRECT_STATUSES.has(response.status) && isApproved) {
      return {
        url: initialUrl,
        statusCode: response.status,
        redirected: true,
        finalUrl: currentUrl,
        ok: true,
      };
    }

    return {
      url: initialUrl,
      statusCode: response.status,
      redirected,
      finalUrl: currentUrl,
      ok: false,
      notes: "http_error",
    };
  }

  return {
    url: initialUrl,
    redirected: true,
    finalUrl: currentUrl,
    ok: false,
    notes: "too_many_redirects",
    statusCode: lastStatus,
  };
}

async function inspectLink(url: string): Promise<LinkCheckResult> {
  if (isNonHttpLink(url)) {
    return { url, ok: true, notes: "non_http_link" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      url,
      ok: false,
      notes: "invalid_url",
    };
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return {
      url,
      ok: false,
      notes: "unsupported_protocol",
    };
  }

  if (containsDevPattern(parsed.hostname)) {
    return {
      url,
      ok: false,
      finalUrl: parsed.toString(),
      notes: "dev_domain_detected",
    };
  }

  try {
    return await followRedirects(parsed.toString());
  } catch (error) {
    return {
      url,
      ok: false,
      finalUrl: parsed.toString(),
      notes: (error as Error).message,
    };
  }
}

export async function checkLinks(urls: string[]): Promise<LinkCheckResult[]> {
  return Promise.all(urls.map((link) => limit(() => inspectLink(link))));
}
