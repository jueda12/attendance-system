# Project Specification — Hong Kong Construction Attendance System

> **文件用途：** 本檔案為 AI coding agent（GitHub Copilot 等）與人類開發者的**唯一真相來源 (Single Source of Truth)**。所有 Phase Issues、acceptance checklist 與 test cases 都引用本文件。
>
> **更新原則：** 任何偏離本規格的設計決定，必須先開 RFC Issue 取得人類負責人批准，並同步更新本文件。
>
> **法規警示：** 本文件中「§3 香港法規要求」雖參考官方公開資料撰寫，**最終實施前必須交法律顧問與會計師審閱**，特別是 468 條例、MPF 計算、最低工資三段。任何差異以勞工處與積金局官方公告為準。
>
> **版本：** v1.0-draft · 最後更新 2026-04-21

---

## 目錄

1. [Project Overview · 專案概覽](#1-project-overview)
2. [Technical Stack · 技術棧](#2-technical-stack)
3. [Hong Kong Legal Requirements · 香港法規要求](#3-hong-kong-legal-requirements)
4. [Complete Database Schema · 完整資料庫結構](#4-complete-database-schema)
5. [Core Business Logic · 核心業務邏輯](#5-core-business-logic)
6. [API Endpoints · API 端點](#6-api-endpoints)
7. [Frontend Pages · 前端頁面](#7-frontend-pages)
8. [Report Service · 報表服務](#8-report-service)
9. [Security Requirements · 安全要求](#9-security-requirements)
10. [Deployment Requirements · 部署要求](#10-deployment-requirements)
11. [Execution Plan · 執行計劃](#11-execution-plan)
12. [Deliverables · 交付物](#12-deliverables)

---

## 1. Project Overview

### 1.1 業務背景

香港建造業公司的 HR 目前使用「紙本簽到 + WhatsApp 相片上傳 + 人手 Excel 月結」流程管理 200–500 名工人的出勤與薪酬。每月結算需時 3–7 日，錯誤率高，且無法有效追蹤 468 連續性合約、MPF 行業計劃轉換、證件到期等合規要求。

本系統**取代**上述流程，提供 HR 內部使用的 Web 介面，涵蓋：主檔管理、出勤錄入、連續性合約自動判定、MPF 供款自動計算、薪酬月結、13 種 Excel/PDF 報表、證件與計劃轉換提示、完整審計日誌。

### 1.2 目標使用者

- **內部 HR 團隊**：3–10 人，角色分為 `admin` / `hr` / `viewer`
- **不**提供工人端介面、分判商自助門戶、打卡硬件整合

### 1.3 規模假設

| 維度 | 數量 |
|------|------|
| 工人總數 | 200–500 |
| 同時活躍分判商 | 10–30 |
| 同時活躍地盤 | 5–20 |
| 每月出勤紀錄 | 約 5,000–12,000 筆 |
| 併發使用者 | ≤ 10（HR 團隊）|
| 單一糧期薪酬計算 | 300 人 < 30 秒 |

### 1.4 核心設計原則

1. **合規優先**：任何功能設計必須通過香港《僱傭條例》《強積金計劃條例》《最低工資條例》的檢驗
2. **歷史正確性**：歷史糧期計算必須使用該時點的法規參數（最低工資、MPF 費率、連續性合約規則），不可套用今日參數
3. **計算留痕**：每張薪酬單儲存 `calculationSnapshot` JSON，記錄當時所有法規參數
4. **軟刪除 + 7 年保留**：工資紀錄必須保留至少 7 年，所有刪除為軟刪除
5. **審計全覆蓋**：所有 mutation 寫入 `AuditLog`，審計日誌不可修改或刪除
6. **內部先行、升雲可行**：v1 部署於公司內部伺服器 + Tailscale VPN；Schema 設計可直接遷移至 PostgreSQL

### 1.5 非功能性要求

| 類別 | 要求 |
|------|------|
| 性能 | 10 萬筆出勤紀錄查詢 < 1 秒；300 人月結 < 30 秒;10,000 筆 Excel 生成 < 60 秒 |
| 可用性 | 工作時間 99%；可接受夜間維護視窗 |
| 資料保留 | 工資紀錄 ≥ 7 年；審計日誌 ≥ 7 年 |
| 備份 | 每日自動備份，保留 30 日；半年一次離線備份 |
| 安全 | OWASP Top 10 防護；HKID 永不明文；密碼 argon2id；審計全覆蓋 |
| 無障礙 | WCAG AA |
| 瀏覽器 | Chrome 最新兩版、Edge 最新兩版（內部統一部署的瀏覽器）|

### 1.6 明確不支援（Out of Scope for v1）

- 工人端 App、自助查薪、電子簽名
- 打卡機、指紋機、面部辨識等硬件整合
- 分判商自助門戶
- 即時 / GPS 出勤追蹤
- 自動排更
- 薪酬直接過數至銀行（只產出資料供銀行系統使用）
- 多公司 / 多租戶
- 工會集體合約的特殊規則
- 繁簡切換 / 多語系

---

## 2. Technical Stack

### 2.1 Runtime

- **Node.js 22 LTS**（Active LTS 至 2027-04-30）
  - **不可使用 Node.js 20**（已於 2026-04-30 EOL）
  - 版本鎖定於 `package.json` 的 `engines.node`

### 2.2 Backend

| 項目 | 選型 | 版本 | 備註 |
|------|------|------|------|
| Language | TypeScript | ≥ 5.5 | strict mode；無 implicit any |
| HTTP framework | Express | 4.x | 低流量內部工具，Express 足夠 |
| ORM | Prisma | 5.x | `provider = "sqlite"`，PostgreSQL-ready |
| Validation | **Zod v4** | ≥ 4.0 | 注意：v4 使用 `error` 參數取代 `invalid_type_error` / `required_error`；使用 `.extend()` 取代 `.merge()` |
| Logging | Winston | 3.x | console + file transports |
| Auth token | JSON Web Token | — | HS256；8 小時到期 |
| Password hashing | **argon2** | latest | argon2id 模式；OWASP minimum 參數 |
| Excel | ExcelJS | 4.x | — |
| PDF | **Playwright** | 1.x | 使用 headless Chromium；**不用 Puppeteer** |
| Decimal | decimal.js + Prisma.Decimal | — | 全部金額運算 |
| Test | Vitest | 1.x | — |
| Process | PM2 | latest | 生產部署 |

### 2.3 Frontend

| 項目 | 選型 | 版本 | 備註 |
|------|------|------|------|
| UI library | **React 19.2+** | ≥ 19.2 | 啟用 React Compiler |
| Build | Vite | 7.x | — |
| Language | TypeScript | ≥ 5.5 | strict |
| Styling | **TailwindCSS v4** | ≥ 4.0 | CSS-first `@theme` 設定，**不**使用 `tailwind.config.js` |
| Component lib | shadcn/ui | latest | 相容 React 19 + Tailwind v4 |
| Routing | **React Router v7** | ≥ 7.0 | Declarative Mode；import from `react-router`（不是 `react-router-dom`）|
| Data fetching | TanStack Query | v5 | — |
| Forms | react-hook-form | ≥ 8 | 搭配 `@hookform/resolvers` ≥ 4（Zod v4 相容）|
| Tables | TanStack Table | v8 | — |
| Charts | Recharts | latest | — |
| HTTP client | Axios | latest | JWT interceptor + 401 自動登出 |

### 2.4 React 19 特性使用規則

**Use:**
- React Compiler（經 `babel-plugin-react-compiler` 於 Vite 啟用）→ 自動 memoization
- `useActionState`、`useOptimistic`、`useFormStatus`（批量表單頁面適用）
- `use()` 讀取 Context
- ref as prop（減少 `forwardRef` 樣板）

**Do NOT use（SPA 場景用不到）：**
- Server Components / `"use server"`
- Server Actions
- `use()` 讀取 Promise（用 TanStack Query 的 `useQuery`）

**Memoization：**
- 讓 React Compiler 處理。**不要**加 `useMemo` / `useCallback` / `memo`，除非 profiling 證明特定熱點受益，並以 inline comment 說明原因。

### 2.5 Forbidden Libraries / Patterns

| ❌ 禁用 | ✅ 使用 | 原因 |
|-------|--------|------|
| bcrypt | argon2id | OWASP 2026 建議 |
| Puppeteer | Playwright | 官方主力、效能優、trace 診斷 |
| `tailwind.config.js` JS config | `@theme` CSS directive | Tailwind v4 首選方式 |
| `react-router-dom` | `react-router` (v7) | v7 已合併，`-dom` 套件 deprecated |
| `Number(x)` / `parseFloat(x)` on money | `new Decimal(x)` | 浮點誤差 |
| `.merge()` on Zod schema | `.extend()` 或 shape spread | Zod v4 API |
| `useMemo` / `useCallback` / `memo` 無差別使用 | 交給 React Compiler | 避免過度優化 |
| 簡體中文 UI 文字 | 繁體中文 | 香港慣例 |

### 2.6 Deployment Stack

- **作業系統**：Ubuntu 22.04 LTS（伺服器端）
- **反向代理**：Nginx 1.24+（自簽 HTTPS）
- **VPN**：Tailscale（HR 從辦公室 / 地盤存取）
- **Process manager**：PM2
- **備份**：sqlite3 `.backup` + cron + rsync

---

## 3. Hong Kong Legal Requirements

> ⚠️ **法律免責：** 本章節基於 2026-04 可公開取得的勞工處、積金局官方資料整理。實際部署前應由公司法律顧問與會計師審閱，並在 `docs/legal-rules.md` 逐條簽核。最終以官方公告為準。

### 3.1 連續性合約規定（Continuous Contract）

#### 3.1.1 418 規定（2026-01-18 之前適用）

僱員必須**連續受僱於同一僱主 4 星期或以上**，且**每星期最少工作 18 小時**，方被視為根據「連續性合約」受僱。

#### 3.1.2 468 規定（2026-01-18 起生效）

2026-01-18 起取代 418 規定。僱員符合以下**所有**條件，即屬「連續性合約」受僱：

1. 僱員**連續受僱於同一僱主 4 星期或以上**；**且**
2. 在該 4 星期的**每一個星期**符合下列**任一**條件：
   - (i) 該星期工作時數 **≥ 17 小時**；**或**
   - (ii) 該星期連同緊接前 3 個星期的 **4 星期累計工時 ≥ 68 小時**

#### 3.1.3 首 3 星期特殊規則（468 適用）

**「4 星期累計」(ii) 不適用於新入職的首 3 個星期。** 新入職的首 3 星期內，僱員**每星期必須工作 ≥ 17 小時**（即只能用條件 (i)）。

這是因為條件 (ii) 本質上需要前 3 週資料，而新入職者前 3 週尚不存在「前期」。

#### 3.1.4 規則選擇邏輯

系統依 `weekEndDate` 決定使用哪套規則：

```
if weekEndDate < 2026-01-18:
    ruleset = "418"  # 每週 >= 18 小時
else:
    ruleset = "468"  # 每週 >= 17 小時 OR 4 週累計 >= 68 小時（新入職首 3 週不適用後者）
```

**跨界情況：** 若 4 週窗口橫跨 2026-01-18，以當週 `weekEndDate` 為準判定規則，但 4 週累計的前期工時仍來自實際歷史資料。

#### 3.1.5 一週的定義

- **週一至週日**為一個「星期」（`weekStartsOn: 1`，符合 HK 慣例）
- `weekEndDate` = 週日
- 跨年週（如 2026-12-28 至 2027-01-03）正常計入

#### 3.1.6 計入工時的範圍

- 所有在該僱主處的實際工作時數（含 OT）
- **依法享有的假期或勞資雙方協議的缺勤**（例如協議無薪假）**須計作該僱員曾經工作的小時**（依《僱傭條例》附表 1）
- 法定假期當日：視為「工作了當日應有工時」

> ⚠️ **假設記錄：** 「協議無薪假計入工時」一條須由法律顧問確認計算方式。系統預設實作為：若 `LeaveRecord.countsAsWorkHours = true`，則當日按 `Worker.defaultDailyHours`（預設 8）計入。

#### 3.1.7 中斷與重置

- 任一週不符合條件 → `continuousWeeks` 歸零；`contractActiveDate` 保持（因為合約狀態是歷史事實，不因後續中斷而消失）
- 但 `contractActive = false` 至下一次再累積 4 週達標

#### 3.1.8 多分判商的工時處理

本系統場景：**同一工人可能同日為同公司旗下不同分判商工作**。

法律角度：「連續性合約」是針對**同一僱主**。本系統假設**整個建造公司為同一僱主**，分判商層級是內部工作分派，不切斷連續性。因此：

- 計算連續性時 → **所有分判商工時加總**
- 計算 MPF 行業計劃時 → **合併入息**，查表計算
- 計算薪酬時 → **可按分判商分別結算對賬單**，但工人層面合併

> ⚠️ **假設記錄：** 若分判商實為獨立法人（不同 BR），則此假設不成立，連續性須分別計算。Copilot agent 必須在 `docs/assumptions.md` 登記此假設並請業務確認。

#### 3.1.9 連續性合約對應的法定權益門檻

| 連續性合約受僱時間 | 享有的法定福利 |
|-----------------|--------------|
| 任何時間 | 休息日 |
| ≥ 1 個月 | 疾病津貼 |
| ≥ 3 個月（假期前）| 有薪法定假日 |
| ≥ 12 個月 | 有薪年假 |
| ≥ 24 個月 | 僱傭保障、遣散費 |
| ≥ 5 年 | 長期服務金 |

系統於 `Worker` 層面提供 `getContractDuration(workerId, asOfDate)` 輔助方法；薪酬計算引擎依此判定各項權益。

### 3.2 強積金 (MPF)

#### 3.2.1 60 日臨界點

- **臨時僱員**：年滿 18 至未滿 65 歲、從事建造業 / 飲食業、按日僱用或僱用期 < 60 日
- **一般僱員**：持續受僱 ≥ 60 日

受僱滿 60 日當日起適用一般計劃規則；之前可適用「行業計劃」（若僱主參加）。

**60 日的定義：** 自受僱日起按**曆日**計算（含假期），不是工作日。

**免供款期：** 新僱員首 30 日 + 首個不完整糧期內，僱員**本人**免供款；**僱主**自第 1 日起須供款。

#### 3.2.2 行業計劃（Industry Scheme）供款表

現行標準：

| 每日有關入息 (HK$) | 僱員每日供款 (HK$) | 僱主每日供款 (HK$) |
|------------------|-----------------|-----------------|
| < 280 | 0 | 按 5% of income |
| 280 ≤ income < 350 | 按 5% | 按 5% |
| 350 ≤ income < 450 | 按 5% | 按 5% |
| ... | ... | ... |
| ≥ 1,000 | 50（封頂）| 50（封頂）|

> ⚠️ **實作注意：** 上表為概念示意。**精確的 bracket 界線與供款金額必須從積金局官方 PDF 取得最新版本，錄入 `MpfIndustryRate` 資料庫**。Seed 腳本讀取官方表格；管理員可透過 `/settings/mpf-rates` 新增版本。**絕不硬編碼**。

#### 3.2.3 行業計劃計算邏輯

**日薪工人：**
```
dailyContribution = lookupIndustryRate(date, dailyWage)
periodTotal = sum of dailyContribution for each working day in period
```

**非日薪工人（週薪 / 月薪）：**
```
avgDailyWage = periodWage / workingDaysInPeriod
dailyContribution = lookupIndustryRate(date, avgDailyWage)
periodTotal = dailyContribution × workingDaysInPeriod
```

**版本控制：** `MpfIndustryRate` 以 `effectiveDate` 欄位版本化。查找時取 `effectiveDate <= targetDate` 中最新的版本。**新增新版本絕不覆寫舊版本**。

#### 3.2.4 一般計劃（Master Trust Scheme）供款

| 月入息 | 僱員供款 | 僱主供款 |
|-------|---------|---------|
| < HK$7,100 | 0 | 月入 × 5% |
| HK$7,100 ≤ 月入 ≤ HK$30,000 | 月入 × 5% | 月入 × 5% |
| > HK$30,000 | HK$1,500（封頂）| HK$1,500（封頂）|

**配置：** 上下限儲存於 `SystemConfig`（keys: `mpf_monthly_min`, `mpf_monthly_max`, `mpf_contribution_rate`），**不硬編碼**，方便政府未來調整。

> 📝 **監察：** 積金局於 2025 年 1 月建議調整上下限至 `HK$10,100` / `HK$33,000`（供款上限 `HK$1,650`），但尚未立法。系統設計支援透過 `SystemConfig` 即時調整。

#### 3.2.5 計劃判定邏輯

```
function determineScheme(workerId, asOfDate):
    daysEmployed = differenceInCalendarDays(asOfDate, worker.joinDate)
    if daysEmployed < 60:
        return "industry"  # 臨時僱員（若僱主參加行業計劃）
    else:
        return "master_trust"  # 一般僱員
```

**轉換提示：** 系統每日掃描所有工人，對於 `daysEmployed` 跨越 60 的工人，標記 `GET /api/alerts/scheme-change`，Dashboard 顯示通知。HR 確認後點「標記已處理」清除通知。

#### 3.2.6 離職重聘

若工人離職後重新受僱：

- 若距離上次離職 < 某日數（業務決定，預設 180 日）→ 視為延續僱傭，`joinDate` 保留
- 否則 → 開新 `Worker` 記錄或更新 `joinDate`（HR 選擇）

> ⚠️ **假設記錄：** 實際做法須業務確認。預設實作為：`joinDate` 可由 HR 手動更新，系統不自動決定。

### 3.3 最低工資

#### 3.3.1 現行水平（2025-05-01 起）

**HK$42.10 / 小時**

#### 3.3.2 即將生效的調整（2026-05-01 起）

**HK$43.10 / 小時**（增幅 2.38%）

#### 3.3.3 系統處理

- 獨立表 `MinWageHistory`（`effectiveDate`, `hourlyRate`）儲存歷史版本
- 薪酬計算時查詢當時生效版本：`SELECT ... WHERE effectiveDate <= payrollPeriodEnd ORDER BY effectiveDate DESC LIMIT 1`
- Seed 腳本必須輸入：`2025-05-01 → 42.10`、`2026-05-01 → 43.10`

#### 3.3.4 工時紀錄要求

- 月薪 < HK$17,600 的僱員（2026-05-01 起門檻；此前為 HK$17,200）：**僱主必須保存工時紀錄**
- 系統一律保存所有工人的工時紀錄（無論月薪高低），符合並超越法例要求

### 3.4 其他法定權益

系統於薪酬計算時自動處理：

| 權益 | 觸發條件 | 實作位置 |
|------|---------|---------|
| 休息日薪酬 | 符合連續性合約 | `PayrollService.computeRestdayWage()` |
| 法定假日薪酬 | 符合連續性合約 **且** 假期前受僱 ≥ 3 個月 | `PayrollService.computeHolidayWage()` |
| 疾病津貼 | 符合連續性合約 ≥ 1 月；累積病假日；醫生證明書 | `PayrollService.computeSicknessAllowance()` |
| 年假薪酬 | 連續受僱 ≥ 12 個月 | `LeaveService` + 薪酬計算 |

（詳細計算公式見 §5.4）

### 3.5 資料保留

- 《僱傭條例》要求工資紀錄保留至少 7 年
- 本系統所有刪除為**軟刪除**（`status = "deleted"` 或 `deletedAt` 欄位）
- 自動化工具（如 audit rotation）可歸檔但**不可物理刪除** 7 年以內的工資、出勤、審計紀錄

### 3.6 2026 年法定假日（系統須 seed）

**本系統 seed 的是「法定假日 (Statutory Holidays)」，不是「公眾假日 (General Holidays)」。** 建造業工人只享法定假日。

**2026 年法定假日共 15 天**（勞工處官方：https://www.labour.gov.hk/tc/news/latest_holidays2026.htm）：

| # | 中文名稱 | 2026 年日期 | 備註 |
|---|---------|-----------|------|
| 1 | 一月一日 | 2026-01-01（四）| |
| 2 | 農曆年初一 | 2026-02-17（二）| |
| 3 | 農曆年初二 | 2026-02-18（三）| |
| 4 | 農曆年初三 | 2026-02-19（四）| |
| 5 | 清明節 | 2026-04-05（日）| 適逢星期日，**僱主須於翌日（2026-04-06）補假** |
| 6 | 復活節星期一 | 2026-04-06（一）| 2021 年《僱傭（修訂）條例》新增，**2026 年起生效** |
| 7 | 勞動節 | 2026-05-01（五）| |
| 8 | 佛誕 | 2026-05-24（日）| 適逢星期日，**僱主須於翌日（2026-05-25）補假** |
| 9 | 端午節 | 2026-06-19（五）| |
| 10 | 香港特別行政區成立紀念日 | 2026-07-01（三）| |
| 11 | 中秋節翌日 | 2026-09-26（六）| |
| 12 | 國慶日 | 2026-10-01（四）| |
| 13 | 重陽節 | 2026-10-18（日）| 適逢星期日，**僱主須於翌日（2026-10-19）補假** |
| 14 | 冬節 **或** 聖誕節 | 2026-12-22（二）**或** 2026-12-25（五）| **由僱主二擇其一** — 本系統 `SystemConfig.winter_holiday_choice` 值為 `winter_solstice`（冬節）或 `christmas`（聖誕節）|
| 15 | 聖誕節後第一個周日 | 2026-12-26（六）| |

#### 3.6.1 補假規則

法定假日適逢僱員的**休息日**時，僱主應於休息日翌日補假。補假該日**不得**是另一個法定假日、另定假日、代替假日或休息日。

系統對「固定週日休息日」工人的補假自動計算：若法定假日 `d` 為星期日且工人以週日為休息日 → 補假日為 `d + 1`（往後找至非法定假日之工作日）。

#### 3.6.2 冬節 vs 聖誕節二擇一

僱主每年只能在冬節（冬至）與聖誕節之間選**一天**作為法定假日，另一天為**平日**。

**系統處理：**
- 新增 `SystemConfig` key：`winter_holiday_choice`（`winter_solstice` | `christmas`），預設 `christmas`
- Seed 15 天假日時，依此設定決定第 14 項 seed `2026-12-22` 還是 `2026-12-25`
- Admin 可於 `/settings/holidays` 頁面切換（切換時觸發所有未結算糧期的 holidayWage 重算提示）

#### 3.6.3 Agent 實作提醒

- 日期從勞工處官方 URL 實時查驗：https://www.labour.gov.hk/tc/news/latest_holidays2026.htm
- 勿自行推斷農曆日期
- 勿混淆「法定假日 15 天」與「公眾假日 17 天」— 本系統只涉及前者
- `PublicHoliday` 表的 `isStatutory` 欄位：本系統全部 seed `true`（因為我們只 seed 法定假日）；欄位保留是為了未來若需支援文職員工的 17 天公眾假日時擴充
- 未來年度（2027+）的假日 seed：由 Phase 7 部署指引說明年度更新流程

---

## 4. Complete Database Schema

> 完整 Prisma schema。Agent 必須**逐字**實作，任何欄位變更須透過 RFC。

### 4.1 schema.prisma

```prisma
// This is your Prisma schema file.
// Learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  // v1: SQLite for on-premise simplicity.
  // Migration path to PostgreSQL documented in docs/cloud-migration.md.
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================================
// Master data
// ============================================================

model Worker {
  id                String    @id @default(cuid())
  workerNo          String    @unique                        // e.g. W-2026-00001
  nameZh            String                                   // 繁體中文姓名
  nameEn            String?                                  // English name (optional)
  hkidMasked        String                                   // e.g. "A123***(7)"
  hkidHash          String    @unique                        // SHA-256 of normalized HKID
  phone             String?
  address           String?
  joinDate          DateTime
  leaveDate         DateTime?                                // null = currently employed
  subcontractorId   String
  subcontractor     Subcontractor @relation(fields: [subcontractorId], references: [id])

  // Wage config
  wageType          String                                   // "daily" | "hourly" | "monthly"
  wageAmount        Decimal                                  // base amount per unit of wageType
  defaultDailyHours Decimal   @default(8)                    // used for leave imputation
  otMultiplier      Decimal   @default(1.0)                  // OT pay factor

  // Certifications
  cwraNo            String?                                  // 建造業工人註冊編號
  cwraExpiry        DateTime?
  greenCardNo       String?                                  // 平安卡編號
  greenCardExpiry   DateTime?
  trades            String?                                  // JSON array of trades (e.g. ["紮鐵","電工"])

  // Banking (for payroll export; encrypted at column level if possible)
  bankName          String?
  bankAccountEnc    String?                                  // encrypted; masked on display

  // Soft delete & status
  status            String    @default("active")             // active | resigned | deleted
  remarks           String?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  attendances       Attendance[]
  continuityLogs    ContinuityLog[]
  payrolls          Payroll[]
  leaves            LeaveRecord[]

  @@index([subcontractorId])
  @@index([status])
  @@index([joinDate])
}

model Subcontractor {
  id            String   @id @default(cuid())
  code          String   @unique                             // short code e.g. "SUB-A"
  nameZh        String
  nameEn        String?
  brNo          String?                                      // Business Registration
  contactName   String?
  contactPhone  String?
  contactEmail  String?
  status        String   @default("active")                  // active | inactive | deleted
  remarks       String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workers       Worker[]
  attendances   Attendance[]

  @@index([status])
}

model Site {
  id            String    @id @default(cuid())
  code          String    @unique                            // e.g. "SITE-001"
  nameZh        String
  address       String?
  startDate     DateTime
  endDate       DateTime?
  pmName        String?                                      // Project Manager
  status        String    @default("active")                 // active | closed | deleted
  remarks       String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  attendances   Attendance[]

  @@index([status])
  @@index([startDate])
}

// ============================================================
// Attendance
// ============================================================

model Attendance {
  id               String   @id @default(cuid())

  workerId         String
  worker           Worker   @relation(fields: [workerId], references: [id])

  siteId           String
  site             Site     @relation(fields: [siteId], references: [id])

  subcontractorId  String
  subcontractor    Subcontractor @relation(fields: [subcontractorId], references: [id])

  date             DateTime                                  // date only (time part = 00:00:00, treat as HK date)

  // Time fields (nullable when only workHours is recorded)
  clockIn          DateTime?
  clockOut         DateTime?
  lunchHours       Decimal   @default(1.0)

  // Hours (computed or directly entered)
  workHours        Decimal                                   // excluding lunch
  overtimeHours    Decimal   @default(0)

  // Day classification
  dayType          String    @default("normal")              // normal | holiday | statutory | restday | typhoon | rainstorm | leave | absent

  // Wage snapshot (for reference; not authoritative - payroll recomputes)
  dailyWage        Decimal?

  remarks          String?

  // Soft delete
  deletedAt        DateTime?
  deletedBy        String?

  createdAt        DateTime  @default(now())
  createdBy        String?                                   // userId
  updatedAt        DateTime  @updatedAt
  updatedBy        String?

  // CRITICAL: a worker may legitimately work for different subcontractors
  // on the same day across different sites. Unique key spans 4 columns.
  @@unique([workerId, siteId, subcontractorId, date])
  @@index([date])
  @@index([workerId, date])
  @@index([siteId, date])
  @@index([subcontractorId, date])
}

// ============================================================
// Continuity (468 / 418) weekly status log
// ============================================================

model ContinuityLog {
  id                 String   @id @default(cuid())

  workerId           String
  worker             Worker   @relation(fields: [workerId], references: [id])

  weekStartDate      DateTime                                // Monday
  weekEndDate        DateTime                                // Sunday
  weekHours          Decimal                                 // sum across all subcontractors
  rolling4WeekHours  Decimal                                 // sum of weekHours for this and prior 3 weeks

  meets17hr          Boolean                                 // weekHours >= 17
  meets18hr          Boolean                                 // weekHours >= 18 (for 418 ruleset)
  meets68hr          Boolean                                 // rolling4WeekHours >= 68
  meets468           Boolean                                 // the actual condition result for 468
  meets418           Boolean                                 // the actual condition result for 418

  rulesetUsed        String                                  // "418" | "468"

  continuousWeeks    Int                                     // count of consecutive qualifying weeks
  contractActive     Boolean
  contractActiveDate DateTime?                               // date contract first became active (preserved)

  calculatedAt       DateTime @default(now())
  calculatedBy       String?

  @@unique([workerId, weekEndDate])
  @@index([workerId, weekEndDate])
  @@index([contractActive])
}

// ============================================================
// Payroll
// ============================================================

model Payroll {
  id                  String   @id @default(cuid())

  workerId            String
  worker              Worker   @relation(fields: [workerId], references: [id])

  periodStart         DateTime
  periodEnd           DateTime

  // Wage components (all Decimal)
  basicWage           Decimal
  overtimeWage        Decimal   @default(0)
  holidayWage         Decimal   @default(0)                   // statutory holiday pay
  restdayWage         Decimal   @default(0)
  typhoonWage         Decimal   @default(0)
  leaveWage           Decimal   @default(0)                   // paid leave
  otherEarnings       Decimal   @default(0)
  otherEarningsRemark String?

  grossWage           Decimal

  // Deductions
  mpfEmployee         Decimal   @default(0)
  mpfEmployer         Decimal   @default(0)                   // tracked but not deducted from net
  otherDeductions     Decimal   @default(0)
  otherDeductionRemark String?

  netWage             Decimal

  // Scheme bookkeeping
  mpfSchemeUsed       String                                  // "industry" | "master_trust"

  // Audit snapshot: JSON string of all legal params used
  calculationSnapshot String

  // Status & approval
  status              String    @default("draft")             // draft | approved | paid | cancelled
  approvedBy          String?
  approvedAt          DateTime?
  paidAt              DateTime?

  remarks             String?

  createdAt           DateTime  @default(now())
  createdBy           String?
  updatedAt           DateTime  @updatedAt

  @@unique([workerId, periodStart, periodEnd])
  @@index([periodStart, periodEnd])
  @@index([status])
  @@index([workerId, periodEnd])
}

// ============================================================
// Leave records
// ============================================================

model LeaveRecord {
  id                  String   @id @default(cuid())

  workerId            String
  worker              Worker   @relation(fields: [workerId], references: [id])

  startDate           DateTime
  endDate             DateTime
  leaveType           String                                  // annual | sick | statutory | no_pay | compensation | marriage | maternity | paternity
  isPaid              Boolean
  countsAsWorkHours   Boolean   @default(false)                // for continuity calc (see 3.1.6)

  medicalCert         Boolean   @default(false)                // sick leave
  remarks             String?

  status              String    @default("approved")           // requested | approved | rejected | cancelled
  approvedBy          String?
  approvedAt          DateTime?

  createdAt           DateTime  @default(now())
  createdBy           String?
  updatedAt           DateTime  @updatedAt

  @@index([workerId, startDate])
  @@index([leaveType])
}

// ============================================================
// Reference tables: MPF rates, holidays, min-wage history
// ============================================================

model MpfIndustryRate {
  id                String   @id @default(cuid())
  effectiveDate     DateTime                                  // applicable from this date until next version
  dailyMinIncome    Decimal                                   // inclusive lower bound
  dailyMaxIncome    Decimal                                   // exclusive upper bound (large for top bracket)
  employeeAmount    Decimal                                   // per-day contribution
  employerAmount    Decimal
  remarks           String?

  createdAt         DateTime @default(now())
  createdBy         String?

  @@index([effectiveDate])
  @@index([effectiveDate, dailyMinIncome])
}

model PublicHoliday {
  id          String   @id @default(cuid())
  date        DateTime @unique
  nameZh      String
  nameEn      String?
  isStatutory Boolean  @default(true)                          // 法定 vs 公眾假期

  createdAt   DateTime @default(now())

  @@index([date])
}

model MinWageHistory {
  id            String   @id @default(cuid())
  effectiveDate DateTime @unique
  hourlyRate    Decimal
  remarks       String?

  createdAt     DateTime @default(now())
  createdBy     String?

  @@index([effectiveDate])
}

model SystemConfig {
  key        String   @id                                     // e.g. "mpf_monthly_min"
  value      String                                           // stored as string; interpreted per valueType
  valueType  String                                           // "string" | "decimal" | "integer" | "boolean" | "json" | "date"
  category   String                                           // "wage" | "mpf" | "policy" | "company" | "system"
  label      String                                           // human-readable Chinese label
  remarks    String?

  updatedAt  DateTime @updatedAt
  updatedBy  String?
}

// ============================================================
// Users & audit
// ============================================================

model User {
  id             String    @id @default(cuid())
  username       String    @unique
  nameZh         String
  email          String?
  passwordHash   String                                       // argon2id hash ~96-100 chars
  role           String    @default("viewer")                 // admin | hr | viewer
  status         String    @default("active")                 // active | disabled | deleted
  mustChangePwd  Boolean   @default(true)
  lastLoginAt    DateTime?
  lastLoginIp    String?

  failedLogins   Int       @default(0)
  lockedUntil    DateTime?

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([status])
}

model AuditLog {
  id         String   @id @default(cuid())

  userId     String?                                          // nullable for unauthenticated events
  username   String?                                          // denormalized for resilience
  action     String                                           // create | update | delete | view | login | login_fail | approve | ...
  entity     String                                           // table name
  entityId   String?
  oldValue   String?                                          // JSON
  newValue   String?                                          // JSON
  ipAddress  String?
  userAgent  String?

  timestamp  DateTime @default(now())

  @@index([timestamp])
  @@index([userId, timestamp])
  @@index([entity, entityId])
}
```

### 4.2 Seed 資料要求

`prisma/seed.ts` 必須建立：

1. **1 位預設 admin**：`username=admin`，臨時密碼 argon2id hash，`mustChangePwd=true`
2. **SystemConfig 完整預設值**（見 §4.3）
3. **MinWageHistory**：至少兩筆（2025-05-01 / 42.10，2026-05-01 / 43.10）
4. **PublicHoliday**：2026 年 **15 個法定假日**（日期與名稱對照 §3.6 表格；從勞工處官方 https://www.labour.gov.hk/tc/news/latest_holidays2026.htm 核對）。冬節/聖誕節依 `SystemConfig.winter_holiday_choice` 擇一 seed
5. **MpfIndustryRate**：完整最新版本（從積金局官方 PDF 錄入）
6. **（選配）Demo data**：3 家分判商、5 個地盤、20 位工人、1 個月出勤（DEV 環境）

### 4.3 SystemConfig 預設 keys

| key | valueType | category | 預設值 | label |
|-----|-----------|----------|-------|-------|
| `mpf_monthly_min` | decimal | mpf | `7100` | MPF 月入下限 |
| `mpf_monthly_max` | decimal | mpf | `30000` | MPF 月入上限 |
| `mpf_contribution_rate` | decimal | mpf | `0.05` | MPF 供款比率 |
| `casual_threshold_days` | integer | mpf | `60` | 臨時僱員轉一般僱員天數 |
| `typhoon_policy` | string | policy | `full_day_pay` | 颱風日薪酬政策（full_day_pay / no_pay / half_day）|
| `rainstorm_policy` | string | policy | `full_day_pay` | 黑色暴雨薪酬政策 |
| `restday_pay_policy` | string | policy | `unpaid` | 休息日薪酬政策 |
| `holiday_min_months` | integer | policy | `3` | 法定假日薪酬所需最少受僱月數 |
| `winter_holiday_choice` | string | policy | `christmas` | 冬節/聖誕節法定假日二擇一（`winter_solstice` 或 `christmas`）|
| `backdated_entry_allowed` | boolean | policy | `true` | 是否允許補錄歷史出勤 |
| `rehire_continuity_days` | integer | policy | `180` | 離職重聘視為延續的最長日數 |
| `company_name_zh` | string | company | （公司繁中名稱）| 公司名稱（中）|
| `company_name_en` | string | company | （公司英文名稱）| Company Name |
| `company_logo_url` | string | company | `""` | 公司 Logo URL |
| `jwt_expiry_hours` | integer | system | `8` | JWT token 有效期 |
| `backup_retention_days` | integer | system | `30` | 備份保留天數 |

> 注意：`min_wage_hourly` 不放在 `SystemConfig`，因需保留歷史版本，使用獨立表 `MinWageHistory`。

### 4.4 PostgreSQL 遷移預留

Prisma schema 全部使用通用型別：
- `String` / `Boolean` / `Int` / `DateTime` / `Decimal` — 跨 SQLite 與 PostgreSQL 均有等效
- JSON 欄位統一使用 `String`（儲存 JSON 字串）— SQLite 無原生 JSON，PostgreSQL 日後可改 `Json` type
- 所有 index / unique 兩端行為一致

遷移步驟見 `docs/cloud-migration.md`（Phase 7 由 agent 撰寫）。

---

## 5. Core Business Logic

### 5.1 ContinuityService

**檔案位置：** `backend/src/modules/continuity/continuity.service.ts`

#### 5.1.1 對外方法

```ts
class ContinuityService {
  // Compute and upsert ContinuityLog for one worker-week. Idempotent.
  async calculateWeekStatus(
    workerId: string,
    weekEndDate: Date
  ): Promise<ContinuityLog>;

  // Recalculate range [fromDate, toDate] for one worker.
  // Triggered after backdated attendance edits.
  async recalculateRange(
    workerId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<ContinuityLog[]>;

  // Quick status query for payroll / alerts.
  async isActive(
    workerId: string,
    asOfDate: Date
  ): Promise<{ active: boolean; sinceDate: Date | null; rulesetUsed: "418" | "468" }>;

  // Timeline for UI charts.
  async getTimeline(
    workerId: string,
    from: Date,
    to: Date
  ): Promise<ContinuityLog[]>;
}
```

#### 5.1.2 calculateWeekStatus 演算法

```
INPUT: workerId, weekEndDate (Sunday, HK time)

1. worker <- getWorker(workerId)
2. weekStartDate <- startOfWeek(weekEndDate, { weekStartsOn: 1 })  // Monday
3. weekNumber <- floor(daysBetween(worker.joinDate, weekEndDate) / 7) + 1

4. weekHours <- SUM of (attendance.workHours + attendance.overtimeHours)
               FROM Attendance
               WHERE workerId = ? AND date BETWEEN weekStartDate AND weekEndDate
                 AND deletedAt IS NULL
   PLUS leave hours that count (LeaveRecord.countsAsWorkHours = true)
        x worker.defaultDailyHours

5. Compute rolling4WeekHours:
   IF weekNumber <= 3:
       rolling4WeekHours <- null  // not applicable
   ELSE:
       rolling4WeekHours <- weekHours + SUM(prior 3 weeks' weekHours)

6. Compute booleans:
   meets17hr <- weekHours >= 17
   meets18hr <- weekHours >= 18
   meets68hr <- rolling4WeekHours != null && rolling4WeekHours >= 68

7. Determine ruleset:
   rulesetUsed <- (weekEndDate < 2026-01-18) ? "418" : "468"

8. Evaluate the condition:
   IF rulesetUsed = "418":
       meets418 <- meets18hr
       qualifies <- meets18hr
   ELSE:  // 468
       meets418 <- false  // not applicable
       IF weekNumber <= 3:
           meets468 <- meets17hr
           qualifies <- meets17hr
       ELSE:
           meets468 <- meets17hr || meets68hr
           qualifies <- meets17hr || meets68hr

9. Determine continuousWeeks & contractActive:
   priorLog <- getPreviousLog(workerId, weekEndDate)
   IF qualifies:
       continuousWeeks <- (priorLog?.continuousWeeks || 0) + 1
   ELSE:
       continuousWeeks <- 0

   contractActive <- continuousWeeks >= 4

   IF contractActive AND priorLog?.contractActiveDate is null:
       contractActiveDate <- weekEndDate  // first activation
   ELSE:
       contractActiveDate <- priorLog?.contractActiveDate  // preserve

10. UPSERT ContinuityLog with all above fields.

11. IF contractActive changed, trigger audit log entry.
```

#### 5.1.3 recalculateRange

```
1. Collect all weekEndDates between fromDate and toDate (Sundays).
2. For each weekEndDate in chronological order:
     calculateWeekStatus(workerId, weekEndDate)
3. Return all updated ContinuityLog rows.
```

**Idempotent：** 相同 inputs 產出相同 outputs；可安全重複呼叫。

#### 5.1.4 Trigger 條件

下列事件會自動呼叫 `recalculateRange`：

- `Attendance` 建立 / 修改 / 軟刪除（`recalculateRange(workerId, attendance.date, now)`）
- `LeaveRecord` 建立 / 修改 / 取消
- Worker `joinDate` 修改（`recalculateRange(workerId, joinDate, now)`）

實作策略：同步呼叫；若變慢再改非同步 queue。

### 5.2 MpfService

**檔案位置：** `backend/src/modules/mpf/mpf.service.ts`

#### 5.2.1 對外方法

```ts
class MpfService {
  async determineScheme(
    workerId: string,
    asOfDate: Date
  ): Promise<"industry" | "master_trust">;

  async calcIndustryScheme(
    workerId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    employeeContribution: Decimal;
    employerContribution: Decimal;
    breakdown: Array<{ date: Date; dailyWage: Decimal; employee: Decimal; employer: Decimal }>;
  }>;

  async calcMasterTrust(
    monthlyIncome: Decimal,
    asOfDate: Date
  ): Promise<{ employeeContribution: Decimal; employerContribution: Decimal }>;

  async getIndustryRate(
    date: Date,
    dailyWage: Decimal
  ): Promise<{ employee: Decimal; employer: Decimal }>;

  async getSchemeChangeAlerts(
    asOfDate: Date
  ): Promise<Array<{ workerId: string; crossedOn: Date; currentScheme: string }>>;
}
```

#### 5.2.2 calcMasterTrust 演算法

```
1. min <- SystemConfig.mpf_monthly_min
2. max <- SystemConfig.mpf_monthly_max
3. rate <- SystemConfig.mpf_contribution_rate  // 0.05

4. IF monthlyIncome < min:
       employee <- 0
       employer <- monthlyIncome x rate (rounded 2dp, banker's)
   ELSE IF monthlyIncome > max:
       cap <- max x rate                           // e.g. 1500
       employee <- cap
       employer <- cap
   ELSE:
       amount <- monthlyIncome x rate
       employee <- amount (rounded 2dp, banker's)
       employer <- amount (same)

5. Return { employee, employer }
```

**Rounding：** 所有最終金額 2 位小數，使用 banker's rounding (`Decimal.ROUND_HALF_EVEN`)。中間運算保持完整精度。

#### 5.2.3 calcIndustryScheme 演算法

```
1. Get all attendance dates in period where worker actually worked.
2. For each date d:
     Determine "daily wage" for rate lookup:
       - If worker.wageType = "daily": dailyWage = worker.wageAmount
       - If worker.wageType = "hourly": dailyWage = attendance.workHours x worker.wageAmount
       - If worker.wageType = "monthly": dailyWage = worker.wageAmount / workingDaysInMonth
     rate <- getIndustryRate(d, dailyWage)
     append { date, dailyWage, employee, employer } to breakdown
3. Sum employee and employer from breakdown.
4. Return.
```

#### 5.2.4 getIndustryRate 查找邏輯

```sql
SELECT employeeAmount, employerAmount
FROM MpfIndustryRate
WHERE effectiveDate <= :date
  AND dailyMinIncome <= :dailyWage
  AND dailyMaxIncome > :dailyWage
ORDER BY effectiveDate DESC
LIMIT 1;
```

若查無結果 → 拋出 `AppError("MPF rate not found for date=... wage=...")`，薪酬計算整單標記為 `error`（不偽裝結果）。

#### 5.2.5 determineScheme

```
daysEmployed <- differenceInCalendarDays(asOfDate, worker.joinDate)
threshold <- SystemConfig.casual_threshold_days   // default 60
return (daysEmployed < threshold) ? "industry" : "master_trust"
```

#### 5.2.6 跨計劃糧期處理

若糧期跨越 60 日臨界點：

**簡化方案（v1）：** 以糧期結束日 (`periodEnd`) 判定整個糧期使用哪個 scheme，**不**做日切分。

**原因：** 積金局官方運作上也是以糧期為單位供款，切分複雜度不值得。

**影響記錄：** `Payroll.mpfSchemeUsed` 明確記錄本糧期使用哪個 scheme。

### 5.3 PayrollService

**檔案位置：** `backend/src/modules/payroll/payroll.service.ts`

#### 5.3.1 對外方法

```ts
class PayrollService {
  async calculateMonthly(workerId: string, year: number, month: number): Promise<Payroll>;

  async calculateBatch(
    filter: { subcontractorId?: string; workerIds?: string[] },
    year: number,
    month: number
  ): Promise<{ success: Payroll[]; failed: Array<{ workerId: string; error: string }> }>;

  async approve(payrollId: string, approverId: string): Promise<Payroll>;

  async recalculate(payrollId: string): Promise<Payroll>;  // only if status = "draft"

  async cancel(payrollId: string, reason: string, userId: string): Promise<Payroll>;
}
```

#### 5.3.2 calculateMonthly 主演算法

```
INPUT: workerId, year, month

1. Determine period:
   periodStart <- first day of month
   periodEnd <- last day of month

2. Check existing payroll:
   existing <- find where (workerId, periodStart, periodEnd)
   IF existing AND existing.status != "draft":
       throw AppError("Cannot modify approved/paid payroll")

3. Load worker, attendance, leaves, and snapshot legal params:
   worker <- getWorker(workerId)
   attendances <- getAttendances(workerId, periodStart, periodEnd)
   leaves <- getLeaves(workerId, periodStart, periodEnd)
   snapshot <- {
     minWageHourly: MinWageHistory.forDate(periodEnd),
     mpfMonthlyMin: SystemConfig.mpf_monthly_min,
     mpfMonthlyMax: SystemConfig.mpf_monthly_max,
     mpfRate: SystemConfig.mpf_contribution_rate,
     typhoonPolicy: SystemConfig.typhoon_policy,
     rainstormPolicy: SystemConfig.rainstorm_policy,
     restdayPolicy: SystemConfig.restday_pay_policy,
     holidayMinMonths: SystemConfig.holiday_min_months,
     rulesetUsed: (periodEnd < 2026-01-18) ? "418" : "468",
     calculatedAt: now(),
     calculatedBy: currentUserId()
   }

4. Compute wage components (see 5.4):
   basicWage <- sum of normal-day wages
   overtimeWage <- sum of OT x otMultiplier
   holidayWage <- (if eligible) sum of statutory holiday pay
   restdayWage <- (if paid per policy) sum of rest days
   typhoonWage <- apply typhoon_policy
   leaveWage <- sum of paid leave days
   otherEarnings <- 0 (HR can edit post-calc in draft)

   grossWage <- sum of all above

5. Minimum wage check:
   totalHours <- sum of workHours + overtimeHours (payable hours only)
   minRequired <- totalHours x snapshot.minWageHourly
   IF grossWage < minRequired:
       warnings.push("Below minimum wage: shortfall = " + (minRequired - grossWage))
       // HR can top up via otherEarnings manually.

6. MPF computation:
   scheme <- MpfService.determineScheme(workerId, periodEnd)
   IF scheme = "industry":
       mpf <- MpfService.calcIndustryScheme(workerId, periodStart, periodEnd)
   ELSE:
       mpf <- MpfService.calcMasterTrust(grossWage, periodEnd)
   mpfEmployee <- mpf.employeeContribution
   mpfEmployer <- mpf.employerContribution

7. Deductions & net:
   otherDeductions <- 0 (manual)
   netWage <- grossWage - mpfEmployee - otherDeductions

8. UPSERT Payroll (status = "draft") with all fields + calculationSnapshot (JSON string).
9. Return Payroll.
```

#### 5.3.3 approve

```
1. payroll <- get(payrollId)
2. IF payroll.status != "draft": throw
3. UPDATE status = "approved", approvedBy = userId, approvedAt = now()
4. Audit log.
5. AFTER approval: recalculate() is rejected; only cancel() is allowed.
```

#### 5.3.4 recalculate

允許條件：`status = "draft"` only。重新跑 `calculateMonthly` 並覆寫。

#### 5.3.5 cancel

將 `status` 改為 `"cancelled"`，記錄原因，保留所有資料（不刪）。

### 5.4 薪酬組成計算細則

#### 5.4.1 basicWage

```
IF worker.wageType = "daily":
    basicWage = COUNT(attendances where dayType="normal") x worker.wageAmount
ELSE IF worker.wageType = "hourly":
    basicWage = SUM(attendance.workHours where dayType="normal") x worker.wageAmount
ELSE IF worker.wageType = "monthly":
    basicWage = worker.wageAmount x (daysWorked / standardMonthDays)
```

#### 5.4.2 overtimeWage

```
hourlyRate <- derived:
    - "hourly": worker.wageAmount
    - "daily": worker.wageAmount / worker.defaultDailyHours
    - "monthly": (worker.wageAmount / standardMonthDays) / worker.defaultDailyHours

overtimeWage = SUM(attendance.overtimeHours) x hourlyRate x worker.otMultiplier
```

#### 5.4.3 holidayWage（法定假日）

**eligibility：**
```
isEligible <-
   ContinuityService.isActive(workerId, holidayDate).active
   AND getContractDuration(workerId, holidayDate) >= snapshot.holidayMinMonths  // default 3
```

**金額（依《僱傭條例》第 11 條及勞工處 2026 官方說明）：**

假日薪酬 = 僱員於**假日前 12 個月的每日平均工資**

```
function computeHolidayDailyAverage(workerId, holidayDate):
    endDate <- day before holidayDate
    startDate <- endDate - 12 months + 1 day

    // Collect total earnings in the 12-month window
    totalEarnings <- SUM(Payroll.grossWage for periods overlapping [startDate, endDate])
                     + (for periods straddling the window, prorate by overlapping days)

    // Collect total days paid
    totalDays <- count of days in window where
                 - worker was employed (between joinDate and leaveDate)
                 - excluding days where worker was on statutory leave (sick, maternity, etc.)
                   AND was paid less than full wage for those days (per EO §2)

    IF totalDays == 0:
        // New hire < 12 months; fall back to basicDailyWage as ordinance permits
        return basicDailyWage

    return totalEarnings / totalDays  // with 2dp banker's rounding
```

**說明要點（依官方）：**
- 僱主**不得**藉由減少假日前一段期間的工資來壓低假日薪酬
- 若僱員在 12 個月內曾有法定假日、休息日、有薪年假：這些日的工資**照計入**分子（總收入）
- 若僱員曾有疾病津貼、產假津貼、工傷期間工資：這些日**不計入**分母（按 EO §2 排除），因為這些日本身不是「正常工資」
- 若僱員受僱不足 12 個月：以實際受僱期間計算；若完全沒有歷史薪酬資料（剛入職首次遇上假日且連續性合約剛啟動）→ 退回 `basicDailyWage`

**PayrollService 必須：**
1. 在建立 Payroll 時，對糧期內每個法定假日分別呼叫 `computeHolidayDailyAverage`
2. 將計算過程（總收入、總天數、平均值）寫入 `calculationSnapshot.holidayBreakdown[]`
3. 單元測試覆蓋：剛入職不足 12 個月、跨 418/468 規則變更的 12 個月窗口、曾請病假的 12 個月窗口

> ⚠️ **v1 實作順序建議：** Phase 4 先實作簡化版（`basicDailyWage`）通過基本流程，Phase 4 後段補上 12 個月平均版本，並提供 migration 重算腳本。這樣可以先讓法律顧問審閱演算法，再開工寫。

#### 5.4.4 restdayWage（休息日）

```
IF SystemConfig.restday_pay_policy = "paid":
    IF ContinuityService.isActive(workerId, restdayDate).active:
        restdayWage <- basicDailyWage (per rest day with dayType="restday")
ELSE:
    restdayWage <- 0
```

#### 5.4.5 typhoonWage / rainstormWage

```
按 SystemConfig.typhoon_policy:
    - "full_day_pay": basicDailyWage
    - "half_day": basicDailyWage x 0.5
    - "no_pay": 0
```

（颱風日定義：當日 `dayType="typhoon"`，由 HR 於錄入時標示）

#### 5.4.6 leaveWage

```
對每筆 LeaveRecord 在糧期內的 day：
    IF leave.isPaid:
        leaveWage += basicDailyWage
```

> ⚠️ **實作簡化記錄：** 病假津貼正式為「平均工資 × 4/5」。v1 實作：`leaveType="sick" && isPaid` → `basicDailyWage × 0.8`。需法律顧問確認。

### 5.5 常數與輔助常數

```ts
// backend/src/modules/shared/constants.ts

export const RULE_468_EFFECTIVE_DATE = new Date("2026-01-18T00:00:00+08:00");
export const WEEK_STARTS_ON = 1;  // Monday
export const HK_TIMEZONE = "Asia/Hong_Kong";
export const DECIMAL_PLACES = 2;
export const ROUNDING_MODE = Decimal.ROUND_HALF_EVEN;  // banker's
```

### 5.6 Decimal 使用規範

- **絕對禁止** 在 Service 層使用 `Number`、`+`、`parseFloat` 處理金額
- 從 Prisma 讀出的 `Decimal` 直接傳遞
- 從 User Input / API payload 接收的數字字串 → `new Decimal(str)` 再運算
- 最終寫回資料庫前 → `.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)`
- Display 時 → `.toFixed(2)` 給 UI
- 單元測試：每個金額運算函數必須有「浮點誤差場景」測試（見 TC-DEC）

---

## 6. API Endpoints

### 6.1 通則

- **Base path:** `/api`
- **Auth:** 除 `POST /auth/login` 與 `GET /health` 外，全部需 JWT Bearer token
- **Response format:**
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "page": 1, "limit": 50, "total": 123 }
  }
  ```
  錯誤：
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "繁體中文錯誤訊息",
      "details": [...]
    }
  }
  ```
- **分頁:** `?page=1&limit=50` 預設；`limit` 上限 200
- **日期參數:** ISO 8601 (`YYYY-MM-DD`)；伺服器按 HK timezone 處理
- **Audit:** 所有 POST/PUT/PATCH/DELETE 自動寫入 `AuditLog`

### 6.2 Auth

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| POST | `/api/auth/login` | public | body `{ username, password }` → `{ token, user }`，JWT 8h |
| POST | `/api/auth/logout` | any | 記錄登出時間至 audit |
| GET | `/api/auth/me` | any | 當前使用者資料 |
| POST | `/api/auth/change-password` | any | body `{ oldPassword, newPassword }` |

Rate limit：`/api/auth/login` 每 IP 每分鐘 5 次，失敗 5 次鎖 15 分鐘。

### 6.3 Workers

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/workers` | hr,admin,viewer | query: `search`, `subcontractorId`, `status`, `page`, `limit` |
| POST | `/api/workers` | hr,admin | create |
| GET | `/api/workers/:id` | hr,admin,viewer | detail |
| PUT | `/api/workers/:id` | hr,admin | update |
| DELETE | `/api/workers/:id` | admin | soft delete |
| GET | `/api/workers/:id/attendances` | hr,admin,viewer | query: `from`, `to` |
| GET | `/api/workers/:id/continuity` | hr,admin,viewer | query: `from`, `to` |
| GET | `/api/workers/:id/payrolls` | hr,admin,viewer | |
| GET | `/api/workers/:id/leaves` | hr,admin,viewer | |

HKID 處理：伺服器計算 `hkidHash`（SHA-256 of normalized `A123456(7)` — 全大寫、去除括號）；檢查 `unique`；儲存 `hkidMasked` + `hkidHash`；**絕不**儲存明文。

### 6.4 Subcontractors / Sites

同 Workers 的 CRUD 模式。

### 6.5 Attendance

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/attendance` | hr,admin,viewer | `date`, `workerId`, `siteId`, `subcontractorId`, `from`, `to` |
| POST | `/api/attendance` | hr,admin | single record |
| POST | `/api/attendance/batch` | hr,admin | array; **transactional** all-or-nothing |
| PUT | `/api/attendance/:id` | hr,admin | update; triggers continuity recalc |
| DELETE | `/api/attendance/:id` | hr,admin | soft delete; triggers continuity recalc |
| GET | `/api/attendance/summary` | hr,admin,viewer | `from`, `to`, `groupBy=worker\|site\|subcontractor` |

### 6.6 Continuity

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/continuity/:workerId` | hr,admin,viewer | `from`, `to` → `ContinuityLog[]` |
| GET | `/api/continuity/:workerId/status` | hr,admin,viewer | `asOf=YYYY-MM-DD` → `{ active, sinceDate, rulesetUsed }` |
| POST | `/api/continuity/recalculate` | hr,admin | body `{ workerId, from, to }` → triggers `recalculateRange` |

### 6.7 MPF

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/mpf/contributions` | hr,admin | `year`, `month`, `subcontractorId?` → per-worker breakdown |
| GET | `/api/mpf/rates` | hr,admin | `asOf=YYYY-MM-DD` |
| POST | `/api/mpf/rates` | admin | new version (NEVER overwrites) |

### 6.8 Payroll

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| POST | `/api/payroll/calculate` | hr,admin | body `{ year, month, subcontractorId?, workerIds? }` → batch result |
| GET | `/api/payroll` | hr,admin,viewer | `year`, `month`, `status`, `workerId?`, `subcontractorId?` |
| GET | `/api/payroll/:id` | hr,admin,viewer | detail + calculationSnapshot |
| PATCH | `/api/payroll/:id/approve` | admin | approve one |
| PATCH | `/api/payroll/:id/recalculate` | hr,admin | only if draft |
| PATCH | `/api/payroll/:id/cancel` | admin | body `{ reason }` |

### 6.9 Alerts

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/alerts/cert-expiry` | hr,admin,viewer | `within=7\|14\|30` days |
| GET | `/api/alerts/scheme-change` | hr,admin | workers crossing 60-day |
| POST | `/api/alerts/scheme-change/:workerId/mark-handled` | hr,admin | |
| GET | `/api/alerts/pending-payrolls` | hr,admin | draft payrolls past due |

### 6.10 Reports

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| POST | `/api/reports/generate` | hr,admin | body `{ type, format, filters }` → binary stream |
| POST | `/api/reports/preview` | hr,admin,viewer | body `{ type, filters }` → first 20 rows JSON |

（詳見 §8）

### 6.11 Users & Audit

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/users` | admin | |
| POST | `/api/users` | admin | |
| PUT | `/api/users/:id` | admin | |
| DELETE | `/api/users/:id` | admin | soft delete |
| POST | `/api/users/:id/reset-password` | admin | generates temp password |
| GET | `/api/audit` | admin | `from`, `to`, `userId`, `entity`, `action` |

### 6.12 Config

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/config` | hr,admin | all entries |
| GET | `/api/config/:key` | hr,admin | |
| PUT | `/api/config/:key` | admin | type-coerce per valueType |

### 6.13 Health

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/health` | public | `{ status: "ok", timestamp, version }` |

### 6.14 OpenAPI

Agent 於 Phase 2 起維護 `docs/openapi.yaml`（或透過 zod-to-openapi 自動產生），涵蓋全部端點的 request/response schema、錯誤碼、範例。

---

## 7. Frontend Pages

### 7.1 全域要求

- 全部文字**繁體中文**（用字對照 `docs/glossary.md`）
- **無登入不能進入**除 `/login` 以外的任何頁面
- **401 自動登出** + 導向 `/login`
- Layout 結構：Top navbar（公司 logo、當前用戶、登出）+ Sidebar（主要連結）+ Content
- 響應式：1280px 以上最佳；支援平板 768px
- Error boundary 捕捉所有 React 錯誤，顯示友善訊息 + 回報按鈕
- 全域 Toast notification（成功、警告、錯誤）
- 全域 Loading indicator（路由切換時）
- 危險操作（刪除、批核、取消）顯示 Confirm Dialog

### 7.2 路由總覽

```
/login                           登入
/                                Dashboard
/workers                         工人列表
/workers/new                     新增工人
/workers/:id                     工人詳情（Tabs: 基本資料 / 出勤 / 連續性 / 薪酬 / 假期）
/workers/:id/edit                編輯工人

/subcontractors                  分判商列表
/subcontractors/new
/subcontractors/:id
/subcontractors/:id/edit

/sites                           地盤列表
/sites/new
/sites/:id
/sites/:id/edit

/attendance                      出勤查詢（按日期）
/attendance/entry                批量出勤錄入

/payroll/calculate               月結計算
/payroll                         薪酬列表
/payroll/:id                     薪酬詳情 + 批核

/mpf                             MPF 供款清單

/reports                         報表中心

/alerts/cert-expiry              證件到期清單
/alerts/scheme-change            需轉 MPF 計劃工人

/settings/config                 系統配置
/settings/mpf-rates              MPF 費率版本管理
/settings/min-wage-history       最低工資歷史版本（admin 可新增）
/settings/holidays               公眾假期管理
/settings/users                  用戶管理（admin）
/settings/audit                  審計日誌（admin）
```

### 7.3 頁面規格重點

#### 7.3.1 `/login`

- Username + Password 兩個 field
- Submit 按鈕（Enter 觸發）
- 錯誤提示（區分「帳號密碼錯誤」與「帳號被鎖定」，但錯誤訊息不洩露「帳號是否存在」）
- 成功後：
  - 若 `user.mustChangePwd = true` → 強制導向 `/change-password`
  - 否則導向 `/` Dashboard
- 顯示版本號與公司名稱（footer）

#### 7.3.2 `/` Dashboard

**KPI 卡片（4 張）：**
- 本月出勤總工時
- 活躍工人數（`status = active`）
- 待批核薪酬單（`status = draft`）
- 即將到期證件（30 日內）

**圖表：**
- 過去 6 個月總工時按分判商堆疊（Recharts bar）
- 過去 6 個月薪酬總額（Recharts line）

**警示面板（列表，每條可點擊跳到詳情）：**
- 證件到期（7/14/30 日分色）
- MPF 計劃轉換（60 日跨界）
- 待批核薪酬（draft > 3 天）

**Quick actions（按鈕列）：**
- 錄入出勤
- 計算薪酬
- 生成報表

**角色差異：**
- `viewer`：僅 KPI + 圖表；警示與 quick actions 隱藏或 disabled

#### 7.3.3 `/workers` 列表

- Top：搜尋框（工人編號 / 姓名）、分判商下拉、狀態篩選、新增按鈕（hr/admin）
- 表格：工人編號、姓名、分判商、工種、入職日、狀態、CWRA 到期、操作
- 欄位可排序，支援分頁
- 行點擊跳 `/workers/:id`
- Empty state：「尚未有工人紀錄，請點「新增」」

#### 7.3.4 `/workers/:id` 詳情（Tabs）

**Tab 1: 基本資料**
- 所有 Worker 欄位唯讀顯示
- HKID 僅顯示遮罩（`A123***(7)`）
- 「編輯」按鈕（hr/admin）

**Tab 2: 出勤**
- 日曆熱力圖（最近 12 個月；顏色深淺代表工時）
- 點日期 → 顯示當日出勤紀錄（若多分判商，列出多筆）
- 列表檢視（可切換）：表格含日期、分判商、地盤、工時、OT、狀態、備註

**Tab 3: 連續性**
- Timeline chart（每週一個點，色分 qualifying / not）
- 高亮首次觸發合約的週
- Tooltip：weekHours, rolling4WeekHours, rulesetUsed
- 按鈕「重新計算」（hr/admin，呼叫 `recalculateRange`）
- 顯示當前狀態：`contractActive`、`contractActiveDate`、`continuousWeeks`

**Tab 4: 薪酬**
- 歷月薪酬清單
- 欄位：糧期、grossWage、mpfEmployee、netWage、status
- 點擊跳 `/payroll/:id`

**Tab 5: 假期**
- 假期列表（已批、已取消）
- 新增假期按鈕（hr/admin）
- 年假結餘（若 ≥ 12 個月連續受僱）

#### 7.3.5 `/workers/new` `/workers/:id/edit`

- react-hook-form + Zod
- HKID input：自動大寫，輸入時即時驗證格式與 checksum
- 分判商必選（下拉）
- `wageType` 下拉（日薪 / 時薪 / 月薪），`wageAmount` 欄位根據類型顯示單位提示
- `joinDate` 不可早於 `leaveDate`（若有）
- 提交後 toast 成功訊息 + 導回列表

#### 7.3.6 `/attendance/entry` 批量錄入 ★ 核心頁面

**頂部區域：**
- 日期選擇器（預設今日；支援 backdated）
- 地盤下拉（必選）
- 分判商下拉（必選，可多選 — 多選時顯示多個表格）
- 「載入工人」按鈕 → 從該分判商的 active workers 載入
- 顯示提示：「若工人今日已為其他分判商工作，系統會確認是否併錄」

**工人表格（每分判商一個）：**
- 每行對應一位工人
- 欄位：
  - `✓` checkbox（是否出勤）
  - 工人編號、姓名（唯讀）
  - `clockIn`（time input）
  - `clockOut`（time input）
  - `lunchHours`（預設 1.0，可改）
  - `workHours`（自動 = clockOut - clockIn - lunch；可手動覆寫）
  - `overtimeHours`（預設 0）
  - `dayType`（下拉）
  - 備註

**Bulk actions：**
- 全部簽到（勾選所有 ✓）
- 全部 8 小時（workHours=8, clockIn=08:00, clockOut=17:00, lunchHours=1）
- 清除

**儲存：**
- 「儲存全部」按鈕觸發 `POST /api/attendance/batch`（transactional）
- 若任何一筆驗證失敗 → 該行標紅 + 錯誤訊息；**全部 rollback**
- 成功 → Toast + 自動清空或保留（HR 選擇）
- 觸發 continuity 重算（背景 / 顯示載入中）

**離開警告：** 若有未儲存改動，離開頁面 `window.confirm` 確認

#### 7.3.7 `/attendance` 日期查詢

- 頂部：日期選擇器 + 地盤 + 分判商多選 + 工人搜尋
- 表格：所有當日出勤
- 行點擊 → 彈出 modal 編輯
- 右上：「匯出 Excel」按鈕（呼叫 Report API 的 `attendance_detail` 類型）

#### 7.3.8 `/payroll/calculate`

- 選擇：年 + 月
- 可選篩選：分判商、特定工人（多選）
- 「開始計算」按鈕 → 進度條
- 結果表格（可展開每行看 breakdown）
- 每行顯示 `warnings`（如最低工資不足）
- 底部：「全部批核」（admin）或逐行批核

#### 7.3.9 `/payroll/:id` 詳情

- 頂部：工人資訊、糧期、status badge
- 薪酬組成表格（basicWage, overtimeWage, holidayWage, ..., grossWage）
- 扣減表格（mpfEmployee, otherDeductions, netWage）
- 「計算依據」可展開區（顯示 `calculationSnapshot` JSON）
- 操作按鈕：
  - `draft`: 重新計算、批核（admin）、取消
  - `approved`: 下載工資單 PDF、取消（admin）
  - `paid`: 下載工資單 PDF

#### 7.3.10 `/reports` 報表中心

- 左側：報表類型下拉（13 種）
- 中央：
  - 日期區間（pickler + 快選：本週 / 本月 / 上月 / 本季 / 本年 / 自訂）
  - 地盤多選
  - 分判商多選
  - 工人多選（若適用）
- 右側：格式 toggle（Excel / PDF）、預覽、下載
- 預覽 → 顯示首 20 筆 JSON 以表格呈現
- 下載 → 觸發檔案下載（backend stream）
- 若資料量 > 5000 筆 → 顯示進度或排至 async job

#### 7.3.11 `/settings/mpf-rates`

- 版本列表（按 `effectiveDate` 倒序）
- 每版本展開顯示 bracket 表格
- 新增版本按鈕（admin） → 彈 dialog：輸入 effectiveDate + 多個 bracket
- **不可**修改或刪除舊版本（UI 無此按鈕）

#### 7.3.12 `/settings/audit`

- 篩選：日期區間、使用者、entity、action
- 表格：timestamp, username, action, entity, entityId, IP
- 行點擊 → 展開顯示 oldValue / newValue JSON diff
- **無**刪除或編輯按鈕

### 7.4 UI 元件規範

- 使用 shadcn/ui 元件：Button、Input、Select、Form（不是舊版 Form wrapper，用新版 Field 家族）、Dialog、Toast、Table、DatePicker 等
- 表單用 `react-hook-form` + Zod resolver
- 伺服器端與客戶端共用 Zod schema（`backend/src/modules/*/schemas.ts` 可 re-export，或放 shared package）
- 表格用 TanStack Table（支援 sorting、pagination、filter）
- 圖表用 Recharts

### 7.5 國際化與無障礙

- v1 僅繁體中文，**不**引入 i18n library
- 所有 `<Input>` 必須有關聯 `<Label>`
- 錯誤訊息放 `aria-live="polite"` 區域
- 所有互動元素可 Tab 到達，視覺 focus ring 清晰
- 色彩對比 ≥ WCAG AA（shadcn 預設達標）

---

## 8. Report Service

### 8.1 架構

```
┌─────────────────────────────────────┐
│  ReportService (facade)             │
│  - generate(type, format, filters)  │
│  - preview(type, filters)           │
└──────────────┬──────────────────────┘
               │
     ┌─────────┴──────────┐
     │                    │
┌────▼─────┐      ┌──────▼──────┐
│ Excel    │      │ PDF         │
│ Generator│      │ Generator   │
│ (ExcelJS)│      │ (Playwright)│
└────┬─────┘      └──────┬──────┘
     │                   │
     └─────────┬─────────┘
               │
        ┌──────▼───────────┐
        │ BaseReport       │
        │ (strategy)       │
        ├──────────────────┤
        │ - AttendanceDetail│
        │ - HoursSummary    │
        │ - SubcontractorStatement│
        │ - ... (13 total)  │
        └──────────────────┘
```

### 8.2 13 種報表

| # | 識別字 | 名稱 | 主要欄位 | 主要格式 |
|---|-------|------|---------|---------|
| 1 | `attendance_detail` | 出勤明細表 | 日期、工人、分判商、地盤、clockIn/Out、workHours、OT、dayType、備註 | Excel |
| 2 | `hours_summary` | 工時彙總表 | 工人、總工時、OT、按月小計 | Excel |
| 3 | `subcontractor_statement` | 分判商對賬單 | 按分判商分 sheet；每 sheet 工人明細 + 小計 + 總計 | Excel（多 sheet）|
| 4 | `payroll_calculation` | 薪酬計算單 | 工人、糧期、各 wage 組成、MPF、gross、net | Excel |
| 5 | `payslip_individual` | 個人工資單 | 單人；公司抬頭 + 糧期 + 組成表 + MPF 明細 | PDF（每人一頁，可合併） |
| 6 | `mpf_contribution_list` | MPF 供款清單 | 按 scheme 分組；工人、income、employee、employer、total | Excel |
| 7 | `labour_dept_hours` | 勞工處工時紀錄 | 符合勞工處格式的工時紀錄 | PDF / Excel |
| 8 | `cic_audit` | CIC 稽查報告 | 工人、CWRA、平安卡、工時、地盤 | Excel / PDF |
| 9 | `injury_14days` | 工傷前 14 日紀錄 | 事故日前 14 日逐日出勤；無出勤留空 | PDF |
| 10 | `continuity_status` | 468 連續性合約清單 | 工人、contractActive、sinceDate、ruleset | Excel |
| 11 | `cert_expiry` | 平安卡/CWRA 到期清單 | 工人、證件、到期日、剩餘日數 | Excel |
| 12 | `attendance_rate` | 出勤率分析 | 工人、應到日、實到日、出勤率 + 圖表（PDF）| Excel + PDF |
| 13 | `overtime_summary` | 加班統計 | 工人、OT 小時、OT 薪酬、按月分布 | Excel |

### 8.3 Excel 規範

- 首行 bold + 填色 `FF1F4E78`（深藍）+ 白字
- 首行 freeze
- 資料區域自動 filter
- 貨幣欄位 format `#,##0.00`
- 合計列使用 `=SUM(...)` **公式**（非靜態數字）
- 日期欄 format `yyyy-mm-dd`
- 多分判商報表：每家一個 sheet，sheet 名 = 分判商名稱（特殊字元 `\ / ? * [ ]` 以 `_` 取代，限 31 字元）
- 檔名：`{報表中文名}_{YYYYMMDD}-{YYYYMMDD}.xlsx`

### 8.4 PDF 規範

- A4 縱向預設（報表可選橫向）
- 公司 Logo + 名稱於頁首（自 `SystemConfig` 讀取）
- 頁碼 (X/Y) + 生成時間於頁尾
- 字型：**Noto Sans TC**（繁體中文）— 字型檔案 commit 至 `backend/fonts/NotoSansTC-*.ttf`
- 字型授權：Noto SIL OFL 1.1，commercial use OK
- 表格不跨頁截斷（best effort，使用 CSS `page-break-inside: avoid`）
- Playwright 用 `page.pdf({ format: 'A4', printBackground: true, margin: {...} })`

### 8.5 自訂日期篩選

- 必填：`startDate`、`endDate`
- 可選：`subcontractorIds`（多選）、`siteIds`（多選）、`workerIds`（多選）
- 所有篩選以 AND 組合
- 空 = 全部
- 邊界日期 inclusive

### 8.6 性能要求

- 10,000 筆 Excel 生成 < 60 秒
- 記憶體 < 500MB（避免 OOM）
- 大型報表採 streaming（`ExcelJS.stream.xlsx.WorkbookWriter`）
- Playwright browser instance **必須正確關閉**（避免 memory leak）：
  ```ts
  const browser = await chromium.launch();
  try {
    // ... generate PDF
  } finally {
    await browser.close();
  }
  ```
- 連續 100 次生成 RSS 不應持續增長

### 8.7 實作檔案結構

```
backend/src/modules/reports/
├── report.service.ts           # facade
├── report.controller.ts
├── base.generator.ts           # abstract class
├── excel/
│   ├── excel.generator.ts
│   └── styles.ts               # shared styling helpers
├── pdf/
│   ├── pdf.generator.ts
│   ├── templates/              # HTML templates per report type
│   │   ├── payslip.html
│   │   ├── injury-14days.html
│   │   └── ...
│   └── fonts/                  # Noto Sans TC
├── generators/
│   ├── attendance-detail.ts
│   ├── hours-summary.ts
│   ├── subcontractor-statement.ts
│   ├── payroll-calculation.ts
│   ├── payslip-individual.ts
│   ├── mpf-contribution-list.ts
│   ├── labour-dept-hours.ts
│   ├── cic-audit.ts
│   ├── injury-14days.ts
│   ├── continuity-status.ts
│   ├── cert-expiry.ts
│   ├── attendance-rate.ts
│   └── overtime-summary.ts
└── __tests__/
```

---

## 9. Security Requirements

### 9.1 認證 (Authentication)

- **密碼雜湊**：**argon2id**（`argon2` npm 套件），參數：
  - `memoryCost: 19456` (19 MiB)
  - `timeCost: 2`
  - `parallelism: 1`
  - （OWASP Password Storage Cheat Sheet minimum）
- **JWT**：HS256，payload `{ userId, username, role, iat, exp }`，**8 小時**到期
- **JWT Secret**：至少 32 字元；由環境變數 `JWT_SECRET` 載入；系統啟動時若值缺失或等於 `"changeme"` **拒絕啟動**
- **首次登入**：`user.mustChangePwd = true` 時強制改密碼方可繼續
- **登入失敗鎖定**：同一帳號失敗 5 次 → 鎖 15 分鐘（`User.lockedUntil`）
- **Rate limit**：`/api/auth/login` 全域每 IP 每分鐘 5 次

### 9.2 授權 (Authorization)

三個角色：

| Role | 可做 |
|------|------|
| `admin` | 所有操作 + 用戶管理 + 審計日誌 + MPF 費率新增 + 刪除 + 批核 |
| `hr` | 建立 / 編輯 / 查詢工人、出勤、薪酬、生成報表、計算薪酬；**不能** 批核 / 刪除 / 用戶管理 |
| `viewer` | 僅讀取 |

Middleware `requireRole(['admin'])` 在 router 層統一實施。

### 9.3 資料保護

- **HKID 永不明文**：
  - 輸入時：normalize（去除空白、括號；全大寫）
  - 儲存：`hkidMasked = "A123***(7)"` + `hkidHash = SHA-256(normalized)`
  - 查詢：以 hash 查找，**不**支援「按 HKID 搜尋」（只能按姓名 / 編號）
- **銀行戶口**：column-level 加密（AES-256-GCM），密鑰來自 `ENCRYPTION_KEY` env；UI 預設遮罩僅顯示後 4 位
- **API 回應**：永不回傳 `passwordHash`、`hkidHash` 原值
- **資料庫檔案**（SQLite `.db`）：檔案權限 `chmod 600`，僅 node 使用者可讀

### 9.4 OWASP Top 10 對應

| OWASP | 本系統防護 |
|-------|-----------|
| A01 Broken Access Control | 角色中介軟體；每個端點明確 role check |
| A02 Cryptographic Failures | argon2id、TLS 1.3、AES-256 for 敏感欄位 |
| A03 Injection | Prisma 參數化查詢；Zod 輸入驗證 |
| A04 Insecure Design | Threat model 於 `docs/architecture.md`；帳戶鎖定；rate limit |
| A05 Misconfiguration | Helmet、CORS 白名單、HSTS、無預設 secrets |
| A06 Vulnerable Components | `npm audit`; Dependabot 開啟 |
| A07 Identification & Auth Failures | rate limit + lockout + session expiry |
| A08 Data Integrity | AuditLog 不可變；checksum 敏感運算 |
| A09 Logging Failures | Winston 結構化日誌；audit log ≥ 7 年保留 |
| A10 SSRF | 無外部 URL fetch；`web_fetch` / 外部 API 不在本系統範圍 |

### 9.5 HTTP 標頭（Nginx + Helmet）

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'; ...`（Helmet 預設良好基礎）
- `Referrer-Policy: strict-origin-when-cross-origin`

### 9.6 審計日誌

- **所有** POST / PUT / PATCH / DELETE 自動寫入 `AuditLog`
- **敏感讀取**（查看薪酬單、審計日誌本身）也記錄
- 欄位：userId, username, action, entity, entityId, oldValue, newValue, ipAddress, userAgent, timestamp
- **沒有** API 可修改或刪除 `AuditLog`（`DELETE /api/audit/:id` **不存在**；試圖 direct SQL 修改需另外有 DB access，本系統 API 層無此端點）

### 9.7 生產環境 HTTPS

- Nginx 反向代理；伺服器產生自簽憑證（內部使用可接受）
- 未來若公開至網路 → 改用 Let's Encrypt 或公司憑證
- 所有 HTTP 請求 `301` 轉 HTTPS

### 9.8 備份加密

- 備份檔案使用 gpg 對稱加密或 ZIP AES-256
- 密鑰不與備份檔案存於同機
- 還原時需密鑰（由 IT 管理）

---

## 10. Deployment Requirements

### 10.1 目標環境

- **OS**：Ubuntu 22.04 LTS
- **最低規格**：4 CPU / 8GB RAM / 50GB SSD / 固定 IP（內網）
- **建議規格**：8 CPU / 16GB RAM / 100GB SSD
- **網絡**：辦公室內網 + Tailscale VPN（讓地盤 / WFH HR 接入）
- **Windows Server 支援**：v1 選配；以 `scripts/install.ps1` 實現

### 10.2 `docs/deployment.md` 必備章節

Phase 7 的 agent 必須撰寫：

1. **部署前準備**：硬件、OS、網絡、埠口、使用者帳號
2. **伺服器初始設定**：安裝 Node.js 22、Git、PM2、Nginx、sqlite3、unzip、gpg
3. **應用程式部署**：
   - `git clone`
   - `cp .env.example .env` + 編輯必要欄位（`JWT_SECRET`、`DATABASE_URL`、`ENCRYPTION_KEY`）
   - `npm ci --production` on backend 與 frontend
   - `npx prisma migrate deploy`
   - `npx prisma db seed`
   - `npm run build` 產出 frontend dist
   - `pm2 start ecosystem.config.js`
4. **Nginx 反向代理 + 自簽 HTTPS**：完整 `/etc/nginx/sites-available/attendance` 範例
5. **Tailscale VPN 設定**：`sudo apt install tailscale` → `tailscale up` → 授權 → 取得內網 IP
6. **首次登入**：admin / 臨時密碼 → 強制改密碼
7. **自動備份**：
   - `scripts/backup.sh` 每日 03:00 透過 cron
   - 保留 30 日
   - 每月 1 日 gpg 加密後 rsync 至離線硬碟
8. **日常維運**：`pm2 logs`、`pm2 restart`、`pm2 monit`、健康檢查端點
9. **故障排除**：常見錯誤清單（DB 鎖定、Nginx 502、Playwright 字型）
10. **資料還原**：`scripts/restore.sh` 步驟
11. **升雲指引**：鏈結 `docs/cloud-migration.md`
12. **安全建議清單**：OS 更新、防火牆 (`ufw`)、SSH 限制、audit log rotate

### 10.3 部署腳本

| 腳本 | 用途 |
|------|------|
| `scripts/install.sh` | Linux 一鍵安裝（apt 安裝依賴 + PM2 + Nginx 配置）|
| `scripts/install.ps1` | Windows Server 對應腳本（選配）|
| `scripts/backup.sh` | 每日備份 + 旋轉 |
| `scripts/verify-backup.sh` | 抽樣還原測試 |
| `scripts/restore.sh` | 還原自備份 |
| `scripts/generate-cert.sh` | 產生自簽憑證 |

### 10.4 PM2 ecosystem.config.js

```js
module.exports = {
  apps: [{
    name: "attendance-backend",
    script: "backend/dist/server.js",
    instances: 1,  // SQLite not suitable for multi-process writes
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    max_memory_restart: "1G",
    watch: false,
    autorestart: true
  }]
};
```

### 10.5 升雲路徑（v1.x → v2）

- SQLite → PostgreSQL：`prisma migrate` + `pgloader` 或 `sqlite3-to-postgres`
- 改 `provider = "postgresql"`，重新跑 `prisma migrate dev`
- File storage 若日後需要 → 加 S3 adapter（v1 無檔案上傳）
- 見 `docs/cloud-migration.md` 完整流程（Phase 7）

---

## 11. Execution Plan

### 11.1 8 個 Phase 一覽

| Phase | 名稱 | 預計長度 | 最大風險 |
|-------|------|---------|---------|
| 1 | Scaffolding | 3–5 天 | Prisma schema 正確 |
| 2 | Master Data | 5–7 天 | HKID 處理、軟刪除 |
| 3 | Attendance | 5–7 天 | 多分判商 unique key、批量錄入 UX |
| 4 | Core Business Logic | 10–14 天 | **最關鍵**：468 / MPF / 薪酬，必須業務驗證 |
| 5 | Reports | 7–10 天 | 繁中 PDF、勞工處格式、性能 |
| 6 | Dashboard, Alerts, Leaves | 5–7 天 | — |
| 7 | Testing, Docs, Deployment | 7–10 天 | deployment.md 實測 |
| 8 | UAT & Validation | 10–14 天 | 歷史資料回跑零差異 |

### 11.2 里程碑驗證

- **Phase 1 Done**：`npm run dev` 啟動成功、登入、audit log 有登入紀錄
- **Phase 4 Done**：6 個月真實歷史資料回跑，468 狀態與人工對照一致
- **Phase 5 Done**：所有報表經 HR / QS 業務人員審閱格式
- **Phase 7 Done**：乾淨 VM 照 deployment.md 部署成功
- **Phase 8 Done**：雙軌驗證差異 = 0；簽核完成；`v1.0.0` 發布

### 11.3 每個 Phase 必交付

- Feature branch `phase/N-...`
- PR 附 self-review 對照 acceptance criteria
- Test coverage report
- 相關文件更新
- 螢幕截圖 / demo GIF（UI 變更時）

### 11.4 風險管理

| 風險 | 緩解 |
|------|------|
| Agent 誤解法規 | Phase 4 PR 必須由人類 + 法律顧問 review；`docs/legal-rules.md` 簽核流程 |
| 歷史計算差異 | Phase 8 雙軌；差異 > HK$1 退回修復 |
| 效能不達標 | Phase 7 load test；300 人 < 30s 硬指標 |
| 部署失敗 | Phase 7 / 8 在乾淨 VM 實測 |
| 技術棧過時 | 本規格鎖定 2026-04 最穩定版本；升級走 RFC |

### 11.5 人類審查責任

Copilot agent **不能自動 merge PR**。每個 PR 至少由技術負責人 review：
- Phase 4 PR **強制** 業務負責人（HR 主管）+ 法律顧問共審
- Phase 8 PR 強制管理層簽核後才 release

---

## 12. Deliverables

### 12.1 Repository

```
attendance-system/
├── .github/
│   ├── copilot-instructions.md
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── workers/
│   │   │   ├── subcontractors/
│   │   │   ├── sites/
│   │   │   ├── attendance/
│   │   │   ├── continuity/
│   │   │   ├── mpf/
│   │   │   ├── payroll/
│   │   │   ├── leaves/
│   │   │   ├── reports/
│   │   │   ├── alerts/
│   │   │   ├── config/
│   │   │   ├── users/
│   │   │   ├── audit/
│   │   │   └── shared/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── audit.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── utils/
│   │   ├── config.ts
│   │   └── server.ts
│   ├── tests/
│   ├── fonts/                  # Noto Sans TC
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── styles/
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── .env.example
│   └── package.json
├── scripts/
│   ├── install.sh
│   ├── install.ps1
│   ├── backup.sh
│   ├── verify-backup.sh
│   ├── restore.sh
│   └── generate-cert.sh
├── nginx/
│   └── attendance.conf
├── docs/
│   ├── PROJECT_SPEC.md             ★ 本檔案
│   ├── test-cases.md
│   ├── acceptance-checklist.md
│   ├── architecture.md             # Phase 7
│   ├── api.md 或 openapi.yaml      # Phase 7
│   ├── deployment.md               # Phase 7
│   ├── user-manual.md              # Phase 7（繁中）
│   ├── legal-rules.md              # Phase 4（繁中，供法律顧問簽核）
│   ├── cloud-migration.md          # Phase 7
│   ├── dual-run-plan.md            # Phase 8
│   ├── assumptions.md
│   ├── known-issues.md
│   └── glossary.md
├── ecosystem.config.js
├── .gitignore
├── LICENSE
└── README.md
```

### 12.2 發布物（v1.0.0）

- Git tag `v1.0.0` on main
- GitHub Release 附：
  - Release notes（從 commit history 自動生成）
  - 已驗證的部署套件 zip
  - `UAT-report-v1.0.0.pdf`（Phase 8 產出的歷史資料回跑報告）
  - 所有簽核文件

### 12.3 驗收簽核

見 `docs/acceptance-checklist.md`「驗收簽署」段。

---

**—— END OF SPEC ——**

> 有任何疑問，請在 PR / Issue 討論，或開 RFC Issue 變更本規格。
