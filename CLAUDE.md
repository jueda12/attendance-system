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
