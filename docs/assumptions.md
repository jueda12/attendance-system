# Business Assumptions Log

> **用途：** Copilot agent 在開發過程中遇到規格未明確、但又必須做出決定的業務邏輯時，必須在此處記錄所採用的假設。
>
> **原則：**
> - 不得悄悄做決定 — 任何影響計算結果或使用者體驗的假設都必須登記在此
> - 每個假設標記狀態：`pending-confirmation` / `confirmed` / `rejected`
> - 法律 / 薪酬相關假設必須先 `pending-confirmation`，待法律顧問或業務負責人確認後才可標記 `confirmed`
> - 本檔案內容應在每個 Phase 的 PR 描述中摘要提及

---

## 假設格式

```markdown
### A-NNN: <短標題>

- **Phase / Issue:** Phase X / #N
- **Recorded by:** <agent / user>
- **Date:** YYYY-MM-DD
- **Status:** pending-confirmation / confirmed / rejected
- **Context:** 規格中哪段含糊或缺失？
- **Decision:** 採用什麼做法？
- **Rationale:** 為什麼這樣決定？
- **Alternatives considered:** 還想過哪些方案？
- **Impact if wrong:** 這假設錯了會導致什麼後果？
- **Confirmed by:** <name>（當狀態變為 confirmed 時填入）
```

---

## 假設清單

<!-- 在下方依序新增，不要重新排序舊項目 -->

### A-001: (範例) 工人入職首週起始日非週一的處理

- **Phase / Issue:** Phase 4 / #4
- **Recorded by:** example
- **Date:** 2026-03-04
- **Status:** pending-confirmation
- **Context:** `docs/test-cases.md` TC-CONT-007 指出若工人入職日是週三，該週為 partial week。規格未明確是否計入連續性週數。
- **Decision:** Partial week 不計入 `continuousWeeks` 計算；等到首個完整 Monday-Sunday 週才開始累計。
- **Rationale:** 保守處理，避免高估工人工時使系統誤觸發連續性合約。勞工處相關判例多以完整週為準。
- **Alternatives considered:**
  1. 按比例計入 (放棄：計算複雜、無法律依據)
  2. 將 partial week 視為 0 小時 (放棄：無意義)
- **Impact if wrong:** 若該假設與勞工處實務不符，可能延後工人觸發 468 的時間最多 6 日。
- **Confirmed by:** (待法律顧問確認)

---

<!-- 新假設從此處開始新增 -->
