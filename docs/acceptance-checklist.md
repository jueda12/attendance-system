# 交付驗收 Checklist (Acceptance Checklist)

> **使用方式：** 當 GitHub Copilot agent 完成開發後，逐項勾選驗證。任何一項未通過均需退回修改。
>
> **建議做法：** 在 GitHub 開一個 Issue，把此 checklist 貼入作為 body，勾選追蹤。
>
> **驗收角色：** 技術負責人 (Tech Lead) + HR 代表 (Business User) 共同驗收。

---

## 驗收方式說明

每項驗證後填寫：
- ✅ 通過
- ❌ 不通過（附原因與截圖）
- ⏭️ 暫不適用（附原因）

---

## A. 專案結構與代碼品質

### A.1 專案結構

- [ ] 專案根目錄有清楚的 `backend/` 與 `frontend/` 分離
- [ ] `backend/` 遵循模組化目錄結構（modules/workers, modules/attendance 等）
- [ ] `frontend/` 遵循 pages + components 結構
- [ ] 所有開源依賴使用 LTS 或穩定版本（非 alpha/beta）
- [ ] `package.json` 所有 scripts 可正常執行（`npm run dev`, `build`, `test`, `lint`）
- [ ] `.gitignore` 排除 `node_modules`, `dist`, `.env`, `*.db`, `*.log`
- [ ] 專案 README 首頁有 screenshot 或簡短 demo gif

### A.2 代碼品質

- [ ] TypeScript strict mode 啟用，編譯零錯誤（`tsc --noEmit`）
- [ ] ESLint 無 error，warning 少於 10 個（可接受）
- [ ] Prettier 格式化已套用全專案
- [ ] 沒有 `console.log`（全用 Winston logger）
- [ ] 沒有 `any` 型別濫用（除非註釋解釋）
- [ ] 沒有 TODO / FIXME 留在程式碼（或清單化於 `docs/known-issues.md`）
- [ ] 所有金額運算使用 `Decimal`，無 `Number` 金額運算（grep 驗證）
- [ ] 沒有硬編碼的 secrets 或 API key
- [ ] 代碼註釋為英文，UI 文字為繁體中文

### A.3 版本控制

- [ ] Git 歷史乾淨，commit message 清晰（遵循 conventional commits）
- [ ] 每個 Phase 有對應的 tag（如 `phase-1-scaffolding`）
- [ ] Branch 策略清楚（main / dev / feature/*）
- [ ] 無敏感資料被 commit（如 .env、實際工人資料）
- [ ] README 說明如何 checkout、setup、run

---

## B. 資料庫與 ORM

### B.1 Schema 正確性

- [ ] `schema.prisma` 完全符合規格文件的 Schema
- [ ] 所有 `@unique`、`@@unique`、`@@index` 如規格所列
- [ ] `Attendance` 有 `@@unique([workerId, siteId, subcontractorId, date])`
- [ ] `ContinuityLog` 有 `@@unique([workerId, weekEndDate])`
- [ ] `Payroll` 有 `@@unique([workerId, periodStart, periodEnd])`
- [ ] `MpfIndustryRate` 支援版本控制（`effectiveDate` 索引）
- [ ] `User` 的 `passwordHash` 長度足夠儲存 argon2id hash（建議 VARCHAR(255)；argon2id 標準輸出約 96-100 字元）
- [ ] `AuditLog` 的 `oldValue` / `newValue` 可儲存 JSON (TEXT 足夠)

### B.2 Migration

- [ ] `prisma/migrations/` 資料夾存在且包含 init migration
- [ ] `npx prisma migrate deploy` 在乾淨 DB 上成功執行
- [ ] `npx prisma migrate reset` 可重置並重新 seed
- [ ] Schema 改動後能成功產生新 migration（驗證 agent 熟悉流程）

### B.3 Seed 資料

- [ ] `prisma/seed.ts` 存在且可執行
- [ ] 預設管理員帳號建立（`admin` / 臨時密碼）
- [ ] `SystemConfig` 預設值完整（min_wage, mpf_monthly_min, mpf_monthly_max 等）
- [ ] `MpfIndustryRate` 包含至少一版的完整行業計劃費率表
- [ ] `PublicHoliday` 包含 2026 年全部 17 個香港公眾假期
- [ ] 可選：demo 資料（3 家分判商、5 個地盤、20 位工人、1 個月出勤）

### B.4 PostgreSQL 相容性

- [ ] 將 `provider = "sqlite"` 改為 `"postgresql"` 後 schema 仍有效
- [ ] `docs/cloud-migration.md` 記錄 sqlite → postgres 差異與處理方式
- [ ] 未使用 SQLite-only 特性（如 rowid 直接引用）

---

## C. 核心業務邏輯

### C.1 連續性合約 (ContinuityService)

- [ ] `calculateWeekStatus` 方法存在且 idempotent
- [ ] `recalculateRange` 方法支援批量重算
- [ ] `isActive` 方法返回 `{ active, sinceDate, rulesetUsed }`
- [ ] `getTimeline` 方法返回指定區間的 log 清單
- [ ] 2026-01-18 前使用 418 規則（每週 18 小時）
- [ ] 2026-01-18 起使用 468 規則（17 小時或 4 週 68 小時）
- [ ] 入職首 3 週不適用 4 週累計規則
- [ ] 中斷後 `continuousWeeks` 歸零
- [ ] 觸發連續性合約需連續 4 週符合
- [ ] `contractActiveDate` 記錄首次觸發日期
- [ ] 修改歷史出勤會觸發後續週重算
- [ ] **所有 TC-CONT 測試案例通過（1.1 - 1.5）**

### C.2 MPF 行業計劃

- [ ] `calcIndustryScheme` 按日查表計算
- [ ] 使用 `effectiveDate <= targetDate` 取最新版本
- [ ] 日薪 < HK$280 → 僱員免供款
- [ ] 日薪 ≥ HK$1,000 → 雙方各封頂 HK$50
- [ ] 支援週薪/月薪轉換為平均日薪
- [ ] 版本歷史保留，新增不覆寫
- [ ] **所有 TC-MPF-IS 測試案例通過**

### C.3 MPF 一般僱員

- [ ] `calcMasterTrust` 計算 5% 相關入息
- [ ] 月入 < HK$7,100 → 僱員免供
- [ ] 月入 > HK$30,000 → 雙方封頂 HK$1,500
- [ ] 支援 `SystemConfig` 調整上下限（不硬編碼）
- [ ] **所有 TC-MPF-MT 測試案例通過**

### C.4 60 日臨時僱員轉換

- [ ] `determineScheme(workerId, asOfDate)` 自動判斷
- [ ] 受僱滿 60 日自動提示 HR
- [ ] Dashboard / API 有待轉換工人清單
- [ ] 薪酬計算使用對應計劃
- [ ] **所有 TC-60D 測試案例通過**

### C.5 薪酬計算引擎

- [ ] `calculateMonthly` 單人月結
- [ ] `calculateBatch` 批量（按分判商或全部）
- [ ] `approve` 批核後不可重算
- [ ] `recalculate` 僅 draft 狀態可用
- [ ] `calculationSnapshot` 儲存當時法規參數
- [ ] 時薪/日薪/件工三種模式正確
- [ ] OT 係數可配置
- [ ] 法定假期薪酬需連續性合約 + 滿 3 個月
- [ ] 颱風政策從 SystemConfig 讀取
- [ ] 結果 2 位小數，banker's rounding
- [ ] **所有 TC-PAY 測試案例通過**

---

## D. API

### D.1 認證

- [ ] `POST /api/auth/login` 返回 JWT
- [ ] `GET /api/auth/me` 返回當前用戶
- [ ] JWT 有效期 ≤ 8 小時
- [ ] 密碼用 **argon2id**（memoryCost=19456, timeCost=2, parallelism=1；OWASP minimum）
- [ ] 登入失敗 rate limit 生效（5 次/分鐘）
- [ ] JWT secret 非預設值才啟動

### D.2 CRUD 端點

- [ ] Workers CRUD 全部可用
- [ ] Subcontractors CRUD 全部可用
- [ ] Sites CRUD 全部可用
- [ ] Attendance CRUD + batch 可用
- [ ] Payroll calculate + list + approve 可用
- [ ] MPF rates CRUD 可用
- [ ] Users CRUD (admin only) 可用
- [ ] System config CRUD 可用

### D.3 Business 端點

- [ ] `GET /api/continuity/:workerId` 返回 468 狀態
- [ ] `POST /api/continuity/recalculate` 可手動觸發
- [ ] `GET /api/mpf/contributions?year=&month=` 返回供款清單
- [ ] `GET /api/alerts/cert-expiry?within=30` 返回即將到期證件
- [ ] `GET /api/alerts/scheme-change` 返回需轉 MPF 計劃的工人

### D.4 報表端點

- [ ] `POST /api/reports/generate` 支援全部 13 種報表類型
- [ ] `POST /api/reports/preview` 返回首 20 筆 JSON
- [ ] 下載 response 有正確的 Content-Disposition header
- [ ] 大報表支援 streaming 或 async job

### D.5 Audit

- [ ] 所有 POST/PUT/DELETE 寫入 AuditLog
- [ ] `GET /api/audit` 可查詢 (admin only)
- [ ] AuditLog 無法透過 API 修改或刪除

### D.6 OpenAPI / Swagger

- [ ] 專案包含 OpenAPI spec (`docs/api.yaml` 或 `/api/docs` 端點)
- [ ] Spec 包含所有端點、request/response schema、錯誤碼

---

## E. 前端 UI

### E.1 頁面完整性

- [ ] `/login` 登入頁，有錯誤提示與載入狀態
- [ ] `/` Dashboard 顯示 KPI、證件到期警示、待處理薪酬
- [ ] `/workers` 工人列表，支援搜尋/篩選/分頁
- [ ] `/workers/:id` 工人詳情，含 tab: 基本資料 / 出勤 / 連續性 / 薪酬
- [ ] `/workers/new`, `/workers/:id/edit` 新增與編輯
- [ ] `/subcontractors` 分判商列表、詳情、編輯
- [ ] `/sites` 地盤列表、詳情、編輯
- [ ] `/attendance/entry` 批量錄入介面
- [ ] `/attendance` 按日期查詢
- [ ] `/payroll/calculate` 月結介面
- [ ] `/payroll` 薪酬列表
- [ ] `/payroll/:id` 薪酬詳情 + 批核按鈕
- [ ] `/reports` 報表中心（自訂日期 + 多篩選）
- [ ] `/mpf` MPF 供款清單
- [ ] `/settings/config` 系統配置
- [ ] `/settings/mpf-rates` MPF 費率版本管理
- [ ] `/settings/users` 用戶管理 (admin)
- [ ] `/settings/audit` 審計日誌 (admin)

### E.2 UX 要求

- [ ] 所有介面文字為**繁體中文**
- [ ] 所有表單有客戶端驗證 + 錯誤提示
- [ ] Loading 狀態顯示（skeleton 或 spinner）
- [ ] Empty state 有友善說明（而非空白）
- [ ] Error boundary 捕捉 React 錯誤，不白屏
- [ ] 成功操作有 toast 通知
- [ ] 危險操作（刪除、批核）有確認對話框
- [ ] 響應式設計，平板可用
- [ ] 快捷鍵：Ctrl+S 儲存、Esc 關閉 modal (可選)

### E.3 報表中心 UI

- [ ] 報表類型下拉選單列出全部 13 種
- [ ] 日期選擇器支援區間選擇
- [ ] 快選按鈕：本週 / 本月 / 上月 / 本季 / 本年
- [ ] 地盤、分判商、工人多選 + 搜尋
- [ ] Excel / PDF 格式切換
- [ ] 預覽按鈕顯示首 20 筆
- [ ] 下載按鈕觸發檔案下載
- [ ] 大報表顯示進度

### E.4 可訪問性

- [ ] 所有互動元素可用鍵盤操作
- [ ] 表單 label 與 input 關聯
- [ ] 錯誤訊息可被 screen reader 讀取
- [ ] 對比度符合 WCAG AA

---

## F. 報表輸出

### F.1 Excel

- [ ] 首行 bold + 深藍底 + 白字
- [ ] 首行 freeze
- [ ] 自動套用 filter
- [ ] 貨幣欄位格式 `#,##0.00`
- [ ] 合計列使用公式（非靜態）
- [ ] 多分判商報表每家一個 sheet
- [ ] 繁體中文字符正確顯示
- [ ] 檔名包含報表類型 + 日期區間（如 `出勤明細_20260401-20260430.xlsx`）

### F.2 PDF

- [ ] 繁體中文正確顯示（使用嵌入式字型）
- [ ] 字型檔案 bundle 在專案內
- [ ] A4 大小，合適的 margin
- [ ] 頁首有公司名稱（從 SystemConfig 讀取）
- [ ] 頁尾有頁碼 + 生成時間
- [ ] 表格不被切分到兩頁中斷（盡量）
- [ ] 工傷 14 日報告格式符合勞工處慣例

### F.3 13 種報表實作驗證

逐項生成並檢查輸出：

- [ ] 出勤明細表 (attendance_detail)
- [ ] 工時彙總表 (hours_summary)
- [ ] 分判商對賬單 (subcontractor_statement)
- [ ] 薪酬計算單 (payroll_calculation)
- [ ] 個人工資單 (payslip_individual)
- [ ] MPF 供款清單 (mpf_contribution_list)
- [ ] 勞工處工時紀錄 (labour_dept_hours)
- [ ] CIC 稽查報告 (cic_audit)
- [ ] 工傷前 14 日紀錄 (injury_14days)
- [ ] 468 連續性合約清單 (continuity_status)
- [ ] 平安卡/CWRA 到期清單 (cert_expiry)
- [ ] 出勤率分析 (attendance_rate)
- [ ] 加班統計 (overtime_summary)

---

## G. 測試

### G.1 單元測試

- [ ] `continuity.service.spec.ts` 覆蓋所有 TC-CONT 案例
- [ ] `mpf.service.spec.ts` 覆蓋所有 TC-MPF 案例
- [ ] `payroll.service.spec.ts` 覆蓋所有 TC-PAY 案例
- [ ] Decimal 精度測試（TC-DEC）全部通過
- [ ] 日期處理測試（TC-DATE）全部通過

### G.2 整合測試

- [ ] API 認證測試通過（TC-API-AUTH）
- [ ] CRUD 端點測試通過（TC-API-CRUD）
- [ ] Audit 測試通過（TC-API-AUDIT）
- [ ] 多分判商測試通過（TC-MULTI）

### G.3 性能測試

- [ ] 300 工人月結 < 30 秒（TC-PAY-011）
- [ ] 10 萬筆出勤查詢 < 1 秒（TC-PERF-001）
- [ ] 連續 100 次報表生成無記憶體洩漏（TC-PERF-003）

### G.4 覆蓋率

- [ ] 業務邏輯服務覆蓋率 ≥ 90%
- [ ] 整體後端覆蓋率 ≥ 80%
- [ ] 覆蓋率報告可在 CI 查看

### G.5 CI/CD

- [ ] GitHub Actions workflow 設定完成
- [ ] 每次 PR 自動跑 lint + test
- [ ] PR merge 到 main 自動更新 staging（可選）

---

## H. 安全性

### H.1 認證授權

- [ ] JWT 有 expiry
- [ ] Refresh token 機制（選配）
- [ ] Password hash 使用 **argon2id**（OWASP 推薦；參數達 OWASP minimum）
- [ ] Role-based access control 正常運作
- [ ] Viewer 角色無法 mutate
- [ ] 權限檢查在 middleware 統一實現

### H.2 資料保護

- [ ] HKID 以遮罩 + hash 儲存，無明文
- [ ] DB 檔案權限 chmod 600（Linux）
- [ ] 敏感欄位（如銀行戶口）加密
- [ ] API 回應不洩漏過多資訊（如不回傳 hash）

### H.3 注入與漏洞

- [ ] SQL injection 測試通過（Prisma 原生防護）
- [ ] XSS 測試通過（React 預設 escape）
- [ ] CSRF 保護（JWT in header 天然免疫，或 CSRF token）
- [ ] helmet middleware 啟用
- [ ] CORS 白名單配置正確

### H.4 HTTP 安全

- [ ] 生產環境強制 HTTPS
- [ ] HSTS header 設定
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY

### H.5 依賴套件

- [ ] `npm audit` 無 high / critical 漏洞
- [ ] Dependabot 設定啟用

---

## I. 部署文件

### I.1 deployment.md 完整性

- [ ] 部署前準備章節（硬件、OS、網絡、埠口）
- [ ] 伺服器初始設定（Node.js, Git, PM2, Nginx）
- [ ] 應用程式部署步驟（clone, env, deps, migrate, seed, build, start）
- [ ] Nginx 反向代理設定 + 自簽 HTTPS
- [ ] VPN 存取設定（Tailscale 步驟）
- [ ] 首次登入與初始設定
- [ ] 自動備份設定（cron + 腳本）
- [ ] 日常維運（logs, restart, 監控）
- [ ] 故障排除常見問題
- [ ] 資料還原流程
- [ ] 升雲指引（SQLite → PostgreSQL）
- [ ] 安全建議清單

### I.2 部署教學可執行性

- [ ] 在乾淨 Ubuntu 22.04 VM 依 doc 步驟 100% 可完成部署
- [ ] 在 Windows Server 依 doc 步驟 100% 可完成部署（若支援）
- [ ] 所有指令可複製貼上執行（避免 typo）
- [ ] 截圖或 code block 清晰
- [ ] 版本號鎖定（如 Node.js 22.x LTS；不可使用 Node 20，已 EOL 2026-04-30）

### I.3 部署腳本

- [ ] `scripts/install.sh` (Linux) 自動化初始安裝
- [ ] `scripts/install.ps1` (Windows) 自動化初始安裝
- [ ] `scripts/backup.sh` 每日備份腳本
- [ ] `scripts/restore.sh` 還原腳本
- [ ] `ecosystem.config.js` PM2 配置
- [ ] `nginx/attendance.conf` Nginx 配置範本

---

## J. 使用者文件

### J.1 User Manual (繁體中文)

- [ ] `docs/user-manual.md` 存在
- [ ] 涵蓋 HR 所有日常工作流程
- [ ] 每個頁面有截圖（或描述）
- [ ] 常見操作 step-by-step
- [ ] 常見錯誤處理

### J.2 開發者文件

- [ ] `docs/architecture.md` 系統架構
- [ ] `docs/api.md` API 參考
- [ ] `docs/legal-rules.md` 法規實現方式（供法律顧問審閱）
- [ ] `docs/assumptions.md` agent 所做的業務假設
- [ ] `docs/known-issues.md` 已知問題或限制

### J.3 README

- [ ] 專案簡介
- [ ] Tech stack
- [ ] Quick start（local dev）
- [ ] Deployment 連結
- [ ] Contributing guide（如適用）
- [ ] License

---

## K. 業務驗收（HR 代表）

### K.1 核心流程跑通

- [ ] HR 能成功登入
- [ ] HR 能新增 / 編輯 / 查詢工人
- [ ] HR 能批量錄入一天的出勤
- [ ] HR 能查看工人的 468 連續性狀態
- [ ] HR 能執行月結薪酬計算
- [ ] HR 能生成並下載 Excel 出勤明細
- [ ] HR 能生成並下載 PDF 個人工資單
- [ ] HR 能生成自訂日期範圍的分判商對賬單
- [ ] HR 能查看證件到期清單

### K.2 歷史資料回跑驗證

- [ ] 輸入過去 6 個月真實出勤資料
- [ ] 系統計算的 468 狀態與人工對照一致
- [ ] 系統計算的 MPF 供款與實際繳納一致
- [ ] 系統計算的薪酬與人工計算差異 ≤ HK$1（四捨五入）

### K.3 合規性審查

- [ ] 勞工處工時紀錄格式經法律顧問 / 資深 HR 審閱通過
- [ ] CIC 稽查報告格式經 QS / 安全主任審閱通過
- [ ] 468 計算邏輯經法律顧問審閱通過
- [ ] MPF 計算邏輯經會計師審閱通過

---

## L. 上線前最後檢查

### L.1 安全基線

- [ ] 預設管理員密碼已變更
- [ ] 所有 HR 帳號已建立並測試登入
- [ ] `.env` 生產檔案權限 600
- [ ] 備份任務已排程並首次成功執行
- [ ] 還原流程已演練
- [ ] VPN 連線已全部 HR 驗證可用

### L.2 資料遷移

- [ ] 所有現有工人主檔已匯入
- [ ] 所有分判商主檔已匯入
- [ ] 所有地盤主檔已匯入
- [ ] 至少 3 個月歷史出勤已匯入（用於 468 初始化）
- [ ] MPF 費率表已輸入當前版本

### L.3 培訓

- [ ] HR 團隊已完成系統培訓
- [ ] 培訓紀錄與簽到已存檔
- [ ] SOP 文件分發給所有相關人員
- [ ] 聯絡支援窗口已建立

### L.4 雙軌並行期

- [ ] 第 1 個糧期雙軌：新系統計算 + 人工核對
- [ ] 差異分析報告提交
- [ ] 第 2 個糧期雙軌：差異 = 0 才進入單軌
- [ ] 管理層批准切換
- [ ] 舊 Excel / WhatsApp 流程正式停用

---

## 驗收簽署

| 驗收角色 | 姓名 | 簽署日期 | 意見 |
|---------|------|---------|------|
| 技術負責人 | | | |
| HR 主管 | | | |
| 管理層代表 | | | |
| 法律顧問 (選擇性) | | | |
| 會計師 (選擇性) | | | |

---

## 驗收結果總結

- 總項目數：_____
- 通過項目數：_____
- 不通過項目數：_____
- 不適用項目數：_____
- **整體通過率：_____%**

通過標準：**A-H 類（技術）100%，I-K 類（文件+業務）≥ 95%，L 類（上線準備）100%**

### 未通過項目清單

| 項目編號 | 未通過原因 | 修復計劃 | 負責人 | 預計完成日 |
|---------|-----------|---------|-------|----------|
| | | | | |

---

**備註：** 本 checklist 應在 agent 交付後立即使用。若 agent 聲稱完成但某項未達標，退回並附上具體失敗案例。建議先跑 A-C（技術底層），再跑 D-F（功能），再跑 G（測試），最後 H-L（交付準備）。
