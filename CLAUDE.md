# CLAUDE.md

## 專案核心

本專案是建造業臨時工出勤與薪酬管理系統，採用「總承建商旗下分判商獨立僱主」模型。

## 必讀文件清單（按優先順序）

1. `docs/PROJECT_SPEC.md` — 業務規格、資料模型、API、安全
2. `docs/assumptions.md` — A-001 到 A-011 業務決策記錄
3. `docs/acceptance-checklist.md` — 驗收條件

## 分支策略

- 使用 feature branches 開發。
- 以 squash merge 合併到 `main`。
- 不直接 push 到 `main`。

## 開工前 checklist

- 永遠先執行 `git status`，確認 working tree clean。
- Phase 工作必須從 `main` 拉新 branch。

## Commit message 格式

使用 conventional commits：

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`

## 強制原則

- 業務邏輯以 `docs/PROJECT_SPEC.md` §3 為準，不自行解讀。
- HKID 永遠使用方案 B（masked + hash + encrypted），不得純明文保存。
- 金錢欄位永遠使用 Decimal，不使用 Number。
- 連續性合約與 MPF 60 日按單一 Worker 記錄計算（分判商獨立）。

## Source of truth

`docs/PROJECT_SPEC.md` 與 `docs/assumptions.md` 是 source of truth；如本文件與 docs 衝突，以 docs 為準。
## Collaboration 規則（學自 PR #23 / Phase 2b PR-1）

實作 PR 時遵守以下五條規則。違反任一條視為越界、需在計畫或實作階段被 push back。
### A. Schema / API endpoint discipline

不要在計畫階段或實作階段自行刪除/簡化 schema 欄位或 API endpoint，除非 Issue body 明確列為「移除」。發現現有欄位疑似 obsolete 時，問 owner、不擅自處理。

- Schema column 增加 OK（對齊 spec）
- Schema column 刪除 / 改名 / 改 type 必須 Issue body 明確列出
- API endpoint 增加 OK（Issue 範圍內）
- API endpoint 路徑變更（例 `/foo` → `/bar`）可在計畫階段 propose、但必須在 plan 中明確列出 deviation
- 疑似 obsolete 欄位 / endpoint → 問 owner、不擅自簡化

### B. Implementation scope discipline

不要在 implementation 階段加任何 prompt / Issue 沒列出的 env var、helper、import、middleware、API endpoint、schema column。發現 spec 提到但 Issue 沒列的功能（例如 PROJECT_SPEC 提到 document encryption 而 Issue 沒列），問 owner、不擅自加進實作。

### C. PR description discipline

PR description 必須對齊 Issue body 寫死的驗收 checklist + validation evidence + E2E trace + follow-ups。不准簡化、不准只寫「passed」、不准 Scope notes 替代 Follow-ups。

PR body 結構標準（對照 PR #19 / PR #23 為 reference）：

- Summary（3-5 點 bullet 描述本 PR 做了什麼）
- Issue acceptance checklist（逐項 `[x] / [ ] / N/A` + 一句說明驗證方式）
- Validation evidence（build / test / lint / migrate 的實際輸出，不是只寫「passed」）
- Local E2E API evidence（敏感資料用佔位符如 `<plain redacted>`）
- Audit log SQL output（如有）
- Follow-ups（Issue body 已寫的 follow-up 全部複製進來）
- Scope boundaries（明確列已知不做的範圍）

### D. Spec deviation 必須明確 flag

實作偏離 PROJECT_SPEC 字面（例：mpf reset 只看 joinDate、不看 wageType）時，在 Issue body 已有 follow-up note 的情況下實作 OK，但 PR description 要重複 flag 一次：「本 PR 偏離 spec line N、理由見 follow-up §N」。

不要假設 PR reviewer 記得 Issue body 的 follow-up note。

### E. 不擅自改 Issue body 寫死的命名

API endpoint 路徑、變數命名、欄位命名等 Issue body 寫死的內容，實作對齊 Issue body 為主。

如有 propose 改名（例：`/hkid` → `/reveal-hkid`、`workerNo` → `workerCode`），**計畫階段**就要明確 propose、實作階段不擅自改。

計畫階段 owner 同意過的命名變更實作階段照做 OK；計畫階段沒提的命名變更實作階段擅自改算偏離。
