# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is an email quality control automation system built with Next.js 15, TypeScript, and Prisma. The main application is located in the `email-qc/` directory.

### Key Architecture Components

- **Next.js 15 App Router**: Uses TypeScript and Tailwind CSS with Turbopack for development
- **Prisma ORM**: PostgreSQL database with schema in `email-qc/prisma/schema.prisma`
- **OpenAI Integration**: GPT-4.1 Responses API for email content validation
- **Braze Integration**: Fetches email preview HTML from Braze shareable URLs
- **Rule Engine**: Configurable risk, keyword, disclaimer, and link validation rules

### Core Models

- **QcRun**: Main quality control job with Braze URL, copy document, and metadata
- **CheckResult**: Individual validation results (GPT evaluation, rule checks)
- **LinkCheck**: Link validation results with status codes and redirects
- **DisclaimerRule**: Entity/silo-specific disclaimer requirements
- **RiskRule**: Entity-specific risk warnings and regulatory text
- **KeywordRule**: Required text for specific keywords
- **LinkRule**: URL pattern matching for allowed/restricted links

## Development Commands

All commands should be run from the `email-qc/` directory:

```bash
# Development
npm run dev              # Start Next.js dev server with Turbopack
npm run build           # Build for production with Turbopack
npm run start           # Start production server
npm run lint            # Run ESLint
npm run test            # Run Jest tests (in sequential execution)

# Database
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run database migrations
npx prisma migrate deploy  # Deploy migrations to production
npx prisma db seed      # Seed baseline disclaimer data
```

## Testing

- Jest configuration in `jest.config.cjs` with Node environment
- Tests located in `src/__tests__/` directory
- Uses ts-jest for TypeScript compilation
- Path aliases configured (`@/` maps to `src/`)

## API Architecture

### Main Endpoints

- `POST /api/qc-runs`: Create and execute QC jobs (rate-limited)
- `GET /api/qc-runs`: List QC runs with filtering
- `GET /api/qc-runs/[id]`: Retrieve specific run details
- `GET /api/qc-runs/[id]/export.csv`: CSV export functionality
- `GET /api/qc-runs/[id]/export.pdf`: PDF generation
- `POST /api/rules/import`: CSV import for rule tables
- `GET|POST|PUT /api/disclaimers`: Disclaimer management

### Core Processing Flow

1. **Braze Preview Fetch**: Downloads HTML from allowed Braze preview hosts
2. **Content Parsing**: Extracts subject, preheader, body using Cheerio
3. **GPT Validation**: Validates content against rules using structured JSON schema
4. **Link Checking**: Concurrent validation of all links (6 concurrent max)
5. **Rule Evaluation**: Applies risk, keyword, disclaimer, and additional rules
6. **Report Generation**: Creates CSV/PDF exports with results

## Key Libraries

- **OpenAI**: GPT-4.1 Responses API for content validation
- **Cheerio**: HTML parsing and content extraction
- **Axios**: HTTP requests with error handling
- **p-limit**: Concurrency control for link checking
- **mammoth**: DOCX to text conversion client-side
- **html2canvas + jspdf**: Client-side PDF generation
- **json2csv**: CSV export functionality

## Environment Configuration

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key with GPT-4.1 access
- `ALLOWED_PREVIEW_HOSTS`: Comma-separated allowed Braze preview hosts
- `APPROVED_LINK_DOMAINS`: Comma-separated approved link domains

## Database Schema Notes

- All rule tables support entity/silo filtering
- Disclaimer rules managed via admin UI, other rules via CSV import
- Link checks store full redirect chains and status codes
- QC runs support marketing email type by default