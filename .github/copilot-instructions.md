# Hong Kong Construction Attendance System — AI Agent Instructions

> **File location:** `.github/copilot-instructions.md` in the repo root.
> GitHub Copilot agent auto-loads this file as context for every task.

---

## Project Context

Building an **HR-internal attendance and payroll system** for a Hong Kong construction company (200–500 workers, multiple sites, multiple subcontractors). Replaces paper sign-in + WhatsApp + manual Excel workflow. Used by 3–10 HR staff only. NOT worker-facing.

---

## Must Read Before Any Task

1. `docs/PROJECT_SPEC.md` — full technical specification (schema, algorithms, APIs)
2. `docs/test-cases.md` — test cases to implement (TC-CONT, TC-MPF, TC-PAY, etc.)
3. `docs/acceptance-checklist.md` — acceptance criteria for each phase
4. `docs/assumptions.md` — record any assumptions you make here

---

## Tech Stack (Non-Negotiable — pinned for Copilot)

**Runtime:** Node.js **22 LTS** (Active LTS until 2027-04-30). Do NOT use Node 20 (EOL 2026-04-30).

**Backend:**
- TypeScript strict mode
- Express 4.x (proven, adequate for low-traffic internal tool)
- Prisma 5.x with SQLite (PostgreSQL-ready via provider swap)
- **Zod v4** (note the unified `error` parameter — NOT `invalid_type_error` / `required_error`; use `.extend()` / shape spread instead of `.merge()`)
- Winston for logging (console + file transports)
- JWT for auth tokens
- **argon2id** for password hashing (NOT bcrypt) — params: `memoryCost: 19456, timeCost: 2, parallelism: 1` (OWASP minimum)
- ExcelJS for spreadsheets
- **Playwright** for PDF generation (NOT Puppeteer) — use `@playwright/test` browser API for headless Chromium PDF
- **decimal.js / Prisma.Decimal** for ALL monetary math (see Critical Rules)
- Vitest for tests
- PM2 for process management

**Frontend:**
- **React 19.2+** with **React Compiler** enabled (automatic memoization)
- Vite 7.x
- TypeScript strict mode
- **TailwindCSS v4** with CSS-first config via `@theme` directive (NOT `tailwind.config.js`)
- shadcn/ui (latest — supports React 19 + Tailwind v4 natively)
- **React Router v7** in **Declarative Mode** — import from `react-router` (NOT `react-router-dom`)
- TanStack Query v5
- **react-hook-form v8+** with `@hookform/resolvers v4+` (Zod v4 compatible)
- TanStack Table
- Recharts
- Axios

Do NOT substitute libraries without opening an RFC issue first.

## React 19 Usage Rules

- **Use:** React Compiler (opt-in via Vite plugin `babel-plugin-react-compiler`), `useActionState`, `useOptimistic`, `useFormStatus`, `use()` for reading Context, ref as prop
- **Do NOT use (out of scope for this SPA):**
  - Server Components / `"use server"` directive
  - Server Actions
  - `use()` for reading Promises — use TanStack Query's `useQuery` instead
  - Document metadata via `<title>` in components (we don't need SEO for internal tool)
- **Memoization:** Let React Compiler handle it. Do NOT add `useMemo` / `useCallback` / `memo` unless profiling shows a specific hot path benefits. Document any manual memoization with an inline comment explaining why.
- **TanStack Query + React 19:** `useQuery` relies on `useEffect` and does not run during hidden-mode pre-renders. This is fine for our SPA (no `<Activity>` usage) but if adopted later, use `queryClient.ensureQueryData` for preloading.

## Forbidden Libraries / Patterns

- `bcrypt` — use argon2id
- `Puppeteer` — use Playwright
- `tailwind.config.js` (JS config) — use `@theme` CSS directive
- `react-router-dom` — it's deprecated in v7, import from `react-router`
- `Number(...)` / `parseFloat(...)` on monetary values — use Decimal
- `.merge()` on Zod schemas — use `.extend()` or shape spread
- `useMemo` / `useCallback` / `memo` without profiling justification
- Simplified Chinese characters in user-facing text

---

## Critical Rules (Breaking These = PR Rejection)

1. **All money uses `Decimal`**, NEVER `Number`. No `parseFloat`, no `+` on monetary values. Use `Prisma.Decimal` or `decimal.js` throughout.
2. **All user-facing text in Traditional Chinese (繁體中文, HK/TW convention).** No simplified Chinese (员工→員工, 报表→報表).
3. **All code comments, variable names, and log messages in English.**
4. **No hardcoded secrets.** All config via `.env`. Refuse to start if `JWT_SECRET` is missing or equals `"changeme"`.
5. **HKID never stored in plain text.** Store `hkidMasked` (e.g. `A123***(7)`) and `hkidHash` (SHA-256 of normalized HKID — this is for lookup/dedup, not a password, so SHA-256 is correct here; user passwords use argon2id).
6. **Soft delete only.** Wage records retained ≥ 7 years. Never physical delete.
7. **All mutations write to `AuditLog`.** No exceptions.
8. **Attendance unique key is `(workerId, siteId, subcontractorId, date)`** — NOT `(workerId, date)`. A worker may legally work for multiple subcontractors on the same day.

---

## Legal Rules (Hong Kong — Must Be Correct)

Full details in `docs/PROJECT_SPEC.md` section "HONG KONG LEGAL REQUIREMENTS". Summary:

- **468 continuous contract rule** (effective 2026-01-18): ≥ 17 hrs/week OR any 4-week rolling ≥ 68 hrs, for 4 consecutive weeks. First 3 weeks of employment must use weekly criterion only.
- **418 rule** (pre-2026-01-18): ≥ 18 hrs/week for 4 consecutive weeks. System must pick correct ruleset by date.
- **MPF Industry Scheme** (casual, < 60 days): versioned `MpfIndustryRate` table, per-day lookup by `effectiveDate` + `dailyWage` bracket. Never overwrite old rates.
- **MPF Master Trust** (regular, ≥ 60 days): 5% with monthly min HK$7,100 / max HK$30,000.
- **60-day threshold**: auto-detect in `MpfService.determineScheme()`, alert HR when a worker crosses it.
- **Minimum wage**: HK$42.10/hr (2025-05-01 onward), stored in `SystemConfig`.

---

## Work Style

1. **Branch per Issue.** Name: `phase/N-short-name` or `feature/description`.
2. **Small commits.** Conventional Commits format (see below).
3. **Tests alongside implementation.** Do not open PR without tests for new business logic.
4. **PR per Issue.** Link with `Closes #N`. Include self-review against the Issue's acceptance criteria.
5. **Never force-push `main`.** Never merge your own PR without human approval.
6. **If requirements are ambiguous**, open a discussion comment on the Issue before coding. Do not guess silently — record assumptions in `docs/assumptions.md`.

---

## Commit Convention

Conventional Commits, scoped by module:

```
feat(continuity): implement 468 rolling window calculation
fix(mpf): correct casual scheme detection at 60-day boundary
test(payroll): add edge cases for holiday wage eligibility
docs(deployment): add Tailscale VPN setup section
refactor(reports): extract Excel styling to shared helper
chore(deps): bump prisma to 5.x
```

Every commit message body should reference the Issue: `Refs #N` or `Closes #N`.

---

## Code Conventions

- **File naming**: kebab-case (`continuity.service.ts`, `worker-detail.tsx`).
- **Test files**: `*.spec.ts` next to source OR in `__tests__/`.
- **Service layer**: one class per file, dependency-injected (constructor params, not globals).
- **Controllers**: thin — validate input with Zod, call service, format response. No business logic.
- **Prisma access**: only inside service layer. Never `prisma` imports in controllers or React.
- **Error handling**: custom `AppError` subclasses with HTTP status codes. Centralized error middleware formats responses.
- **Date/time**: always store UTC in DB, convert to `Asia/Hong_Kong` for display. Use `date-fns-tz` for conversions.
- **No `any`** except with inline `// eslint-disable-next-line` + reason comment.
- **No `console.log`** — use Winston logger injected via DI.

---

## Frontend Conventions

- **Forms**: `react-hook-form` + Zod resolver. Server-side Zod schema must match client.
- **Data fetching**: TanStack Query. No `useEffect` + `fetch` patterns.
- **State**: React Query for server state, `useState`/`useReducer` for local. No Redux.
- **Routing**: React Router v7 (Declarative Mode) with nested routes. Import from `react-router`, not `react-router-dom`. Protected routes via layout component.
- **Styling**: Tailwind utility classes + shadcn/ui components. No inline styles. No CSS modules except for third-party overrides.
- **i18n**: all strings in Traditional Chinese directly. No need for full i18n library in v1.
- **Accessibility**: all interactive elements keyboard-reachable. Labels associated with inputs. Error messages readable by screen reader.

---

## Testing Requirements

- **Unit test coverage ≥ 90%** on `ContinuityService`, `MpfService`, `PayrollService`.
- **Overall backend coverage ≥ 80%.**
- Every test case listed in `docs/test-cases.md` with a `TC-XXX-NNN` identifier must have a corresponding test. Reference the TC ID in the test name:
  ```ts
  it('TC-CONT-003: triggers contract when 4-week rolling hours = 68 exactly', ...)
  ```
- Before marking a PR ready for review, run `npm run test` and `npm run lint` locally. Include test output summary in PR description.

---

## PR Self-Review Checklist

Before requesting review, confirm every item or explicitly note why skipped:

- [ ] Linked Issue with `Closes #N`
- [ ] All acceptance criteria from the Issue addressed
- [ ] Tests added and passing locally
- [ ] No `any`, `console.log`, `TODO` left in code
- [ ] No hardcoded secrets or production URLs
- [ ] Prisma schema changes have a migration file
- [ ] User-facing strings are Traditional Chinese
- [ ] Decimal math verified in tests (no `Number` for money)
- [ ] Updated docs if API or behaviour changed
- [ ] Updated `docs/assumptions.md` if a business rule was assumed
- [ ] Self-reviewed the diff in GitHub UI

---

## When Blocked

If you cannot proceed due to ambiguity or missing information:

1. Do NOT invent business rules.
2. Post a comment on the Issue with `⚠️ Clarification needed:` and specific question.
3. Record a tentative assumption in `docs/assumptions.md` with status `pending-confirmation`.
4. Proceed with the tentative assumption only for non-legal code. For legal/payroll logic, wait for confirmation.

---

## Out of Scope (Do Not Build)

- Worker-facing mobile app
- Clock-in hardware integration
- Subcontractor self-service portal
- Biometric or photo verification logic
- Real-time attendance tracking
- Multi-company / multi-tenant support

If an Issue asks for any of the above, reject with an RFC comment.
