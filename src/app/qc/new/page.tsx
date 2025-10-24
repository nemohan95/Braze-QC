"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";

import { EMAIL_TYPE_OPTIONS, ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import { CopyDocEditor } from "@/components/CopyDocEditor";
import type { CopyDocEditorChange } from "@/components/CopyDocEditor";
import type { CopyDocLink } from "@/lib/copyDoc";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-expect-error - mammoth browser module doesn't have proper types
    const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return typeof result.value === "string" ? result.value : "";
}

async function readCopyDoc(file: File): Promise<string> {
  if (file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx")) {
    return extractDocxText(file);
  }
  return file.text();
}

function plainTextToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      `<p>${segment
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`,
    )
    .join("\n");
}

export default function NewQcPage() {
  const router = useRouter();
  const [auditName, setAuditName] = useState("");
  const [brazeUrl, setBrazeUrl] = useState("");
  const [copyDocHtml, setCopyDocHtml] = useState("");
  const [copyDocText, setCopyDocText] = useState("");
  const [copyDocLinks, setCopyDocLinks] = useState<CopyDocLink[]>([]);
  const [emailLinks, setEmailLinks] = useState<string[]>([]);
  const [emailLinksFetched, setEmailLinksFetched] = useState(false);
  const [fetchingEmailLinks, setFetchingEmailLinks] = useState(false);
  const [emailLinksError, setEmailLinksError] = useState<string | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [silo, setSilo] = useState<typeof SILO_OPTIONS[number] | "">("");
  const [entity, setEntity] = useState<typeof ENTITY_OPTIONS[number] | "">("");
  const [emailType, setEmailType] = useState<typeof EMAIL_TYPE_OPTIONS[number]>("marketing");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }

    const file = event.target.files[0];
    setUploading(true);
    setError(null);

    try {
      const text = (await readCopyDoc(file)).trim();
      if (text) {
        const html = plainTextToHtml(text);
        setCopyDocHtml((prev) => {
          if (!prev) {
            return html;
          }
          if (!html) {
            return prev;
          }
          return `${prev}\n${html}`;
        });
        setCopyDocText((prev) => (prev ? `${prev}\n\n${text}` : text));
      }
    } catch (err) {
      setError((err as Error).message || "Failed to read copy doc");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const fetchEmailPreview = useCallback(async () => {
    if (!brazeUrl.trim()) {
      setEmailLinksError("Enter the Braze preview URL first.");
      return;
    }

    setFetchingEmailLinks(true);
    setEmailLinksError(null);
    setEmailLinks([]);
    setEmailLinksFetched(false);

    try {
      const response = await fetch("/api/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brazeUrl }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch email preview");
      }

      const links: unknown = payload.links;
      if (Array.isArray(links)) {
        setEmailLinks(
          links
            .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
            .filter((entry) => entry.length > 0),
        );
      } else {
        setEmailLinks([]);
      }
      setEmailLinksFetched(true);
    } catch (err) {
      setEmailLinksError((err as Error).message);
      setEmailLinks([]);
      setEmailLinksFetched(false);
    } finally {
      setFetchingEmailLinks(false);
    }
  }, [brazeUrl]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/qc-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: auditName.trim() || null,
          brazeUrl,
          copyDocText,
          copyDocHtml,
          copyDocLinks,
          emailPreviewLinks: emailLinks,
          silo,
          entity,
          emailType,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to create QC run");
      }

      const payload = await response.json();
      router.push(`/qc/${payload.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    uploading ||
    fetchingEmailLinks ||
    !emailLinksFetched ||
    !brazeUrl ||
    !copyDocText ||
    !silo ||
    !entity;

  const uploadDisabled = submitting || uploading || !emailLinksFetched;

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkIndex(index);
      setTimeout(() => setCopiedLinkIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const onEditorChange = useCallback(
    ({ html, text, links }: CopyDocEditorChange) => {
      setCopyDocHtml(html);
      setCopyDocText(text.trim());
      setCopyDocLinks(links);
    },
    [],
  );

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">New QC Run</h1>
        <p className="text-sm text-slate-600">
          Paste the Braze preview URL, include the approved copy, and select the relevant silo and entity.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-1">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Audit Name (Optional)
          <input
            type="text"
            value={auditName}
            onChange={(event) => setAuditName(event.target.value)}
            placeholder="Give your audit a descriptive name"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="text-xs font-normal text-slate-500">
            Leave blank to use the default naming convention.
          </p>
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Braze Preview URL
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                required
                type="url"
                value={brazeUrl}
                onChange={(event) => {
                  const value = event.target.value;
                  setBrazeUrl(value);
                  setEmailLinks([]);
                  setEmailLinksFetched(false);
                  setEmailLinksError(null);
                }}
                placeholder="https://braze-…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button
                type="button"
                onClick={fetchEmailPreview}
                disabled={fetchingEmailLinks || !brazeUrl.trim()}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  fetchingEmailLinks || !brazeUrl.trim()
                    ? "cursor-not-allowed bg-indigo-300 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {fetchingEmailLinks ? "Fetching…" : emailLinksFetched ? "Refetch links" : "Fetch links"}
              </button>
            </div>
            {!emailLinksFetched ? (
              <p className="text-xs font-normal text-slate-500">
                Fetch the Braze preview to unlock copy doc editing and link checks.
              </p>
            ) : null}
            {emailLinksError ? (
              <p className="text-xs font-normal text-rose-600">{emailLinksError}</p>
            ) : null}
            {emailLinksFetched ? (
              emailLinks.length > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      {emailLinks.length} {emailLinks.length === 1 ? 'Link' : 'Links'} Detected
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-lg bg-white max-h-48 overflow-y-auto">
                    <div className="divide-y divide-slate-100">
                      {emailLinks.map((link, index) => (
                        <div
                          key={index}
                          className="group flex items-center gap-2 p-3 hover:bg-slate-50 transition-colors"
                        >
                          <LinkIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                              title={link}
                            >
                              {link}
                            </a>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(link, index)}
                              className="p-1 rounded hover:bg-slate-200 transition-colors"
                              title="Copy link"
                            >
                              {copiedLinkIndex === index ? (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-slate-500" />
                              )}
                            </button>
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-slate-200 transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="h-3 w-3 text-slate-500" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Click any link to open it in a new tab, or use the copy button to copy the URL.
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-amber-800">No links detected</p>
                    <p className="text-xs text-amber-600">The Braze preview doesn't contain any clickable links.</p>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </label>
        <div className="grid gap-2 text-sm font-medium text-slate-700">
          <label className="flex flex-col gap-2">
            Silo
            <select
              value={silo}
              onChange={(event) => setSilo(event.target.value as typeof silo)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            >
              <option value="" disabled>
                Select silo
              </option>
              {SILO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Entity
            <select
              value={entity}
              onChange={(event) => setEntity(event.target.value as typeof entity)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            >
              <option value="" disabled>
                Select entity
              </option>
              {ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Email type
            <select
              value={emailType}
              onChange={(event) => setEmailType(event.target.value as typeof emailType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {EMAIL_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="copy-text">
            Copy Document Text
          </label>
          <CopyDocEditor
            value={{ html: copyDocHtml }}
            onChange={onEditorChange}
            disabled={submitting || !emailLinksFetched}
          />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{copyDocText.length} characters</span>
            <label
              className={`inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold shadow-sm transition ${
                uploadDisabled
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "cursor-pointer bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Upload copy doc
              <input
                type="file"
                accept=".txt,.md,.docx"
                onChange={onFileChange}
                className="hidden"
                disabled={uploadDisabled}
              />
            </label>
          </div>
          {copyDocLinks.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {copyDocLinks.length} {copyDocLinks.length === 1 ? 'Link' : 'Links'} in Copy Document
                </span>
              </div>
              <div className="border border-slate-200 rounded-lg bg-slate-50 max-h-32 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                  {copyDocLinks.map((item, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 p-2 hover:bg-slate-100 transition-colors"
                    >
                      <LinkIcon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-xs text-slate-600 truncate block"
                          title={item.href}
                        >
                          {item.href}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.href, index + 1000)}
                        className="p-1 rounded hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100"
                        title="Copy link"
                      >
                        {copiedLinkIndex === index + 1000 ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          Supported formats: plain text (.txt), Markdown (.md), and Word documents (.docx). DOCX files are converted client-side using Mammoth. Use the toolbar to keep CTA links intact.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {submitting ? "Submitting…" : "Run QC"}
        </button>
        {uploading ? <span className="text-xs text-slate-500">Processing upload…</span> : null}
      </div>
    </form>
  );
}
