# 測試案例集 (Test Case Specifications)

> **使用方式：** 放入專案 `docs/test-cases.md`。GitHub Copilot agent 會自動讀取此文件作為測試編寫依據。
>
> **涵蓋範圍：** 所有業務邏輯關鍵測試 + 法規邊界案例 + 整合測試
>
> **測試框架：** Vitest (backend) + React Testing Library (frontend)
>
> **命名規範：** `describe` 用繁體中文業務名稱，`it` 用英文行為描述

---

## 目錄

1. [連續性合約 (468 / 418) 測試](#1-連續性合約-468--418-測試)
2. [MPF 行業計劃測試](#2-mpf-行業計劃測試)
3. [MPF 一般僱員 (Master Trust) 測試](#3-mpf-一般僱員-master-trust-測試)
4. [60 日臨時僱員轉換測試](#4-60-日臨時僱員轉換測試)
5. [薪酬計算引擎測試](#5-薪酬計算引擎測試)
6. [多分判商紀錄測試](#6-多分判商紀錄測試)
7. [Decimal 精度測試](#7-decimal-精度測試)
8. [特殊日期處理測試](#8-特殊日期處理測試)
9. [報表生成測試](#9-報表生成測試)
10. [API 整合測試](#10-api-整合測試)
11. [性能測試](#11-性能測試)
12. [安全測試](#12-安全測試)

---

## 1. 連續性合約 (468 / 418) 測試

### 1.1 基本 468 情境

**TC-CONT-001：每週 17 小時連續 4 週 → 觸發連續性合約**

```
Given: 工人於 2026-02-01 入職（週日）
When:  連續 4 週每週工作 17 小時（週一至週五每天 3.4 小時）
Then:  第 4 週結束時 contractActive = true
       contractActiveDate = 第 4 週週日
       continuousWeeks = 4
       rulesetUsed = "468"
```

**TC-CONT-002：每週 16 小時（不達標）→ 不觸發**

```
Given: 工人入職，連續 4 週每週 16 小時
Then:  每週 meets17hr = false
       4 週累計 = 64 小時 < 68
       contractActive = false
       continuousWeeks = 0
```

**TC-CONT-003：4 週累計剛好 68 小時（邊界）→ 觸發**

```
Given: 工人過了最初 3 週後
       第 4 週工作 10 小時，前 3 週分別 20、20、18 小時
When:  第 4 週結束計算
Then:  weekHours = 10, meets17hr = false
       rolling4WeekHours = 68, meets68hr = true
       meets468 = true
```

**TC-CONT-004：4 週累計 67 小時（邊界 -1）→ 不觸發**

```
Given: 同上但某一天少 1 小時，累計 67
Then:  meets68hr = false, meets468 = false
```

### 1.2 首 3 週特殊規則

**TC-CONT-005：新入職首 3 週不適用 4 週累計規則**

```
Given: 工人於 2026-03-01 入職
When:  第 1 週 15 小時、第 2 週 15 小時、第 3 週 15 小時
       (累計 45 小時，但首 3 週不能用累計)
Then:  每週都 meets17hr = false
       meets468 = false (因首 3 週必須每週 17 小時)
       continuousWeeks = 0
```

**TC-CONT-006：第 4 週起適用 4 週累計**

```
Given: 首 3 週每週 17 小時，第 4 週 15 小時
When:  第 4 週結束計算
Then:  第 4 週 meets17hr = false
       rolling4WeekHours = 17+17+17+15 = 66, meets68hr = false
       meets468 = false → continuousWeeks reset 為 0
```

**TC-CONT-007：首週入職日不是週一的處理**

```
Given: 工人於 2026-03-04 (週三) 入職
When:  計算該週狀態
Then:  partial week，weekHours 只計週三至週日
       建議：不觸發 468，等到首個完整週再計算
       （agent 需明確記錄這個 decision 在 docs/assumptions.md）
```

### 1.3 418 舊規則（2026-01-18 前）

**TC-CONT-008：2025 年期間使用 418 規則**

```
Given: weekEndDate = 2025-12-31
When:  工人該週工作 17 小時
Then:  rulesetUsed = "418"
       418 要求每週 ≥ 18 小時
       meets17hr 欄位仍記錄 17hr 結果，但判斷邏輯使用 meets18hr
       contractActive = false (17 < 18)
```

**TC-CONT-009：2025 年期間每週 18 小時 → 觸發 418**

```
Given: 2025 年連續 4 週每週 18 小時
Then:  contractActive = true, rulesetUsed = "418"
```

**TC-CONT-010：跨越 2026-01-18 的計算**

```
Given: 4 週分別為 2026-01-05, 01-12, 01-19, 01-26 週結束
When:  計算 2026-01-26 那週
Then:  前兩週用 418，後兩週用 468
       rulesetUsed = "468" (以當週日期為準)
       前兩週資料仍可用於 4 週累計
```

### 1.4 中斷與重置

**TC-CONT-011：中斷後重新計算**

```
Given: 工人已累積 3 週 meets468
When:  第 4 週工時為 0
Then:  continuousWeeks = 0
       contractActive = false
```

**TC-CONT-012：中斷後重新達標**

```
Given: 工人已觸發連續性合約
When:  隔週 0 小時，之後又重新達標
Then:  需累積新的連續週數才能再次 contractActive = true
       原 contractActiveDate 清除
```

### 1.5 回溯重算

**TC-CONT-013：修改歷史出勤後自動重算**

```
Given: 工人 2026-03-01 的出勤紀錄被 HR 修改
When:  HR 提交修改
Then:  所有 2026-03-01 之後的 ContinuityLog 必須重新計算
       contractActiveDate 可能因此改變
       系統應記錄 audit log
```

**TC-CONT-014：批量重算 API 正確性**

```
Given: 工人有 6 個月出勤紀錄
When:  呼叫 recalculateRange(workerId, from, to)
Then:  結果與逐週計算一致 (idempotent)
       重複呼叫結果相同
```

---

## 2. MPF 行業計劃測試

### 2.1 每日供款查表

**TC-MPF-IS-001：日薪 < HK$280 → 僱員免供款**

```
Given: 日薪 HK$250
When:  查 MpfIndustryRate
Then:  employeeAmount = 0
       employerAmount > 0 (按表定)
```

**TC-MPF-IS-002：日薪 HK$280 邊界 → 開始供款**

```
Given: 日薪 HK$280（剛好等於下限）
Then:  符合 dailyMinIncome <= 280 <= dailyMaxIncome 的區間
       按該區間定額/百分比供款
```

**TC-MPF-IS-003：日薪 HK$1,000 → 封頂**

```
Given: 日薪 HK$1,000
Then:  employeeAmount = 50
       employerAmount = 50
```

**TC-MPF-IS-004：日薪 HK$5,000（超過上限）→ 仍封頂 50**

```
Given: 日薪 HK$5,000
Then:  employeeAmount = 50
       employerAmount = 50
       (不可因高薪再多供)
```

**TC-MPF-IS-005：整個糧期累計**

```
Given: 工人當月 22 個工作日，均為日薪 HK$900
When:  計算月供款
Then:  一日供款 = 查表得 HK$45 (假設)
       月供款 employee = 22 × 45 = HK$990
       月供款 employer = 22 × 45 = HK$990
```

### 2.2 版本控制

**TC-MPF-IS-006：歷史日期使用舊版本費率**

```
Given: MpfIndustryRate 有兩個版本
       v1: effectiveDate = 2020-01-01, 某區間 = HK$40
       v2: effectiveDate = 2026-07-01, 同區間 = HK$50
When:  計算 2026-05-15 的供款
Then:  使用 v1 (effectiveDate <= 目標日期中最晚的)
       不可使用 v2
```

**TC-MPF-IS-007：新版本不覆蓋舊版本**

```
Given: 管理員新增 v2 費率
Then:  v1 資料仍保留
       歷史薪酬單的計算結果不變
       已生成的 Payroll 記錄不自動重算
```

**TC-MPF-IS-008：生效日期當日使用新版本**

```
Given: v2 effectiveDate = 2026-07-01
When:  計算 2026-07-01 當日供款
Then:  使用 v2 (effectiveDate <= date)
```

### 2.3 非日薪轉換

**TC-MPF-IS-009：週薪工人換算日薪後查表**

```
Given: 工人週薪 HK$5,000，當週工作 5 日
When:  計算行業計劃供款
Then:  平均日薪 = 5000 / 5 = 1000
       每日供款按 HK$1,000 查表 = HK$50
       週供款 employee = 5 × 50 = HK$250
```

---

## 3. MPF 一般僱員 (Master Trust) 測試

### 3.1 月薪供款

**TC-MPF-MT-001：月薪低於下限 HK$7,100 → 僱員免供**

```
Given: 月薪 HK$6,000
Then:  employee = 0
       employer = 6000 × 0.05 = 300
```

**TC-MPF-MT-002：月薪等於下限 HK$7,100 → 開始雙向供款**

```
Given: 月薪 HK$7,100
Then:  employee = 7100 × 0.05 = 355
       employer = 7100 × 0.05 = 355
```

**TC-MPF-MT-003：月薪在上下限之間**

```
Given: 月薪 HK$20,000
Then:  employee = 1000
       employer = 1000
```

**TC-MPF-MT-004：月薪達上限 HK$30,000**

```
Given: 月薪 HK$30,000
Then:  employee = 1500
       employer = 1500
```

**TC-MPF-MT-005：月薪超過上限 → 封頂 HK$1,500**

```
Given: 月薪 HK$50,000
Then:  employee = 1500 (封頂)
       employer = 1500 (封頂)
```

### 3.2 邊界精度

**TC-MPF-MT-006：月薪 HK$7,099.99 (差 1 分) → 僱員免供**

```
Given: 月薪 HK$7,099.99
Then:  employee = 0
       employer = 7099.99 × 0.05 = 354.9995 → 四捨五入至 354.99 或 355
       (必須用 Decimal，不可 round 後失去精度)
```

**TC-MPF-MT-007：計算結果需使用 banker's rounding**

```
Given: 月薪 HK$10,005 (× 5% = HK$500.25)
Then:  結果應為 HK$500.25 (2 位小數)
       若金額為 HK$500.255，用 banker's rounding 應為 HK$500.26
```

---

## 4. 60 日臨時僱員轉換測試

**TC-60D-001：受僱未滿 60 日 → 使用行業計劃**

```
Given: 工人 joinDate = 2026-03-01，asOfDate = 2026-04-20
Then:  受僱天數 = 50 < 60
       determineScheme = "industry"
```

**TC-60D-002：受僱滿 60 日當日 → 使用 Master Trust**

```
Given: joinDate = 2026-03-01，asOfDate = 2026-04-30
Then:  受僱天數 = 60 >= 60
       determineScheme = "master_trust"
```

**TC-60D-003：系統自動發出轉換提示**

```
Given: 工人受僱滿 60 日
When:  cron job 或 HR 登入 dashboard
Then:  顯示該工人需從 industry 轉 master_trust 的提示
       alerts API 返回此 worker
```

**TC-60D-004：跨月跨計劃的薪酬計算**

```
Given: 工人 joinDate = 2026-04-01
       計算 2026-04 薪酬（整月都是 industry）
       計算 2026-05 薪酬（整月都是 master trust）
Then:  4 月用 industry（按日查表）
       5 月用 master trust（5% of monthly）
       Payroll.mpfSchemeUsed 正確記錄
```

**TC-60D-005：離職工人重聘**

```
Given: 工人離職 2026-02，重新聘用 2026-05
Then:  joinDate 可選擇更新或保留
       業務決策：若重聘日期距離上次 < 某期間，可能視為延續
       (agent 需在 docs/assumptions.md 記錄採用方案)
```

---

## 5. 薪酬計算引擎測試

### 5.1 基本日薪

**TC-PAY-001：純日薪無加班**

```
Given: 工人日薪 HK$800
       當月出勤 22 日，全部 normal
Then:  basicWage = 22 × 800 = 17600
       overtimeWage = 0
       grossWage = 17600
```

**TC-PAY-002：有加班**

```
Given: 工人日薪 HK$800 (8 小時)
       當月出勤 22 日，每日 OT 2 小時，OT 係數 1.0
Then:  時薪 = 800 / 8 = 100
       OT 薪 = 22 × 2 × 100 × 1.0 = 4400
       basicWage = 17600
       overtimeWage = 4400
       grossWage = 22000
```

**TC-PAY-003：OT 係數 1.5**

```
Given: 同上但 OT 係數 1.5
Then:  overtimeWage = 22 × 2 × 100 × 1.5 = 6600
```

### 5.2 時薪計算

**TC-PAY-004：時薪工人**

```
Given: 工人時薪 HK$60
       當月總工時 180 小時
Then:  basicWage = 180 × 60 = 10800
       OT 另計
```

### 5.3 特殊日薪酬

**TC-PAY-005：法定假期 + 符合連續性合約 + 滿 3 個月**

```
Given: 工人已滿 3 個月 + contractActive
       當月有 1 日法定假期
Then:  holidayWage = 當日日薪
```

**TC-PAY-006：法定假期但不符合連續性合約**

```
Given: 工人未觸發連續性合約
       當月有 1 日法定假期
Then:  holidayWage = 0
```

**TC-PAY-007：法定假期但受僱不足 3 個月**

```
Given: 工人已觸發連續性合約但受僱 2 個月
       當月有 1 日法定假期
Then:  holidayWage = 0 (仍不符合資格)
```

**TC-PAY-008：颱風日按公司政策**

```
Given: SystemConfig.typhoon_policy = "full_day_pay"
       當月有 1 個颱風日
Then:  typhoonWage = 當日應得日薪
```

### 5.4 計算快照 (Audit Trail)

**TC-PAY-009：calculationSnapshot 必須保存當時法規參數**

```
When:  生成 Payroll
Then:  calculationSnapshot 包含 JSON：
       {
         "minWage": 42.10,
         "mpfMonthlyMin": 7100,
         "mpfMonthlyMax": 30000,
         "rulesetUsed": "468",
         "mpfSchemeUsed": "industry",
         "calculatedAt": ISO timestamp,
         "calculatedBy": userId
       }
```

**TC-PAY-010：已批核薪酬單不可重算**

```
Given: Payroll.status = "approved"
When:  呼叫 recalculate()
Then:  拋出錯誤，禁止修改
```

### 5.5 批量計算

**TC-PAY-011：300 工人批量月結 < 30 秒**

```
Given: 300 位工人 + 1 個月出勤資料
When:  呼叫 calculateBatch()
Then:  全部完成時間 < 30 秒
       全部結果正確
```

**TC-PAY-012：批量計算遇個別失敗不中斷**

```
Given: 300 工人，其中 1 位資料不完整
When:  呼叫 calculateBatch()
Then:  其餘 299 位正常計算
       錯誤工人標記 status = "error" 並記 log
       API response 顯示哪些失敗
```

---

## 6. 多分判商紀錄測試

**TC-MULTI-001：同工人同日為兩個分判商工作**

```
Given: 工人 A 在 2026-04-15 同時：
       - 為分判商 X 於地盤 S1 工作 4 小時
       - 為分判商 Y 於地盤 S2 工作 4 小時
When:  插入兩筆 Attendance
Then:  兩筆都成功插入（不違反 unique constraint）
       workerId × siteId × subcontractorId × date 唯一
```

**TC-MULTI-002：同工人同日同地盤同分判商兩次 → 報錯**

```
Given: 已存在一筆 (workerA, siteS1, subX, 2026-04-15)
When:  嘗試再插入同樣 key
Then:  資料庫拋出 unique constraint 錯誤
       API 返回 400 with clear message
```

**TC-MULTI-003：薪酬按分判商分開結算**

```
Given: 工人 A 在當月分別為 X (5 日) 和 Y (10 日) 工作
When:  生成分判商對賬單
Then:  X 對賬單：只含 A 的 5 日工時與薪酬
       Y 對賬單：只含 A 的 10 日工時與薪酬
```

**TC-MULTI-004：工時彙總跨分判商正確**

```
Given: 同 TC-MULTI-003
When:  計算工人 A 的 468 狀態
Then:  weekHours = 所有分判商工時加總
       不因多分判商而低估
```

---

## 7. Decimal 精度測試

**TC-DEC-001：金額運算不出現浮點誤差**

```
Given: dailyWage = 0.1, attendance 3 days
When:  basicWage = 0.1 + 0.1 + 0.1
Then:  basicWage === "0.30" (Decimal.toString())
       不可為 "0.30000000000000004"
```

**TC-DEC-002：Decimal × Decimal 結果精確**

```
Given: Decimal(100.05) × Decimal(0.05)
Then:  結果 = Decimal("5.0025")
       2 位小數保留為 5.00 (banker's rounding)
```

**TC-DEC-003：SQLite 儲存與讀回無精度損失**

```
Given: 存入 Decimal("1234.567")
When:  讀回
Then:  取得 Decimal("1234.567")
       不變為 1234.566999...
```

**TC-DEC-004：不可誤用 Number**

```
When:  靜態分析 (ESLint rule) 檢查
Then:  service 層金額運算禁止使用 Number 算術
       統一使用 Decimal 物件方法
```

---

## 8. 特殊日期處理測試

**TC-DATE-001：週起始日為週一**

```
Given: date = 2026-04-15 (週三)
When:  startOfWeek(date, { weekStartsOn: 1 })
Then:  = 2026-04-13 (週一)
```

**TC-DATE-002：跨年週的處理**

```
Given: 週跨越 2026-2027 年（2026-12-28 至 2027-01-03）
When:  計算 weekEndDate
Then:  weekEndDate = 2027-01-03
       正確計入該週的所有出勤（不論年份）
```

**TC-DATE-003：香港時區處理**

```
Given: 伺服器可能不同時區
Then:  所有日期運算使用香港時區 (Asia/Hong_Kong, UTC+8)
       資料庫儲存 ISO 8601 with timezone info
```

**TC-DATE-004：閏日 2024-02-29 處理**

```
Given: 包含 2024-02-29 的出勤
Then:  視為正常一日處理，無特殊邏輯
```

---

## 9. 報表生成測試

### 9.1 Excel 報表

**TC-RPT-EX-001：出勤明細表欄位正確**

```
Given: 日期區間 2026-04-01 至 2026-04-30
When:  生成 attendance_detail Excel
Then:  包含所有必要欄位（日期、工人編號、姓名、分判商、地盤、上班、下班、工時、OT、日薪、備註）
       首行為 bold + 深藍底 + 白字
       Freeze 首行
       最後一行為合計 SUM 公式
       貨幣欄位格式 #,##0.00
```

**TC-RPT-EX-002：分判商對賬單 per-subcontractor sheet**

```
Given: 選擇 3 家分判商
When:  生成 subcontractor_statement Excel
Then:  產生 3 個 sheet，每 sheet 對應一家
       sheet 名稱為分判商名稱（特殊字元已替換）
```

**TC-RPT-EX-003：大量資料 Excel 生成 < 60 秒**

```
Given: 10,000 筆出勤紀錄
When:  生成 Excel
Then:  完成時間 < 60 秒
       記憶體使用 < 500MB（避免 OOM）
```

### 9.2 PDF 報表

**TC-RPT-PDF-001：PDF 繁體中文正確顯示**

```
When:  生成個人工資單 PDF
Then:  繁體中文字符正確顯示（不是方塊或亂碼）
       字型：Noto Sans TC 或其他支援繁中的字型
       字型檔已 bundle 在專案
```

**TC-RPT-PDF-002：PDF 頁首頁尾**

```
Then:  頁首：公司名稱 / Logo (從 SystemConfig)
       頁尾：頁碼 (X/Y) + 生成時間
       A4 portrait 預設
```

**TC-RPT-PDF-003：工傷前 14 日紀錄 PDF**

```
Given: 事故日期 2026-04-15
When:  生成 injury_14days PDF for workerA
Then:  包含 2026-04-01 至 2026-04-15 的所有出勤
       即使某天無出勤也列出 (空行)
       格式符合勞工處要求
```

### 9.3 自訂日期篩選

**TC-RPT-FILTER-001：任意日期區間**

```
When:  HR 選擇 2026-02-15 至 2026-03-20
Then:  報表只包含該區間資料
       區間邊界日期 inclusive
```

**TC-RPT-FILTER-002：多重篩選組合**

```
When:  HR 選擇：日期 + 2 個地盤 + 3 個分判商 + 特定 5 位工人
Then:  結果為所有條件的 AND 組合
       篩選條件為空 = 全部
```

**TC-RPT-FILTER-003：預覽功能**

```
When:  點擊預覽（非下載）
Then:  API 返回 JSON 首 20 筆資料
       UI 以表格顯示
       下載按鈕仍可生成完整報表
```

---

## 10. API 整合測試

### 10.1 認證

**TC-API-AUTH-001：無 token 存取受保護端點 → 401**

```
GET /api/workers (無 Authorization header)
Expect: 401 Unauthorized
```

**TC-API-AUTH-002：過期 token → 401**

```
Given: JWT exp < now
GET /api/workers with expired token
Expect: 401 with message "Token expired"
```

**TC-API-AUTH-003：錯誤密碼 → 401 + 不洩漏細節**

```
POST /api/auth/login { username, wrong_password }
Expect: 401 "Invalid credentials"
       不得說 "username correct but password wrong"
```

**TC-API-AUTH-004：登入失敗 rate limit**

```
When:  同 IP 1 分鐘內失敗 5 次
Then:  第 6 次返回 429 Too Many Requests
       鎖定 15 分鐘
```

### 10.2 CRUD

**TC-API-CRUD-001：建立工人 - 成功**

```
POST /api/workers with valid body
Expect: 201 + workerId + audit log entry
```

**TC-API-CRUD-002：建立工人 - 重複 HKID**

```
POST /api/workers with existing hkidHash
Expect: 400 "該工人已存在"
```

**TC-API-CRUD-003：軟刪除工人**

```
DELETE /api/workers/:id
Expect: 200
       DB: status = "deleted"
       Physical row 仍存在（符合 7 年保留）
       後續 GET 不返回此工人 (除非明確 includeDeleted=true)
```

**TC-API-CRUD-004：批量出勤錄入 - 交易性**

```
POST /api/attendance/batch with 50 records, 1 invalid
Expect: 全部 rollback
       返回 400 with 哪筆有錯
       DB 無半邊 commit
```

### 10.3 審計日誌

**TC-API-AUDIT-001：所有 mutation 寫入 audit log**

```
When:  任何 POST/PUT/DELETE 成功
Then:  AuditLog 新增一筆
       包含 userId, action, entity, entityId, oldValue, newValue, ipAddress, timestamp
```

**TC-API-AUDIT-002：敏感查詢也記錄**

```
When:  GET /api/workers/:id/payrolls
Then:  記錄 action = "view", entity = "Payroll"
       (HR 查看薪酬屬敏感操作)
```

---

## 11. 性能測試

**TC-PERF-001：10 萬筆出勤紀錄查詢 < 1 秒**

```
Given: 100,000 attendance records
When:  GET /api/attendance?date=2026-04-15
Then:  response time < 1000ms
       使用 date index
```

**TC-PERF-002：連續性計算批量重跑 500 工人 < 5 分鐘**

```
Given: 500 workers, 1 year attendance each
When:  recalculateRange for all
Then:  完成時間 < 5 分鐘
```

**TC-PERF-003：記憶體不洩漏**

```
When:  連續 100 次報表生成
Then:  Node.js RSS 記憶體不應持續增長
       Playwright browser / context 正確關閉
```

**TC-PERF-004：資料庫大小可接受**

```
Given: 1 年完整資料（500 工人 × 250 工作日 × 可能多分判商）
Then:  SQLite 檔案 < 500MB
       查詢性能仍可接受
```

---

## 12. 安全測試

**TC-SEC-001：SQL Injection 防護**

```
POST /api/workers with name = "'; DROP TABLE Worker; --"
Expect: 正常儲存為字串，Worker table 無恙
```

**TC-SEC-002：XSS 防護**

```
Given: Worker.name 儲存 "<script>alert(1)</script>"
When:  前端渲染
Then:  以文字顯示，不執行 script
```

**TC-SEC-003：密碼使用 argon2id 雜湊**

```
When:  建立 User
Then:  passwordHash 以 "$argon2id$v=19$m=19456,t=2,p=1$" 格式儲存
       驗證時使用 argon2.verify(hash, plainPassword)
       參數：memoryCost=19456 (19 MiB), timeCost=2, parallelism=1
       (OWASP Password Storage Cheat Sheet minimum)
```

**TC-SEC-004：HKID 不以明文儲存**

```
When:  建立 Worker with hkid = "A1234567"
Then:  DB: hkidMasked = "A123***(7)"
       hkidHash = SHA-256 of normalized hkid
       無任何欄位包含 plain "A1234567"
```

**TC-SEC-005：JWT secret 不可為預設值**

```
When:  啟動 app with JWT_SECRET == "changeme" or undefined
Then:  拋出錯誤，拒絕啟動
```

**TC-SEC-006：權限控制 - viewer 不可修改**

```
Given: user.role = "viewer"
When:  POST /api/workers
Expect: 403 Forbidden
```

**TC-SEC-007：admin 操作 audit log 不可篡改**

```
When:  任何人嘗試 DELETE /api/audit/:id
Expect: 403 (沒有此 endpoint，或 always forbidden)
       Audit log 只能新增不能修改
```

---

## 測試覆蓋率目標

| 模組 | 覆蓋率目標 |
|------|----------|
| `continuity.service.ts` | 95%+ |
| `mpf.service.ts` | 95%+ |
| `payroll.service.ts` | 95%+ |
| `report.service.ts` | 80%+ |
| `auth.middleware.ts` | 90%+ |
| Controllers (overall) | 70%+ |
| Frontend components | 60%+ |
| **整體業務邏輯** | **≥ 90%** |

---

## 測試執行指令

```bash
# Backend unit tests
cd backend && npm run test

# Backend with coverage
cd backend && npm run test:coverage

# Integration tests (needs test DB)
cd backend && npm run test:integration

# Frontend
cd frontend && npm run test

# E2E (Playwright)
npm run test:e2e

# 全部測試
npm run test:all
```

---

## 測試資料 Fixtures

專案須包含以下 fixtures (`backend/tests/fixtures/`)：

1. `workers-sample.json` - 20 位不同類型工人
2. `attendance-6months.json` - 半年出勤資料（用於 468 驗證）
3. `mpf-rates-seed.json` - 行業計劃費率表
4. `holidays-2026.json` - 2026 年公眾假期
5. `expected-continuity.json` - 預期 468 計算結果（用於回歸測試）
6. `expected-payroll.json` - 預期薪酬計算結果

---

**備註：** agent 完成 Phase 4 (核心業務邏輯) 後，必須通過所有本章節 1-8 的測試才可進入 Phase 5。完成 Phase 5 後必須通過 9-10。最終交付前須通過全部 1-12。
