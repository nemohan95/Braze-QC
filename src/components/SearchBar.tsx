'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  description: string;
  href: string;
  category: 'feature' | 'page' | 'admin';
  keywords: string[];
}

const searchIndex: SearchResult[] = [
  {
    title: 'New QC Run',
    description: 'Start a new quality control check for Braze marketing emails',
    href: '/qc/new',
    category: 'feature',
    keywords: ['new', 'qc', 'run', 'quality', 'control', 'check', 'email', 'braze']
  },
  {
    title: 'View Past Reports',
    description: 'Browse and view historical quality control reports',
    href: '/qc',
    category: 'feature',
    keywords: ['reports', 'past', 'history', 'qc', 'quality', 'control', 'results']
  },
  {
    title: 'Admin Rules Console',
    description: 'Manage disclaimers, import CSV rules, and configure validation settings',
    href: '/admin/rules',
    category: 'admin',
    keywords: ['admin', 'rules', 'disclaimers', 'csv', 'import', 'settings', 'configuration', 'manage']
  },
  {
    title: 'Copy Doc Validation',
    description: 'Validate email copy against approved documents and detect differences',
    href: '/qc/new',
    category: 'feature',
    keywords: ['copy', 'doc', 'document', 'validation', 'compare', 'differences', 'text', 'content']
  },
  {
    title: 'Link Checking',
    description: 'Automated link validation with redirect following and domain verification',
    href: '/qc/new',
    category: 'feature',
    keywords: ['links', 'url', 'redirect', 'domain', 'verification', 'check', 'validation']
  },
  {
    title: 'GPT-4.1 Content Analysis',
    description: 'AI-powered content validation using structured JSON schema',
    href: '/qc/new',
    category: 'feature',
    keywords: ['gpt', 'ai', 'analysis', 'content', 'validation', 'schema', 'json', 'openai']
  },
  {
    title: 'Risk & Disclaimer Matrix',
    description: 'Entity and silo-specific risk warnings and regulatory disclaimers',
    href: '/admin/rules',
    category: 'admin',
    keywords: ['risk', 'disclaimer', 'matrix', 'entity', 'silo', 'regulatory', 'warnings', 'compliance']
  },
  {
    title: 'CSV Export',
    description: 'Download quality control results in CSV format',
    href: '/qc',
    category: 'feature',
    keywords: ['csv', 'export', 'download', 'results', 'data', 'format']
  },
  {
    title: 'PDF Reports',
    description: 'Generate and download PDF reports for sharing with stakeholders',
    href: '/qc',
    category: 'feature',
    keywords: ['pdf', 'report', 'download', 'share', 'stakeholders', 'generate']
  },
  {
    title: 'Keyword Rules',
    description: 'Configure required text for specific keywords and vendor terms',
    href: '/admin/rules',
    category: 'admin',
    keywords: ['keyword', 'rules', 'vendor', 'terms', 'required', 'text', 'configuration']
  },
  {
    title: 'Email Preview Integration',
    description: 'Fetch and analyze Braze email preview HTML content',
    href: '/qc/new',
    category: 'feature',
    keywords: ['preview', 'braze', 'email', 'html', 'fetch', 'integration', 'content']
  },
  {
    title: 'Quality Control Dashboard',
    description: 'Main dashboard for managing and viewing QC runs',
    href: '/qc',
    category: 'page',
    keywords: ['dashboard', 'main', 'qc', 'runs', 'manage', 'view']
  },
  {
    title: 'Help & FAQ',
    description: 'Comprehensive documentation, getting started guide, and troubleshooting information',
    href: '/help',
    category: 'page',
    keywords: ['help', 'faq', 'documentation', 'guide', 'tutorial', 'getting started', 'troubleshooting', 'support']
  }
];

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      return;
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);

    const filteredResults = searchIndex.filter(item => {
      const searchableText = [
        item.title,
        item.description,
        ...item.keywords
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    }).sort((a, b) => {
      // Prioritize exact title matches
      const aTitleMatch = a.title.toLowerCase().includes(query.toLowerCase());
      const bTitleMatch = b.title.toLowerCase().includes(query.toLowerCase());

      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;

      // Then prioritize by category (features first, then pages, then admin)
      const categoryOrder = { feature: 0, page: 1, admin: 2 };
      return categoryOrder[a.category] - categoryOrder[b.category];
    });

    setResults(filteredResults.slice(0, 6)); // Limit to 6 results
  }, [query]);

  const handleResultClick = (href: string) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    router.push(href);
  };

  const getCategoryBadge = (category: SearchResult['category']) => {
    const styles = {
      feature: 'bg-indigo-50 text-indigo-700',
      page: 'bg-green-50 text-green-700',
      admin: 'bg-orange-50 text-orange-700'
    };

    const labels = {
      feature: 'Feature',
      page: 'Page',
      admin: 'Admin'
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[category]}`}>
        {labels[category]}
      </span>
    );
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search features, pages, or information..."
          className="block w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result.href)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {result.title}
                      </h4>
                      {getCategoryBadge(result.category)}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {result.description}
                    </p>
                  </div>
                  <svg
                    className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-slate-200 px-4 py-2 bg-slate-50">
            <p className="text-xs text-slate-500">
              Press <kbd className="px-1 py-0.5 text-xs bg-white border border-slate-200 rounded">Enter</kbd> to select, <kbd className="px-1 py-0.5 text-xs bg-white border border-slate-200 rounded">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h-.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try searching for &quot;QC&quot;, &quot;admin&quot;, &quot;reports&quot;, or &quot;export&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}