---
name: Phase task (Copilot)
about: 用於建立 Phase 1-8 的執行任務（指派給 GitHub Copilot agent）
title: 'Phase N: <short description>'
labels: ['copilot-task']
assignees: []
---

## Phase N: <Title>

### Objective

<!-- 一段話說明這個 Phase 要達成什麼。 -->

### References

- Spec: `docs/PROJECT_SPEC.md` sections: <list>
- Test cases: `docs/test-cases.md` sections: <list>
- Checklist: `docs/acceptance-checklist.md` sections: <list>

### Dependencies

- Depends on: #
- Blocks: #

### Acceptance Criteria

<!--
  Copy the full acceptance criteria list from the matching Phase in
  `github-issues-reference.md` (kept in personal notes, not in repo).
  Each item must be checkable.
-->

- [ ]
- [ ]
- [ ]

### Required Tests

<!-- List the TC-XXX-NNN test case IDs that MUST pass. -->

- [ ] TC-
- [ ] TC-

### Deliverables

- Branch: `phase/N-short-name`
- PR title: `Phase N: <title>`
- <other artefacts, e.g. screenshots, coverage report>

### Definition of Done

<!-- Clear, verifiable exit conditions. -->

-
-
-

---

**Note to Copilot agent:** Read `.github/copilot-instructions.md` and the referenced docs before starting. Record any assumptions in `docs/assumptions.md`. Open a comment on this issue with `⚠️ Clarification needed:` if anything is ambiguous — do NOT invent business rules.
