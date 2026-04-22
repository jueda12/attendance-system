# 建造業出勤管理系統 · Construction Attendance System

> 香港建造業 HR 內部出勤與薪酬管理系統
> Hong Kong construction industry — HR-internal attendance & payroll management

[![CI](https://github.com/jueda12/attendance-system/actions/workflows/ci.yml/badge.svg)](https://github.com/jueda12/attendance-system/actions)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)
[![Status](https://img.shields.io/badge/status-in%20development-yellow)]()

---

## 📖 系統概覽

本系統為香港建造業公司的 **HR 內部管理工具**，取代現行的「紙本簽到 → WhatsApp 相片上傳 → 人手 Excel」流程，將月薪結算時間由 3–7 日縮短至數小時，並確保符合勞工處與 CIC 稽查要求。

### 核心功能

- 👷 **工人、分判商、地盤主檔管理**
- 📅 **批量出勤錄入**（支援同工人單日多分判商）
- ⚖️ **自動判定 468 連續性合約狀態**（2026-01-18 新例）
- 💰 **強積金自動計算**（行業計劃 + 一般僱員計劃）
- 📊 **月薪結算**（薪酬計算快照留痕供稽核）
- 📑 **13 種報表**（Excel + PDF，支援自訂日期區間）
- 🔔 **證件到期與計劃轉換提示**
- 🔐 **完整審計日誌**（符合 7 年資料保留要求）

### 介面預覽（Phase 1）

![登入頁](./frontend-login.png)
![儀表板佔位頁](./frontend-dashboard.png)

### 目標用戶

- 內部 HR 團隊（3–10 人）
- **不**提供工人端 App 或分判商自助門戶
- 規模：200–500 工人、多個地盤、多個分判商

---

## 🛠️ 技術棧

| 層級 | 技術 |
|------|------|
| **Runtime** | Node.js 22 LTS（active support 至 2027-04-30）|
| **Backend** | TypeScript · Express · Prisma · SQLite（PostgreSQL-ready）· Zod v4 · Winston |
| **Frontend** | React 19.2 · Vite · TypeScript · TailwindCSS v4 · shadcn/ui · TanStack Query · React Router v7 |
| **測試** | Vitest · React Testing Library · Playwright（E2E）|
| **報表** | ExcelJS · Playwright（PDF with 繁體中文字型）|
| **部署** | PM2 · Nginx · Tailscale VPN |
| **認證** | JWT · **argon2id**（OWASP 推薦）|
| **精度** | decimal.js · Prisma.Decimal（金額運算絕不使用 Number）|

---

## 🚀 快速開始

### 前置要求

- Node.js **22.x LTS**（2026-10 前 Active Support；不要用 Node 20，已於 2026-04-30 EOL）
- npm 10+ 或 pnpm 9+
- Git

### 本地開發

```bash
# 1. Clone 專案
git clone https://github.com/jueda12/attendance-system.git
cd attendance-system

# 2. 安裝依賴（Phase 1 完成後 scaffolding 就位，才有 package.json）
npm install

# 3. 設定環境變數
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# 編輯 .env，至少設定 JWT_SECRET

# 4. 初始化資料庫
cd backend
npx prisma migrate dev
npx prisma db seed

# 5. 回到根目錄，同時啟動前後端
cd ..
npm run dev
```

啟動後：

- 後端 API：http://localhost:3000
- 前端 UI：http://localhost:5173
- 預設登入：`admin` / （seed 產生的臨時密碼，首次登入需更換）

### 執行測試

```bash
npm run test              # 全部測試
npm run test:backend      # 僅後端
npm run test:coverage     # 帶覆蓋率
npm run test:e2e          # Playwright E2E
```

### 產生 Production Build

```bash
npm run build
```

---

## 📁 專案結構

```
attendance-system/
├── .github/
│   ├── copilot-instructions.md      # AI agent 自動載入的指引
│   ├── ISSUE_TEMPLATE/              # Issue 模板
│   ├── PULL_REQUEST_TEMPLATE.md     # PR 模板
│   └── workflows/ci.yml             # Lint + Test CI
├── backend/                         # Phase 1 由 agent 建立
│   ├── prisma/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── workers/
│   │   │   ├── attendance/
│   │   │   ├── continuity/
│   │   │   ├── mpf/
│   │   │   ├── payroll/
│   │   │   └── reports/
│   │   └── server.ts
│   └── tests/
├── frontend/                        # Phase 1 由 agent 建立
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── main.tsx
│   └── public/
├── scripts/                         # 部署腳本（Phase 7）
├── nginx/                           # Nginx 設定範本（Phase 7）
├── docs/
│   ├── PROJECT_SPEC.md              # 完整技術規格 ★
│   ├── test-cases.md                # 120+ 測試案例 ★
│   ├── acceptance-checklist.md      # 交付驗收 checklist ★
│   ├── assumptions.md               # agent 業務假設紀錄
│   ├── known-issues.md              # 已知問題
│   ├── glossary.md                  # 繁中業務術語
│   ├── architecture.md              # 系統架構（Phase 7）
│   ├── api.md                       # API 參考（Phase 7）
│   ├── deployment.md                # 部署教學（Phase 7）
│   ├── user-manual.md               # HR 操作手冊（Phase 7）
│   ├── legal-rules.md               # 法規實現說明（Phase 4）
│   ├── cloud-migration.md           # 升雲指引（Phase 7）
│   └── dual-run-plan.md             # 雙軌上線計劃（Phase 8）
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📚 文件導覽

| 角色 | 從這裡開始讀 |
|------|------------|
| **新加入開發者** | 本 README → `docs/PROJECT_SPEC.md` → `docs/architecture.md` |
| **IT 部署人員** | `docs/deployment.md` |
| **HR 操作員** | `docs/user-manual.md`（繁體中文）|
| **法律顧問** | `docs/legal-rules.md`（繁體中文）|
| **升雲負責人** | `docs/cloud-migration.md` |
| **AI coding agent** | `.github/copilot-instructions.md`（自動載入）|

---

## ⚖️ 法規依據

本系統嚴格遵守以下香港法規，實現細節見 [`docs/legal-rules.md`](docs/legal-rules.md)：

- **《僱傭條例》第 57 章** — 連續性合約規定
  - 2026-01-18 前：「418」規定（每週 18 小時 × 4 週）
  - 2026-01-18 起：「468」規定（每週 17 小時 OR 任何 4 週累計 68 小時）
- **《強制性公積金計劃條例》**
  - 行業計劃（臨時僱員，受僱 < 60 日）
  - 一般計劃（受僱 ≥ 60 日，5% + 月入上下限）
- **最低工資條例** — HK$42.10/hr（2025-05-01 起）
- **資料保留** — 工資紀錄保留 ≥ 7 年（本系統採軟刪除）

> ⚠️ 本系統輸出的法律文件（如勞工處工時紀錄、MPF 供款報表）**建議先由法律顧問 / 會計師審閱**後再正式使用。任何法規變動應更新 `MpfIndustryRate` 與 `SystemConfig`。

---

## 🔐 安全原則

- 🔒 密碼雜湊使用 **argon2id**（OWASP 推薦；參數 `memoryCost=19456, timeCost=2, parallelism=1`）
- 🔑 JWT 有效期 ≤ 8 小時
- 🆔 HKID 以遮罩 + SHA-256 雜湊儲存，**絕不**明文
- 📝 所有 mutation 寫入 `AuditLog`，審計日誌不可刪除或修改
- 🚫 SQL injection 由 Prisma 參數化防護
- 🛡️ XSS 由 React 預設 escape + Helmet middleware
- 🌐 Production 強制 HTTPS + HSTS
- ⏱️ 登入 rate limit（5 次 / 分鐘 / IP）

完整安全基線見 [`docs/deployment.md`](docs/deployment.md) 安全章節。

---

## 🧪 測試與品質

- 業務邏輯服務覆蓋率目標：**≥ 90%**
- 後端整體覆蓋率目標：**≥ 80%**
- 所有金額運算使用 `Decimal`，單元測試驗證無精度遺失
- CI 自動執行：lint + type-check + test + coverage + decimal guard
- 120+ 測試案例見 [`docs/test-cases.md`](docs/test-cases.md)

---

## 🗓️ 開發路線圖

本專案以 8 個 Phase 分階段開發，GitHub Issue 追蹤：

- ⏳ Phase 1 — 專案架構與認證
- ⏳ Phase 2 — 主檔管理
- ⏳ Phase 3 — 出勤錄入
- ⏳ Phase 4 — 核心業務邏輯（468 / MPF / 薪酬）
- ⏳ Phase 5 — 報表
- ⏳ Phase 6 — Dashboard 與提示
- ⏳ Phase 7 — 測試、文件、部署腳本
- ⏳ Phase 8 — 部署驗證與 UAT

（`⏳` = 待開始；`🔄` = 進行中；`✅` = 完成。請依實際進度更新。）

見 [Issues](../../issues) 追蹤目前進度。

---

## 🤝 貢獻方式

本專案主要由 AI coding agent（GitHub Copilot）完成開發，人類開發者角色為 review 與驗收。

### 工作流程

1. 依 Issue 順序處理，一次一個 Phase
2. 從 `main` 開 feature branch：`phase/N-short-name`
3. Commit 遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
   ```
   feat(continuity): implement 468 rolling window
   fix(mpf): correct industry scheme lookup
   test(payroll): add edge cases for holiday wage
   docs(deployment): add Tailscale section
   ```
4. 開 PR，附上：
   - 對應 Issue 的 `Closes #N`
   - 自我 review 對照 acceptance criteria
   - 測試結果與覆蓋率
5. Review 通過後由維護者 merge

### 禁止事項

- ❌ 直接 push 到 `main`
- ❌ 使用 `Number` 作金額運算
- ❌ 硬編碼任何 secret 或 API key
- ❌ 輸出簡體中文 UI（必須繁體）
- ❌ 引入規格未列的第三方套件（須先開 RFC issue）

---

## 🚢 部署

**Production 部署**請參閱完整教學：[`docs/deployment.md`](docs/deployment.md)（Phase 7 完成後產出）

### 簡要流程

1. 準備 Ubuntu 22.04 LTS 伺服器（最低 4 CPU / 8GB RAM / 50GB SSD）
2. 執行 `scripts/install.sh`
3. 設定 `.env`（JWT secret、DB path、SMTP 等）
4. `npx prisma migrate deploy && npx prisma db seed`
5. `pm2 start ecosystem.config.js`
6. 配置 Nginx + 自簽 HTTPS
7. 設定 Tailscale VPN 讓 HR 從辦公室 / 地盤存取
8. 設定 crontab 每日備份
9. 首次登入改密碼，建立 HR 帳號，匯入主檔

### 升雲

當內部使用成熟、需要多地協作時，可升級至雲端 PostgreSQL + S3。流程見 [`docs/cloud-migration.md`](docs/cloud-migration.md)。

---

## 📮 聯絡與支援

| 事項 | 聯絡 |
|------|------|
| 技術問題 / Bug | 開 GitHub Issue |
| 業務流程問題 | 內部 HR 主管 |
| 法規疑問 | 公司法律顧問 |
| 系統停機 / 緊急 | 內部 IT 聯絡窗口 |

---

## 📄 License

Proprietary — 本專案為公司內部系統，未經授權不得對外散布或商業使用。
詳見 [LICENSE](./LICENSE)。

---

**Built with care for the Hong Kong construction industry. 🏗️**
