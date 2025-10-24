"use client";

import { useEffect, useMemo, useState } from "react";
import type { LinkRule } from "@prisma/client";

import { EMAIL_TYPE_OPTIONS, ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import type { EmailType } from "@/lib/constants";

const MATCH_TYPE_OPTIONS = [
  { value: "contains", label: "URL contains" },
  { value: "starts_with", label: "URL starts with" },
  { value: "ends_with", label: "URL ends with" },
  { value: "exact", label: "URL matches exactly" },
] as const;

interface FormState {
  entity: string;
  silo: string;
  emailType: EmailType;
  kind: string;
  matchType: (typeof MATCH_TYPE_OPTIONS)[number]["value"];
  hrefPattern: string;
  notes: string;
  active: boolean;
}

function sortLinkRules(rules: LinkRule[]): LinkRule[] {
  return [...rules].sort((a, b) => {
    if (a.entity !== b.entity) {
      return a.entity.localeCompare(b.entity);
    }
    const siloA = a.silo ?? "";
    const siloB = b.silo ?? "";
    if (siloA !== siloB) {
      return siloA.localeCompare(siloB);
    }
    if (a.emailType !== b.emailType) {
      return (a.emailType ?? "marketing").localeCompare(b.emailType ?? "marketing");
    }
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    return a.hrefPattern.localeCompare(b.hrefPattern);
  });
}

const EMPTY_FORM: FormState = {
  entity: ENTITY_OPTIONS[0] ?? "UK",
  silo: "",
  emailType: "marketing",
  kind: "",
  matchType: "contains",
  hrefPattern: "",
  notes: "",
  active: true,
};

export function LinkRulesManager({ initialRules }: { initialRules: LinkRule[] }) {
  const [rules, setRules] = useState<LinkRule[]>(() => sortLinkRules(initialRules));

  // Update rules when initialRules prop changes
  useEffect(() => {
    setRules(sortLinkRules(initialRules));
  }, [initialRules]);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const knownKinds = useMemo(() => {
    return Array.from(new Set(rules.map((item) => item.kind))).sort((a, b) => a.localeCompare(b));
  }, [rules]);

  const fieldClasses =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const inlineFieldClasses =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const textareaClasses =
    "min-h-[140px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const checkboxClasses =
    "h-4 w-4 rounded border border-slate-300 text-indigo-500 focus:ring-indigo-400";
  const primaryButtonClasses =
    "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-400/30 transition hover:from-indigo-400 hover:via-sky-400 hover:to-indigo-300 disabled:cursor-not-allowed disabled:from-indigo-300 disabled:via-sky-300 disabled:to-indigo-200";
  const secondaryButtonClasses =
    "rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100";

  const handleCreateChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setSubmittingCreate(true);

    try {
      const response = await fetch("/api/link-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create link rule");
      }

      if (!payload.linkRule) {
        throw new Error("API response missing link rule payload");
      }

      setRules((prev) => sortLinkRules([...prev, payload.linkRule] as LinkRule[]));
      setCreateSuccess("Link rule added successfully.");
      setCreateForm((prev) => ({
        ...EMPTY_FORM,
        entity: prev.entity,
        silo: prev.silo,
        emailType: prev.emailType,
      }));
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setSubmittingCreate(false);
    }
  }

  const startEdit = (rule: LinkRule) => {
    setEditingId(rule.id);
    setEditError(null);
    setEditSuccess(null);
    setEditForm({
      entity: rule.entity,
      silo: rule.silo ?? "",
      emailType: (rule.emailType as EmailType) ?? "marketing",
      kind: rule.kind,
      matchType: (rule.matchType as FormState["matchType"]) ?? "contains",
      hrefPattern: rule.hrefPattern,
      notes: rule.notes ?? "",
      active: rule.active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
    setEditSuccess(null);
    setEditForm(null);
  };

  const handleEditChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !editForm) {
      return;
    }

    setEditError(null);
    setEditSuccess(null);
    setSubmittingEdit(true);

    try {
      const response = await fetch(`/api/link-rules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update link rule");
      }

      if (!payload.linkRule) {
        throw new Error("API response missing link rule payload");
      }

      setRules((prev) =>
        sortLinkRules(
          prev.map((item) => (item.id === payload.linkRule.id ? payload.linkRule : item)) as LinkRule[],
        ),
      );
      setEditSuccess("Link rule updated successfully.");
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      setEditError((error as Error).message);
    } finally {
      setSubmittingEdit(false);
    }
  }

  return (
    <section className="space-y-8 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/70">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Link requirements
            <span className="ml-2 text-sm font-normal text-slate-500">({rules.length})</span>
          </h2>
          <p className="text-sm text-slate-600">
            Define mandatory marketing links by entity, silo, and email type. Highlight matched URLs by pattern (contains, starts with, ends with, or exact).
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {rules.length} total rows
        </span>
      </header>

      <form
        className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-inner"
        onSubmit={handleCreateSubmit}
      >
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Add link rule</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Entity
            <select
              value={createForm.entity}
              onChange={(event) => handleCreateChange("entity", event.target.value)}
              className={fieldClasses}
              required
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Silo
            <select
              value={createForm.silo}
              onChange={(event) => handleCreateChange("silo", event.target.value)}
              className={fieldClasses}
            >
              <option value="">All silos</option>
              {SILO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Email type
            <select
              value={createForm.emailType}
              onChange={(event) => handleCreateChange("emailType", event.target.value as EmailType)}
              className={fieldClasses}
            >
              {EMAIL_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Kind / label
            <input
              type="text"
              value={createForm.kind}
              onChange={(event) => handleCreateChange("kind", event.target.value)}
              className={fieldClasses}
              placeholder={knownKinds[0] ?? "facebook"}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Match type
            <select
              value={createForm.matchType}
              onChange={(event) => handleCreateChange("matchType", event.target.value as FormState["matchType"])}
              className={fieldClasses}
            >
              {MATCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            URL pattern
            <input
              type="text"
              value={createForm.hrefPattern}
              onChange={(event) => handleCreateChange("hrefPattern", event.target.value)}
              className={fieldClasses}
              placeholder="facebook.com/tradu"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            Notes
            <textarea
              value={createForm.notes}
              onChange={(event) => handleCreateChange("notes", event.target.value)}
              rows={2}
              className={textareaClasses}
              placeholder="Optional context"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(event) => handleCreateChange("active", event.target.checked)}
              className={checkboxClasses}
            />
            Active
          </label>
        </div>
        {createError ? (
          <p className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">{createError}</p>
        ) : null}
        {createSuccess ? (
          <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">{createSuccess}</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submittingCreate}
            className={primaryButtonClasses}
          >
            {submittingCreate ? "Saving..." : "Add link rule"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Existing rules</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90">
          {rules.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No link rules configured yet.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-900/5">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Silo</th>
                    <th className="px-4 py-3">Email type</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Match</th>
                    <th className="px-4 py-3">Pattern</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/95 text-slate-700">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="align-top">
                      <td className="px-4 py-4 font-medium text-slate-900">{rule.entity}</td>
                      <td className="px-4 py-4 text-slate-600">{rule.silo || "All"}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {(rule.emailType ?? "marketing").charAt(0).toUpperCase() + (rule.emailType ?? "marketing").slice(1)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{rule.kind}</td>
                      <td className="px-4 py-4 text-slate-600">{rule.matchType}</td>
                      <td className="px-4 py-4 text-slate-600">{rule.hrefPattern}</td>
                      <td className="px-4 py-4 text-slate-500 whitespace-pre-wrap">{rule.notes || ""}</td>
                      <td className="px-4 py-4 text-slate-600">{rule.active ? "Yes" : "No"}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => startEdit(rule)}
                          className={secondaryButtonClasses}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingId && editForm ? (
        <form
          className="space-y-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-200/70"
          onSubmit={handleEditSubmit}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Edit link rule</h3>
            <button type="button" onClick={cancelEdit} className={secondaryButtonClasses}>
              Cancel
            </button>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Entity
              <select
                value={editForm.entity}
                onChange={(event) => handleEditChange("entity", event.target.value)}
                className={fieldClasses}
                required
              >
                {ENTITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Silo
              <select
                value={editForm.silo}
                onChange={(event) => handleEditChange("silo", event.target.value)}
                className={fieldClasses}
              >
                <option value="">All silos</option>
                {SILO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Email type
              <select
                value={editForm.emailType}
                onChange={(event) => handleEditChange("emailType", event.target.value as EmailType)}
                className={fieldClasses}
              >
                {EMAIL_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Kind / label
              <input
                type="text"
                value={editForm.kind}
                onChange={(event) => handleEditChange("kind", event.target.value)}
                className={fieldClasses}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Match type
              <select
                value={editForm.matchType}
                onChange={(event) => handleEditChange("matchType", event.target.value as FormState["matchType"])}
                className={fieldClasses}
              >
                {MATCH_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
              URL pattern
              <input
                type="text"
                value={editForm.hrefPattern}
                onChange={(event) => handleEditChange("hrefPattern", event.target.value)}
                className={fieldClasses}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
              Notes
              <textarea
                value={editForm.notes}
                onChange={(event) => handleEditChange("notes", event.target.value)}
                rows={3}
                className={textareaClasses}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(event) => handleEditChange("active", event.target.checked)}
                className={checkboxClasses}
              />
              Active
            </label>
          </div>
          {editError ? (
            <p className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">{editError}</p>
          ) : null}
          {editSuccess ? (
            <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">{editSuccess}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingEdit}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-400 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-400/30 transition hover:from-emerald-400 hover:via-emerald-300 hover:to-lime-300 disabled:cursor-not-allowed disabled:from-emerald-300 disabled:via-emerald-200 disabled:to-lime-200"
            >
              {submittingEdit ? "Updating..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
