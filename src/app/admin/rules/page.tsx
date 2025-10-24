"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AdditionalRule, DisclaimerRule, KeywordRule, LinkRule, RiskRule } from "@prisma/client";

import { DisclaimerManager } from "@/components/DisclaimerManager";
import { LinkRulesManager } from "@/components/LinkRulesManager";
import { RulesImportForm } from "@/components/RulesImportForm";
import { AdditionalRuleEditModal } from "@/components/AdditionalRuleEditModal";

interface ImportCounts {
  riskRules: number;
  keywordRules: number;
  additionalRules: number;
}

function RulesTable({
  title,
  description,
  headers,
  rows,
  emptyMessage,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: ReactNode[][];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          {rows.length} records
        </span>
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        {rows.length > 0 ? (
          <div className="max-h-96 overflow-y-auto bg-white/90">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-900/5">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90 text-slate-700">
                {rows.map((row, index) => (
                  <tr key={index} className="align-top">
                    {row}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            {emptyMessage}
          </p>
        )}
      </div>
    </section>
  );
}

export default function AdminRulesPage() {
  const [counts, setCounts] = useState<ImportCounts>({
    riskRules: 0,
    keywordRules: 0,
    additionalRules: 0,
  });

  const [riskRules, setRiskRules] = useState<RiskRule[]>([]);
  const [disclaimers, setDisclaimers] = useState<DisclaimerRule[]>([]);
  const [linkRules, setLinkRules] = useState<LinkRule[]>([]);
  const [keywordRules, setKeywordRules] = useState<KeywordRule[]>([]);
  const [additionalRules, setAdditionalRules] = useState<AdditionalRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AdditionalRule | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadRules = async () => {
    try {
      const response = await fetch('/api/rules');
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();

      setRiskRules(data.riskRules || []);
      setDisclaimers(data.disclaimers || []);
      setLinkRules(data.linkRules || []);
      setKeywordRules(data.keywordRules || []);
      setAdditionalRules(data.additionalRules || []);

      setCounts({
        riskRules: data.riskRules?.length || 0,
        keywordRules: data.keywordRules?.length || 0,
        additionalRules: data.additionalRules?.length || 0,
      });
    } catch (error) {
      console.error("Failed to load rule records", error);
      setLoadError(
        "Unable to load rules from the database. Confirm DATABASE_URL is configured and migrations are applied."
      );
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleEditRule = (rule: AdditionalRule) => {
    setEditingRule(rule);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingRule(null);
  };

  const handleRuleUpdated = async () => {
    await loadRules();
    handleCloseEditModal();
  };

  return (
    <section className="space-y-12">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-slate-100 shadow-2xl shadow-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.2),_transparent_60%)]" />
        <div className="relative space-y-6 p-8 md:p-10">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Compliance Toolkit
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Rules Administration</h1>
            <p className="max-w-3xl text-sm text-slate-300 md:text-base">
              Curate disclaimers, link requirements, and keyword triggers from a single command center. Import CSV updates in bulk, or edit individual entries in-line without breaking your compliance matrix.
            </p>
          </div>
          {loadError ? (
            <p className="rounded-2xl border border-amber-200/60 bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
              {loadError}
            </p>
          ) : null}
        </div>
      </div>

      <DisclaimerManager key={`disclaimers-${disclaimers.length}`} initialDisclaimers={disclaimers} />

      <LinkRulesManager key={`linkrules-${linkRules.length}`} initialRules={linkRules} />

      <RulesImportForm initialCounts={counts} />

      <div className="grid gap-8 lg:grid-cols-2">
        <RulesTable
          title="Risk warnings"
          description="Entity + silo combinations determine which risk statements the QC model enforces."
          headers={["Entity", "Variant", "Silo filter", "Text", "Active"]}
          rows={riskRules.map((rule) => [
            <td key="entity" className="px-4 py-3 font-medium text-slate-900">
              {rule.entity}
            </td>,
            <td key="variant" className="px-4 py-3 text-slate-700">
              {rule.variant}
            </td>,
            <td key="silo" className="px-4 py-3 text-slate-500">
              {rule.siloFilter || "All"}
            </td>,
            <td key="text" className="px-4 py-3 text-slate-700">
              {rule.text}
            </td>,
            <td key="active" className="px-4 py-3 text-slate-700">
              {rule.active ? "Yes" : "No"}
            </td>,
          ])}
          emptyMessage="No risk rules imported yet. Upload risk_rules.csv to seed the matrix."
        />

        <RulesTable
          title="Keyword triggers"
          description="When a keyword appears in the email, the QC run checks for the required supporting language."
          headers={["Keyword", "Required text", "Active"]}
          rows={keywordRules.map((rule) => [
            <td key="keyword" className="px-4 py-3 font-medium text-slate-900">
              {rule.keyword}
            </td>,
            <td key="text" className="px-4 py-3 text-slate-700">
              {rule.requiredText}
            </td>,
            <td key="active" className="px-4 py-3 text-slate-700">
              {rule.active ? "Yes" : "No"}
            </td>,
          ])}
          emptyMessage="No keyword rules configured. Upload keyword_rules.csv to configure triggers."
        />

        <RulesTable
          title="Additional copy rules"
          description="Silo-specific compliance statements and campaign callouts."
          headers={["Topic", "Silo", "Entity", "Text", "Notes", "Active", "Actions"]}
          rows={additionalRules.map((rule) => [
            <td key="topic" className="px-4 py-3 font-medium text-slate-900">
              {rule.topic}
            </td>,
            <td key="silo" className="px-4 py-3 text-slate-700">
              {rule.silo}
            </td>,
            <td key="entity" className="px-4 py-3 text-slate-700">
              {rule.entity}
            </td>,
            <td key="text" className="px-4 py-3 text-slate-700 max-w-xs truncate">
              {rule.text}
            </td>,
            <td key="notes" className="px-4 py-3 text-slate-500 max-w-xs truncate">
              {rule.notes || ""}
            </td>,
            <td key="active" className="px-4 py-3 text-slate-700">
              {rule.active ? "Yes" : "No"}
            </td>,
            <td key="actions" className="px-4 py-3">
              <button
                onClick={() => handleEditRule(rule)}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Edit
              </button>
            </td>,
          ])}
          emptyMessage="No additional rules available. Upload additional_rules.csv to keep campaign guardrails in sync."
        />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
        <h2 className="text-xl font-semibold text-slate-900">CSV templates</h2>
        <p className="mt-2 text-sm text-slate-600">
          Repository defaults live under <code>data/</code>. Update the files locally, import them here, and commit changes so the rest of the team has the latest compliance matrix.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">data/risk_rules.csv</li>
          <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">data/keyword_rules.csv</li>
          <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">data/additional_rules.csv</li>
        </ul>
      </section>

      {isEditModalOpen && editingRule && (
        <AdditionalRuleEditModal
          rule={editingRule}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onRuleUpdated={handleRuleUpdated}
        />
      )}
    </section>
  );
}
