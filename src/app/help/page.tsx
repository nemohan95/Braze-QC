import Link from 'next/link';
import { ChevronDown, ChevronUp, Search, Shield, FileText, Link as LinkIcon, Brain, Download, Settings } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className='min-h-screen bg-slate-50'>
      <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-slate-900 mb-4'>Help & FAQ</h1>
          <p className='text-xl text-slate-600 max-w-2xl mx-auto'>
            Everything you need to know about Email QC - your automated quality control tool for Braze marketing emails
          </p>
          <div className='mt-6'>
            <Link
              href='/'
              className='inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium'
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-12'>
          <QuickLink
            href='/qc/new'
            icon={<FileText className='h-6 w-6' />}
            title='Start QC Run'
            description='Begin quality check'
          />
          <QuickLink
            href='/qc'
            icon={<Search className='h-6 w-6' />}
            title='View Reports'
            description='Past results'
          />
          <QuickLink
            href='/admin/rules'
            icon={<Settings className='h-6 w-6' />}
            title='Admin Panel'
            description='Manage rules'
          />
          <QuickLink
            href='/'
            icon={<Brain className='h-6 w-6' />}
            title='Search'
            description='Find features'
          />
        </div>

        {/* Getting Started */}
        <section className='bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8'>
          <h2 className='text-2xl font-bold text-slate-900 mb-6 flex items-center'>
            <Brain className='h-6 w-6 mr-3 text-indigo-600' />
            Getting Started
          </h2>

          <div className='space-y-6'>
            <Step number={1} title='Prepare Your Materials'>
              <ul className='list-disc list-inside text-slate-600 space-y-2 ml-4'>
                <li>Get the Braze preview URL for your email campaign</li>
                <li>Have your approved copy document ready (text or .docx file)</li>
                <li>Know your entity and silo for proper disclaimer rules</li>
              </ul>
            </Step>

            <Step number={2} title='Start a New QC Run'>
              <ul className='list-disc list-inside text-slate-600 space-y-2 ml-4'>
                <li>Click &quot;Start a New QC Run&quot; on the homepage</li>
                <li>Enter your Braze preview URL</li>
                <li>Paste your approved copy or upload a .docx file</li>
                <li>Select your entity and silo from the dropdowns</li>
                <li>Click &quot;Start QC Run&quot; to begin validation</li>
              </ul>
            </Step>

            <Step number={3} title='Review Results'>
              <ul className='list-disc list-inside text-slate-600 space-y-2 ml-4'>
                <li>Wait for the automated checks to complete</li>
                <li>Review the summary and detailed results</li>
                <li>Check any failed validations or warnings</li>
                <li>Download CSV or PDF reports if needed</li>
              </ul>
            </Step>
          </div>
        </section>

        {/* FAQ Sections */}
        <div className='space-y-8'>
          <FAQSection
            title='General Questions'
            icon={<Search className='h-5 w-5' />}
            questions={[
              {
                q: 'What is Email QC?',
                a: 'Email QC is an automated quality control tool that validates Braze marketing emails against approved copy documents, checks for required disclaimers, validates links, and ensures compliance with regulatory requirements using AI-powered analysis.'
              },
              {
                q: 'Who should use this tool?',
                a: 'Marketing teams, email specialists, compliance officers, and anyone responsible for ensuring email marketing campaigns meet quality standards and regulatory requirements before sending to customers.'
              },
              {
                q: 'What email platforms are supported?',
                a: 'Currently, Email QC is designed specifically for Braze marketing emails. It fetches email content from Braze shareable preview URLs.'
              },
              {
                q: 'Is my data secure?',
                a: 'Yes. All data is processed securely, and we use industry-standard security practices. Your email content and copy documents are only used for validation purposes.'
              }
            ]}
          />

          <FAQSection
            title='Features & Functionality'
            icon={<FileText className='h-5 w-5' />}
            questions={[
              {
                q: 'What does the AI validation check?',
                a: 'Our GPT-4.1 powered analysis validates subject lines, preheaders, body content, CTAs, and ensures all required disclaimers are present. It uses a structured JSON schema for consistent, reliable results.'
              },
              {
                q: 'How does link checking work?',
                a: 'The system automatically checks all links in your email: validates URLs, follows redirects (up to 5 hops), detects development domains, and records HTTP status codes. It flags any links that go to dev/staging environments or return errors.'
              },
              {
                q: 'What are entity and silo rules?',
                a: 'Entities represent different business units or regions (UK, EU, ROW, etc.), while silos represent specific business contexts. Different combinations trigger different regulatory disclaimers and risk warnings.'
              },
              {
                q: 'Can I customize the validation rules?',
                a: 'Yes. Admin users can manage disclaimer rules directly in the admin panel, and import CSV files for risk rules, keyword rules, and additional validation rules.'
              }
            ]}
          />

          <FAQSection
            title='Admin & Configuration'
            icon={<Settings className='h-5 w-5' />}
            questions={[
              {
                q: 'How do I access the admin panel?',
                a: 'Navigate to /admin/rules or click the &quot;Admin Rules Console&quot; link from the homepage search bar. Here you can manage disclaimers, import CSV rule files, and configure validation settings.'
              },
              {
                q: 'What CSV files can I import?',
                a: 'You can import three types of rule files: risk rules (entity-specific warnings), keyword rules (required text for specific terms), and additional rules (topic-specific validation rules). Templates are available in the /data directory.'
              },
              {
                q: 'How do I update disclaimer rules?',
                a: 'Disclaimer rules can be managed directly in the admin interface without requiring CSV imports. You can add, edit, or remove disclaimers and filter them by entity and silo.'
              },
              {
                q: 'Can I export my configuration?',
                a: 'Yes, you can export your rule configurations and QC run data from the admin panel for backup or sharing with other environments.'
              }
            ]}
          />

          <FAQSection
            title='Troubleshooting'
            icon={<Shield className='h-5 w-5' />}
            questions={[
              {
                q: 'Why is my QC run taking a long time?',
                a: 'QC runs typically take 1-3 minutes. Longer times may be due to: slow response from Braze preview URLs, many links to check, or high AI processing demand. Try refreshing the page or starting a new run.'
              },
              {
                q: 'The AI validation failed. What should I do?',
                a: 'Check that your Braze preview URL is accessible and contains valid HTML content. Ensure your copy document is properly formatted. If issues persist, try with a simpler email first.'
              },
              {
                q: 'Links are showing as failed. Why?',
                a: 'Common reasons: links point to dev/staging domains, URLs return 404/500 errors, redirects exceed 5 hops, or domains aren&apos;t in your approved list. Review the specific error messages in the link check results.'
              },
              {
                q: 'How do I report a bug or request a feature?',
                a: 'Contact your system administrator or development team with details about the issue, including steps to reproduce and any error messages you see.'
              }
            ]}
          />

          <FAQSection
            title='Technical Details'
            icon={<Download className='h-5 w-5' />}
            questions={[
              {
                q: 'What file formats are supported for copy documents?',
                a: 'You can paste text directly or upload .docx files. The system automatically converts .docx files to text for comparison with email content.'
              },
              {
                q: 'What export formats are available?',
                a: 'You can download results as CSV files for data analysis or as PDF reports designed for sharing with stakeholders. Both include full validation details and link check results.'
              },
              {
                q: 'Is there an API for programmatic access?',
                a: 'Yes, the application exposes RESTful APIs for creating QC runs, retrieving results, and managing rules. These are the same APIs used by the web interface.'
              },
              {
                q: 'What are the system requirements?',
                a: 'The web interface works on modern browsers (Chrome, Firefox, Safari, Edge). For mobile access, use a device with a screen width of at least 768px for the best experience.'
              }
            ]}
          />
        </div>

        {/* Support */}
        <section className='bg-indigo-50 rounded-xl p-8 mt-12 text-center'>
          <h3 className='text-xl font-semibold text-indigo-900 mb-4'>Still Need Help?</h3>
          <p className='text-indigo-700 mb-6 max-w-2xl mx-auto'>
            If you can&apos;t find the answer you&apos;re looking for, reach out to your system administrator or development team for assistance.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link
              href='/'
              className='inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500'
            >
              Return to Homepage
            </Link>
            <Link
              href='/admin/rules'
              className='inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50'
            >
              Admin Settings
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className='flex gap-4'>
      <div className='flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm'>
        {number}
      </div>
      <div className='flex-1'>
        <h3 className='font-semibold text-slate-900 mb-2'>{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function QuickLink({ href, icon, title, description }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className='bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow text-center'
    >
      <div className='flex justify-center text-indigo-600 mb-2'>{icon}</div>
      <h4 className='font-semibold text-slate-900 text-sm'>{title}</h4>
      <p className='text-xs text-slate-600 mt-1'>{description}</p>
    </Link>
  );
}

interface FAQSectionProps {
  title: string;
  icon: React.ReactNode;
  questions: Array<{
    q: string;
    a: string;
  }>;
}

function FAQSection({ title, icon, questions }: FAQSectionProps) {
  return (
    <section className='bg-white rounded-xl shadow-sm border border-slate-200 p-8'>
      <h2 className='text-2xl font-bold text-slate-900 mb-6 flex items-center'>
        {icon}
        <span className='ml-3'>{title}</span>
      </h2>

      <div className='space-y-4'>
        {questions.map((item, index) => (
          <FAQItem key={index} question={item.q} answer={item.a} />
        ))}
      </div>
    </section>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <details className='group border border-slate-200 rounded-lg overflow-hidden'>
      <summary className='flex items-center justify-between p-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors'>
        <h3 className='font-semibold text-slate-900 pr-4'>{question}</h3>
        <ChevronDown className='h-5 w-5 text-slate-500 group-open:hidden flex-shrink-0' />
        <ChevronUp className='h-5 w-5 text-slate-500 hidden group-open:block flex-shrink-0' />
      </summary>
      <div className='p-4 bg-white border-t border-slate-200'>
        <p className='text-slate-600 leading-relaxed'>{answer}</p>
      </div>
    </details>
  );
}