"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisclaimerRule } from "@prisma/client";

import { EMAIL_TYPE_OPTIONS, ENTITY_OPTIONS, SILO_OPTIONS } from "@/lib/constants";
import type { EmailType } from "@/lib/constants";

interface Props {
  initialDisclaimers: DisclaimerRule[];
}

interface FormState {
  entity: string;
  silo: string;
  kind: string;
  text: string;
  version: string;
  active: boolean;
  emailType: EmailType;
}

function sortDisclaimers(disclaimers: DisclaimerRule[]): DisclaimerRule[] {
  return [...disclaimers].sort((a, b) => {
    if (a.entity !== b.entity) {
      return a.entity.localeCompare(b.entity);
    }
    const siloA = a.silo ?? "";
    const siloB = b.silo ?? "";
    if (siloA !== siloB) {
      return siloA.localeCompare(siloB);
    }
    const typeA = a.emailType ?? "marketing";
    const typeB = b.emailType ?? "marketing";
    if (typeA !== typeB) {
      return typeA.localeCompare(typeB);
    }
    if (a.kind !== b.kind) {
      return a.kind.localeCompare(b.kind);
    }
    return a.text.localeCompare(b.text);
  });
}

function formatEmailType(value: string | null | undefined): string {
  if (!value) {
    return "Marketing";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const EMPTY_FORM: FormState = {
  entity: ENTITY_OPTIONS[0] ?? "UK",
  silo: "",
  kind: "",
  text: "",
  version: "v1",
  active: true,
  emailType: "marketing",
};

export function DisclaimerManager({ initialDisclaimers }: Props) {
  const [disclaimers, setDisclaimers] = useState<DisclaimerRule[]>(() => sortDisclaimers(initialDisclaimers));

  // Update disclaimers when initialDisclaimers prop changes
  useEffect(() => {
    setDisclaimers(sortDisclaimers(initialDisclaimers));
  }, [initialDisclaimers]);
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
    return Array.from(new Set(disclaimers.map((item) => item.kind))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [disclaimers]);

  const fieldClasses =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const inlineFieldClasses =
    "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200";
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
      const response = await fetch("/api/disclaimers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create disclaimer");
      }

      if (!payload.disclaimer) {
        throw new Error("API response missing disclaimer payload");
      }

      setDisclaimers((prev) => sortDisclaimers([...prev, payload.disclaimer] as DisclaimerRule[]));
      setCreateSuccess("Disclaimer added successfully.");
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

  const startEdit = (item: DisclaimerRule) => {
    setEditingId(item.id);
    setEditForm({
      entity: item.entity,
      silo: item.silo ?? "",
      kind: item.kind,
      text: item.text,
      version: item.version ?? "v1",
      active: item.active,
      emailType: (item.emailType as EmailType) ?? "marketing",
    });
    setEditError(null);
    setEditSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setEditError(null);
    setEditSuccess(null);
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
      const response = await fetch(`/api/disclaimers/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update disclaimer");
      }

      if (!payload.disclaimer) {
        throw new Error("API response missing disclaimer payload");
      }

      setDisclaimers((prev) =>
        sortDisclaimers(
          prev.map((item) => (item.id === payload.disclaimer.id ? payload.disclaimer : item)) as DisclaimerRule[],
        ),
      );
      setEditSuccess("Disclaimer updated successfully.");
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
            Disclaimers
            <span className="ml-2 text-sm font-normal text-slate-500">({disclaimers.length})</span>
          </h2>
          <p className="text-sm text-slate-600">
            Manage entity-specific disclaimers inline. Create new kinds, tweak copy, or toggle activation without editing CSV files.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {disclaimers.length} total rows
        </span>
      </header>

      <form
        onSubmit={handleCreateSubmit}
        className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-inner"
      >
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Add disclaimer</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Entity
            <select
              value={createForm.entity}
              onChange={(event) => handleCreateChange("entity", event.target.value)}
              className={fieldClasses}
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Silo (optional)
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
            Kind
            <input
              type="text"
              list="disclaimer-kinds"
              value={createForm.kind}
              onChange={(event) => handleCreateChange("kind", event.target.value)}
              placeholder="e.g. transactional"
              className={fieldClasses}
              required
            />
            <datalist id="disclaimer-kinds">
              {knownKinds.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            Text
            <textarea
              value={createForm.text}
              onChange={(event) => handleCreateChange("text", event.target.value)}
              className="min-h-[160px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Version
            <input
              type="text"
              value={createForm.version}
              onChange={(event) => handleCreateChange("version", event.target.value)}
              className={fieldClasses}
            />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700">
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
          <p className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">
            {createError}
          </p>
        ) : null}
        {createSuccess ? (
          <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
            {createSuccess}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submittingCreate}
            className={primaryButtonClasses}
          >
            {submittingCreate ? "Saving..." : "Add disclaimer"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90">
        {disclaimers.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-900/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Silo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Email type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Kind</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Text</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Version</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/95 text-slate-700">
              {disclaimers.map((item) => {
                const isEditing = item.id === editingId;
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.entity}
                          onChange={(event) => handleEditChange("entity", event.target.value)}
                          className={inlineFieldClasses}
                        >
                          {ENTITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.entity
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.silo}
                          onChange={(event) => handleEditChange("silo", event.target.value)}
                          className={inlineFieldClasses}
                        >
                          <option value="">All silos</option>
                          {SILO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        item.silo || "All"
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <select
                          value={editForm.emailType}
                          onChange={(event) => handleEditChange("emailType", event.target.value as EmailType)}
                          className={inlineFieldClasses}
                        >
                          {EMAIL_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        formatEmailType(item.emailType)
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <input
                          type="text"
                          list="disclaimer-kinds"
                          value={editForm.kind}
                          onChange={(event) => handleEditChange("kind", event.target.value)}
                          className={inlineFieldClasses}
                        />
                      ) : (
                        item.kind
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <textarea
                          value={editForm.text}
                          onChange={(event) => handleEditChange("text", event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          rows={6}
                        />
                      ) : (
                        <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50/60 px-3 py-2 text-sm">
                          {item.text}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <input
                          type="text"
                          value={editForm.version}
                          onChange={(event) => handleEditChange("version", event.target.value)}
                          className={inlineFieldClasses}
                        />
                      ) : (
                        item.version ?? "v1"
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {isEditing && editForm ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editForm.active}
                            onChange={(event) => handleEditChange("active", event.target.checked)}
                            className={checkboxClasses}
                          />
                          <span>Active</span>
                        </label>
                      ) : item.active ? (
                        "Yes"
                      ) : (
                        "No"
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      {isEditing && editForm ? (
                        <form onSubmit={handleEditSubmit} className="inline-flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={submittingEdit}
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-400 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-400 hover:via-sky-400 hover:to-indigo-300 disabled:cursor-not-allowed disabled:from-indigo-300 disabled:via-sky-300 disabled:to-indigo-200"
                          >
                            {submittingEdit ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={secondaryButtonClasses}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className={secondaryButtonClasses}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No disclaimers found. Add your first disclaimer above to get started.
          </p>
        )}
      </div>

      {editError ? (
        <p className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-600">{editError}</p>
      ) : null}
      {editSuccess ? (
        <p className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {editSuccess}
        </p>
      ) : null}
    </section>
  );
}
