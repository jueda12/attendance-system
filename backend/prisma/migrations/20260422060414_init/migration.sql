-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerNo" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT,
    "hkidMasked" TEXT NOT NULL,
    "hkidHash" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "joinDate" DATETIME NOT NULL,
    "leaveDate" DATETIME,
    "subcontractorId" TEXT NOT NULL,
    "wageType" TEXT NOT NULL,
    "wageAmount" DECIMAL NOT NULL,
    "defaultDailyHours" DECIMAL NOT NULL DEFAULT 8,
    "otMultiplier" DECIMAL NOT NULL DEFAULT 1.0,
    "cwraNo" TEXT,
    "cwraExpiry" DATETIME,
    "greenCardNo" TEXT,
    "greenCardExpiry" DATETIME,
    "trades" TEXT,
    "bankName" TEXT,
    "bankAccountEnc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Worker_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT,
    "brNo" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "address" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "pmName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockIn" DATETIME,
    "clockOut" DATETIME,
    "lunchHours" DECIMAL NOT NULL DEFAULT 1.0,
    "workHours" DECIMAL NOT NULL,
    "overtimeHours" DECIMAL NOT NULL DEFAULT 0,
    "dayType" TEXT NOT NULL DEFAULT 'normal',
    "dailyWage" DECIMAL,
    "remarks" TEXT,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "Attendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContinuityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "weekHours" DECIMAL NOT NULL,
    "rolling4WeekHours" DECIMAL NOT NULL,
    "meets17hr" BOOLEAN NOT NULL,
    "meets18hr" BOOLEAN NOT NULL,
    "meets68hr" BOOLEAN NOT NULL,
    "meets468" BOOLEAN NOT NULL,
    "meets418" BOOLEAN NOT NULL,
    "rulesetUsed" TEXT NOT NULL,
    "continuousWeeks" INTEGER NOT NULL,
    "contractActive" BOOLEAN NOT NULL,
    "contractActiveDate" DATETIME,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT,
    CONSTRAINT "ContinuityLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "basicWage" DECIMAL NOT NULL,
    "overtimeWage" DECIMAL NOT NULL DEFAULT 0,
    "holidayWage" DECIMAL NOT NULL DEFAULT 0,
    "restdayWage" DECIMAL NOT NULL DEFAULT 0,
    "typhoonWage" DECIMAL NOT NULL DEFAULT 0,
    "leaveWage" DECIMAL NOT NULL DEFAULT 0,
    "otherEarnings" DECIMAL NOT NULL DEFAULT 0,
    "otherEarningsRemark" TEXT,
    "grossWage" DECIMAL NOT NULL,
    "mpfEmployee" DECIMAL NOT NULL DEFAULT 0,
    "mpfEmployer" DECIMAL NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL NOT NULL DEFAULT 0,
    "otherDeductionRemark" TEXT,
    "netWage" DECIMAL NOT NULL,
    "mpfSchemeUsed" TEXT NOT NULL,
    "calculationSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "paidAt" DATETIME,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payroll_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "leaveType" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL,
    "countsAsWorkHours" BOOLEAN NOT NULL DEFAULT false,
    "medicalCert" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LeaveRecord_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MpfIndustryRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effectiveDate" DATETIME NOT NULL,
    "dailyMinIncome" DECIMAL NOT NULL,
    "dailyMaxIncome" DECIMAL NOT NULL,
    "employeeAmount" DECIMAL NOT NULL,
    "employerAmount" DECIMAL NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT,
    "isStatutory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MinWageHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effectiveDate" DATETIME NOT NULL,
    "hourlyRate" DECIMAL NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "remarks" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "mustChangePwd" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Worker_workerNo_key" ON "Worker"("workerNo");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_hkidHash_key" ON "Worker"("hkidHash");

-- CreateIndex
CREATE INDEX "Worker_subcontractorId_idx" ON "Worker"("subcontractorId");

-- CreateIndex
CREATE INDEX "Worker_status_idx" ON "Worker"("status");

-- CreateIndex
CREATE INDEX "Worker_joinDate_idx" ON "Worker"("joinDate");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_code_key" ON "Subcontractor"("code");

-- CreateIndex
CREATE INDEX "Subcontractor_status_idx" ON "Subcontractor"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "Site_status_idx" ON "Site"("status");

-- CreateIndex
CREATE INDEX "Site_startDate_idx" ON "Site"("startDate");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_workerId_date_idx" ON "Attendance"("workerId", "date");

-- CreateIndex
CREATE INDEX "Attendance_siteId_date_idx" ON "Attendance"("siteId", "date");

-- CreateIndex
CREATE INDEX "Attendance_subcontractorId_date_idx" ON "Attendance"("subcontractorId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_workerId_siteId_subcontractorId_date_key" ON "Attendance"("workerId", "siteId", "subcontractorId", "date");

-- CreateIndex
CREATE INDEX "ContinuityLog_workerId_weekEndDate_idx" ON "ContinuityLog"("workerId", "weekEndDate");

-- CreateIndex
CREATE INDEX "ContinuityLog_contractActive_idx" ON "ContinuityLog"("contractActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContinuityLog_workerId_weekEndDate_key" ON "ContinuityLog"("workerId", "weekEndDate");

-- CreateIndex
CREATE INDEX "Payroll_periodStart_periodEnd_idx" ON "Payroll"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Payroll_status_idx" ON "Payroll"("status");

-- CreateIndex
CREATE INDEX "Payroll_workerId_periodEnd_idx" ON "Payroll"("workerId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_workerId_periodStart_periodEnd_key" ON "Payroll"("workerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "LeaveRecord_workerId_startDate_idx" ON "LeaveRecord"("workerId", "startDate");

-- CreateIndex
CREATE INDEX "LeaveRecord_leaveType_idx" ON "LeaveRecord"("leaveType");

-- CreateIndex
CREATE INDEX "MpfIndustryRate_effectiveDate_idx" ON "MpfIndustryRate"("effectiveDate");

-- CreateIndex
CREATE INDEX "MpfIndustryRate_effectiveDate_dailyMinIncome_idx" ON "MpfIndustryRate"("effectiveDate", "dailyMinIncome");

-- CreateIndex
CREATE UNIQUE INDEX "PublicHoliday_date_key" ON "PublicHoliday"("date");

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MinWageHistory_effectiveDate_key" ON "MinWageHistory"("effectiveDate");

-- CreateIndex
CREATE INDEX "MinWageHistory_effectiveDate_idx" ON "MinWageHistory"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
