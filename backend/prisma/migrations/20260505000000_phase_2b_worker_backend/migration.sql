-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerCode" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT,
    "hkidMasked" TEXT NOT NULL,
    "hkidHash" TEXT NOT NULL,
    "hkidEncrypted" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "joinDate" DATETIME NOT NULL,
    "leaveDate" DATETIME,
    "leaveReason" TEXT,
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
    "mpfScheme" TEXT NOT NULL DEFAULT 'industry',
    "mpfTrustee" TEXT,
    "mpfAccountNo" TEXT,
    "mpf60DayReviewed" BOOLEAN NOT NULL DEFAULT false,
    "mpf60DayReviewedAt" DATETIME,
    "mpf60DayDecision" TEXT,
    "mpfSchemeChangedAt" DATETIME,
    "bankName" TEXT,
    "bankAccountEnc" TEXT,
    "bankAccountMasked" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Worker_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Worker" (
    "id",
    "workerCode",
    "nameZh",
    "nameEn",
    "hkidMasked",
    "hkidHash",
    "hkidEncrypted",
    "phone",
    "address",
    "joinDate",
    "leaveDate",
    "subcontractorId",
    "wageType",
    "wageAmount",
    "defaultDailyHours",
    "otMultiplier",
    "cwraNo",
    "cwraExpiry",
    "greenCardNo",
    "greenCardExpiry",
    "trades",
    "bankName",
    "bankAccountEnc",
    "status",
    "remarks",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "workerNo",
    "nameZh",
    "nameEn",
    "hkidMasked",
    "hkidHash",
    'v1:migration-placeholder:migration-placeholder:migration-placeholder',
    "phone",
    "address",
    "joinDate",
    "leaveDate",
    "subcontractorId",
    "wageType",
    "wageAmount",
    "defaultDailyHours",
    "otMultiplier",
    "cwraNo",
    "cwraExpiry",
    "greenCardNo",
    "greenCardExpiry",
    "trades",
    "bankName",
    "bankAccountEnc",
    "status",
    "remarks",
    "createdAt",
    "updatedAt"
FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
CREATE UNIQUE INDEX "Worker_workerCode_key" ON "Worker"("workerCode");
CREATE INDEX "Worker_subcontractorId_idx" ON "Worker"("subcontractorId");
CREATE INDEX "Worker_subcontractorId_status_idx" ON "Worker"("subcontractorId", "status");
CREATE INDEX "Worker_hkidHash_idx" ON "Worker"("hkidHash");
CREATE INDEX "Worker_status_idx" ON "Worker"("status");
CREATE INDEX "Worker_joinDate_idx" ON "Worker"("joinDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
