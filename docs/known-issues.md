# Known Issues & Limitations

> **用途：** 登記已知但尚未修復的問題、技術限制、或暫時接受的 trade-off。
>
> **使用原則：**
> - 如果問題有明確修復計劃 → 開 GitHub Issue 而不是寫在這裡
> - 這份檔案是給未來接手的人看的「你應該知道這些坑」清單
> - 每條目標示嚴重度與影響範圍

---

## 格式

```markdown
### KI-NNN: <短標題>

- **Category:** performance / usability / security / legal / other
- **Severity:** critical / high / medium / low
- **Reported in:** Phase X / Issue #N / PR #N
- **Description:** 問題是什麼？在什麼情況下會發生？
- **Workaround:** 使用者目前怎麼繞過？
- **Why not fixed:** 為什麼現在不修？（範圍、優先級、依賴）
- **Target version:** v1.1 / v2.0 / 無計劃
```

---

## 已知問題清單

<!-- 從 Phase 1 開始逐步累積 -->

### KI-001: TanStack Query 在 React 19 hidden-mode pre-render 中無法執行

- **Category:** technical
- **Severity:** low
- **Reported in:** Tech stack selection
- **Description:** TanStack Query 的 `useQuery` 依賴 `useEffect`，因此在 React 19 的 hidden-mode pre-render（搭配 `<Activity>` 元件）中不會執行。需要改用 `queryClient.ensureQueryData` 做預載。
- **Workaround:** 本專案為 SPA，不使用 `<Activity>` 或 SSR，**目前不受影響**。若未來採用相關特性，改用 `ensureQueryData` 即可。
- **Why not fixed:** Upstream 限制，非本專案問題。
- **Target version:** N/A — 監看 TanStack Query 對 React 19 pre-render 的官方支援。

### KI-002: Tailwind CSS v4 的瀏覽器需求

- **Category:** technical / compatibility
- **Severity:** low（僅影響非主流瀏覽器使用者）
- **Reported in:** Tech stack selection
- **Description:** Tailwind CSS v4 依賴 `@property` 與 `color-mix()` 等現代 CSS 特性，要求 Safari 16.4+、Chrome 111+、Firefox 128+。
- **Workaround:** 本系統為內部 HR 工具，用戶使用公司統一部署的現代瀏覽器，**目前不受影響**。若需支援舊瀏覽器，須降版至 Tailwind v3.4。
- **Why not fixed:** 刻意選擇 v4 以取得建構速度與 CSS-first 設定的好處。
- **Target version:** N/A。

### KI-003: argon2 native module 於 Docker 部署需 rebuild

- **Category:** deployment
- **Severity:** low
- **Reported in:** Tech stack selection
- **Description:** `argon2` npm 套件為 native binding（C binding via node-gyp）。在 Docker multi-stage build 中，若 build stage 與 runtime stage 的架構或 glibc 版本不同，需要在 runtime stage 重新 `npm rebuild argon2`，或將 build 與 runtime 對齊同一個 base image。
- **Workaround:** 本專案以 PM2 直接部署於 Ubuntu 22.04，**目前不受影響**。若日後容器化，請在 Dockerfile 中確認 base image 一致。
- **Why not fixed:** native binding 本質特性，非 argon2 專有。
- **Target version:** N/A（有需要時記於 `docs/deployment.md`）。

---

## 明確不支援的功能（Out of Scope for v1）

以下為**刻意**不在 v1 範圍內的功能，已記錄以避免重複被提出：

- **工人端 App** — 本系統僅供 HR 內部使用，不提供工人查閱薪酬或簽到功能
- **打卡硬件整合** — 不整合指紋機、面部辨識、藍牙 beacon 等任何硬件
- **分判商自助門戶** — 分判商不直接使用系統，HR 代為錄入
- **多公司 / 多租戶** — 單一公司使用
- **即時出勤追蹤** — 批次錄入即可，不做 real-time
- **自動排更** — 本系統不負責排班
- **薪酬直接過數至銀行** — 本系統只生成資料，不整合銀行 API
- **工會 / 集體合約額外規則** — 若日後需要可於 v2 擴充

若未來需要加入以上功能，須開 RFC issue 討論。
