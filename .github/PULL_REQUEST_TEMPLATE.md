<!--
  PR TEMPLATE — read before submitting.
  Delete sections that do not apply, but do not remove the self-review checklist.
-->

## Summary

<!-- One-paragraph summary of what this PR does and why. -->

Closes #

---

## Changes

<!-- Bullet list of notable changes. Focus on *what* and *why*, not line-by-line diff. -->

-
-
-

---

## Screenshots / Demos

<!-- Required for any UI change. Attach screenshots, GIFs, or short videos. -->
<!-- For API-only changes: paste a sample request/response or curl command. -->

---

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added / updated
- [ ] Integration tests added / updated
- [ ] Manually tested in local dev
- [ ] Verified against specific test cases: `TC-XXX-NNN, TC-YYY-NNN`

### Test output

```
<!-- Paste `npm run test` summary or coverage delta here -->
```

---

## Self-Review Checklist

<!-- Every item must be checked OR have a reason noted. -->

### General
- [ ] Linked to an Issue with `Closes #N` above
- [ ] All acceptance criteria from the Issue are addressed
- [ ] No `console.log`, no `TODO`, no commented-out code
- [ ] No hardcoded secrets, no hardcoded production URLs
- [ ] No new `any` types without inline justification
- [ ] All user-facing strings are **Traditional Chinese (繁體中文)**
- [ ] All code comments, variable names, log messages in **English**
- [ ] Self-reviewed the diff in GitHub UI

### Business logic (if touched)
- [ ] All monetary math uses `Decimal`, never `Number` / `parseFloat`
- [ ] Historical calculations use historical legal parameters (not today's rates)
- [ ] `calculationSnapshot` updated if payroll logic changed
- [ ] Affected `AuditLog` entries verified

### Database
- [ ] Prisma schema change has a corresponding migration file
- [ ] Migration runs cleanly on a fresh DB (`prisma migrate reset`)
- [ ] `@@unique` / `@@index` constraints match the spec
- [ ] Seed script updated if new tables added

### Security
- [ ] No sensitive data in logs (no HKID plain, no passwords, no JWT)
- [ ] Input validated with Zod on both client and server
- [ ] Auth / role check on all new endpoints
- [ ] Rate limit considered for public-ish endpoints

### Documentation
- [ ] Updated `docs/*.md` if behaviour / API / schema changed
- [ ] Recorded assumptions in `docs/assumptions.md` if any
- [ ] Updated `README.md` if setup steps changed

---

## Breaking Changes

<!-- If yes, describe migration path. -->

- [ ] Yes — see migration notes below
- [x] No

---

## Reviewer Notes

<!-- Anything the reviewer should pay extra attention to? Known limitations? -->
