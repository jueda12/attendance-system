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

### A-002: 2026 PublicHoliday seed date list source

- **Phase / Issue:** Phase 1 / #1
- **Recorded by:** copilot
- **Date:** 2026-04-22
- **Status:** pending-confirmation
- **Context:** Issue #1 requires seeding all 17 Hong Kong public holidays for 2026, but the repository does not include an explicit canonical date list in machine-readable format.
- **Decision:** Seeded 17 entries in `backend/prisma/seed.ts` using the HKSAR Government public holiday calendar for 2026 (including observed days) for scaffolding verification.
- **Rationale:** This unblocks Phase 1 scaffolding and allows deterministic integration tests for holiday table presence without blocking backend bootstrap.
- **Alternatives considered:**
  1. Skip holiday seed (rejected: would fail acceptance criteria)
  2. Seed fewer placeholder rows (rejected: violates requirement for all 17 days)
- **Impact if wrong:** Incorrect statutory/observed dates could affect downstream payroll/holiday calculations until corrected.
- **Confirmed by:** (待確認)

---

### A-003: A-002 修正（17 天 → 15 天法定假日）

- **Phase / Issue:** Phase 1 (post-merge hotfix) / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed（已 merge 到 main）
- **Context:** A-002 誤將「公眾假日 17 天」當作「法定假日」seed。香港建造業工人只享**法定假日 15 天**（2026 年），不是公眾假日 17 天。
- **Decision:** 修正為 15 天，名稱與日期依勞工處官方 https://www.labour.gov.hk/tc/news/latest_holidays2026.htm；冬節（2026-12-22）與聖誕節（2026-12-25）由 `SystemConfig.winter_holiday_choice` 二擇一 seed。
- **Rationale:** 法律正確性；建造業慣例；`PublicHoliday.isStatutory=true` 保留但全 seed true。
- **Confirmed by:** 業主 2026-04-22

---

### A-004: 業務模型 — 分判商為獨立僱主（非總承建商內部分派）

- **Phase / Issue:** Phase 2 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 原 PROJECT_SPEC §3.1.8 假設「整個建造公司為同一僱主，分判商是內部分派」，並要求跨分判商合併計算連續性與 MPF。業主實際業務結構為：公司為**總承建商**，旗下分判商為**獨立法人**（獨立 BR、獨立 MPF 僱主登記），工人的法律僱主是分判商。
- **Decision:** 徹底改寫 §3.1.8 為「分判商獨立僱主模型」：
  1. 每筆 Worker 記錄 = 一段「工人 × 分判商」的僱傭關係
  2. 工人跨分判商 = 新 Worker 記錄（不繼承歷史）
  3. 連續性合約、MPF 60 日門檻、法定權益受僱時長等**按分判商獨立計算**，不跨分判商合併
  4. HR 系統只有一個（總承建商的 HR 代管所有分判商工人資料），但系統記錄法律上仍歸屬單一分判商
  5. 工人一次只為一個分判商工作（常態），同一天跨分判商僅少數情境允許
- **Rationale:** 法律正確；反映真實業務結構；避免因錯誤合併計算導致 MPF / 468 合規爭議。
- **Alternatives considered:**
  1. 保留同一僱主假設 + 多租戶隔離（rejected：系統只服務總承建商單一 HR team，多租戶過度設計）
  2. `WorkerSubcontractorAssignment` 表多對多關係（rejected：業主確認工人基本上序列式服務單一分判商，複雜度不值得）
- **Impact if wrong:** 若實際上分判商是同一僱主 → 系統會低估連續性週數與 MPF 門檻，工人權益受損。但業主 2026-04-22 已明確確認分判商獨立。
- **Confirmed by:** 業主 2026-04-22

---

### A-005: 同日跨分判商工作 — 允許但時段不可重疊

- **Phase / Issue:** Phase 3 Attendance 前置決定
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 業主確認「工人基本上一次只為一個分判商工作」，但承認少數情境可能同日跨分判商（上午 A、下午 B）。
- **Decision:** 保留 Phase 1 的 `Attendance @@unique([workerId, siteId, subcontractorId, date])` 四欄設計。Attendance service 於新增/修改時額外做 **application-level 時段重疊檢查**（`[clockIn, clockOut)` 半開區間）。只記 `workHours` 不記 `clockIn/clockOut` 的簡化錄入模式，系統信任 HR 自行確認無實際衝突。
- **Rationale:** 最大彈性；反映實際業務；衝突時有明確錯誤訊息（`ATTENDANCE_TIME_OVERLAP`）
- **Impact if wrong:** 若擋太嚴 HR 無法錄入真實情境；若太鬆可能出現同工同時雙薪資。
- **Confirmed by:** 業主 2026-04-22

---

### A-006: HKID 儲存方案 B（明文加密 + hash 查重）

- **Phase / Issue:** Phase 2 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 業主考量「HKID 要經常用」與「server 負荷」，最初傾向明文儲存。經 claude 澄清 AES-256-GCM 加解密開銷微秒級（對整體效能無感），且 hash 與加密並存不衝突「經常用」的需求，最終決定方案 B。
- **Decision:**
  1. `hkidMasked`（`"A123***(7)"`）— 列表預設顯示
  2. `hkidHash`（SHA-256 of normalized）— app-level 查重，不 @unique，範圍限於 `subcontractorId + status='active'`
  3. `hkidEncrypted`（AES-256-GCM，格式 `v1:iv:ct:authTag`）— 需顯示原 HKID 時解密，admin/hr 可，viewer 不可
- **Rationale:** PDPO 合規；防外洩；查重功能保留；admin/hr 實務操作不受影響。
- **Alternatives considered:**
  1. 純明文（rejected：PDPO 違規風險 + 罰款上限 HK$100 萬 + 資料外洩個案風險）
  2. 只 hash 不加密（rejected：報表與申報需顯示原 HKID）
  3. 只加密不 hash（rejected：無法查重）
- **Impact if wrong:** 金鑰遺失 + 備份遺失 → HKID 原值永遠無法解密；但 hash 欄位仍可查重，系統核心功能不受影響。
- **Confirmed by:** 業主 2026-04-22

---

### A-007: MPF 計劃判定 — 改為讀 Worker.mpfScheme 欄位（非動態判定）

- **Phase / Issue:** Phase 4 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 業主指出「建造業工人絕大多數長期維持臨時僱員身份走行業計劃，即使累計受僱超過 60 日也是如此」。法律上臨時/一般僱員判定不只看 60 日，還看僱傭本質（按日計酬、連續性合約等），只有 HR 能做此判斷。
- **Decision:**
  1. `Worker.mpfScheme` 預設 `"industry"`
  2. 薪酬計算與 MPF 服務**完全讀取此欄位**，不動態判定
  3. 60 日達到只是**提醒 HR 檢視**，不自動轉計劃
  4. HR 檢視後記錄決定（`mpf60DayReviewed`、`mpf60DayDecision`）
  5. 跨分判商跳槽 = 新 Worker 記錄、從 0 重新起算、重新檢視
- **Rationale:** 法律正確；反映實務；避免薪酬邏輯靜悄悄改變引發工人爭議；審計可追溯
- **Alternatives considered:**
  1. 動態判定（rejected：不符合法律複雜度、薪酬不穩定、HR 無掌控權）
  2. 完全靜態（rejected：可能導致 HR 忘記檢視）
- **Confirmed by:** 業主 2026-04-22

---

### A-008: 離職重聘 — 一律新建 Worker 記錄（不繼承）

- **Phase / Issue:** Phase 2 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 舊 PROJECT_SPEC 有 `rehire_continuity_days`（預設 180 日內重聘視為延續）。業主確認分判商獨立僱主模型後，此設定邏輯不成立。
- **Decision:** **所有**離職重聘（不論跨分判商或同分判商）一律新建 Worker 記錄，舊記錄保留為 `status='resigned'`。連續性、MPF 60 日、法定權益全部從 0 重新起算。`rehire_continuity_days` SystemConfig 廢除。
- **Rationale:** 統一邏輯，容易理解；符合「每段僱傭關係獨立」的法律觀；歷史保留完整。
- **Impact if wrong:** 若實際應繼承，工人某些權益門檻會被低估，但相關權益會在 60 日、3 個月等關鍵門檻下次達到時補發生效。
- **Confirmed by:** 業主 2026-04-22

---

### A-009: 工號（workerCode）混合編碼

- **Phase / Issue:** Phase 2 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 業主需要工號既可表達工種分類（如 C001 木工、T001 搭棚），又不想每個新增都手動輸入。
- **Decision:** 混合模式 — HR 可手動輸入 `^[A-Z0-9-]{2,10}$`，留空系統自動編 `W0001+` 遞增（跳過已用）。全系統唯一。
- **Rationale:** 兼顧彈性與便利；不依賴資料庫 PK 給外部使用。
- **Confirmed by:** 業主 2026-04-22

---

### A-010: 證件管理 — 6 項證件類型（Phase 2.5）

- **Phase / Issue:** Phase 2.5 前置決定 / n/a
- **Recorded by:** human + claude
- **Date:** 2026-04-22
- **Status:** confirmed
- **Context:** 建造業工人證件項目繁多，業主確認管理範圍。
- **Decision:** 6 項證件 — HKID 影本、平安咭、銀行戶口簿、地址證明、僱傭合約影本、專業能力證件。
  - **不納入**：MPF 開戶文件（只記 trustee/帳號文字欄位）、健康申報/體檢報告（工人自行保管）
  - 本地 filesystem 儲存（`./storage/worker-documents/`）
  - AES-256-GCM at-rest 加密（獨立金鑰 `DOCUMENT_ENCRYPTION_KEY`）
  - admin/hr 可查看下載，viewer 不可
  - 離職後保留 7 年
- **Rationale:** 常用項目；避免過度設計；7 年保留符合 MPF 與稅務要求
- **Confirmed by:** 業主 2026-04-22

---

### A-011: 加密金鑰備份 — passphrase-wrapped backup 方案

- **Phase / Issue:** Phase 7 前置決定（Phase 2 起 schema 相容）
- **Recorded by:** claude（業主授權 claude 決定）
- **Date:** 2026-04-22
- **Status:** pending-confirmation
- **Context:** HKID 與證件加密金鑰若遺失 → 資料永遠無法解密。必須有備份方案。業主表示對加密領域不熟，請 claude 決定。
- **Decision:**
  1. 三把主金鑰（HKID / DOCUMENT / ENCRYPTION）各自放 `.env`
  2. 每把金鑰用 admin 自設 passphrase 透過 PBKDF2-SHA256 (200,000 迭代) 衍生 KEK → 加密主金鑰 → 產生 `keys-backup-{version}-{date}.enc`
  3. 備份檔放與生產伺服器**不同位置**（admin 離線硬碟 / 保險箱 / 密碼管理器）
  4. passphrase 與備份檔**分開保管**
  5. 提供 `npm run keys:backup` 與 `npm run keys:recover` CLI 工具（Phase 7 實作）
  6. 金鑰版本前綴 `v1` 已在 schema 設計進去為 key rotation 鋪路
- **Rationale:** 單機部署合理方案；符合 OWASP 建議；不過度複雜到引入 KMS
- **Alternatives considered:**
  1. AWS KMS / Azure Key Vault（deferred：v1 單機部署不需要；上雲時再議）
  2. HSM（rejected：硬體成本過高）
  3. 不備份（rejected：風險過大）
- **Impact if wrong:** 備份方案不當 → 金鑰遺失 + 備份失效 → 資料永遠無法解密。業主於部署時**必須實際演練恢復流程**確認可用。
- **Risk acceptance by owner:** 業主接受「備份 + passphrase 任一遺失即資料無法解密」的風險，同意部署時進行恢復演練。
- **Confirmed by:** (待 Phase 7 實作前業主再確認細節)
