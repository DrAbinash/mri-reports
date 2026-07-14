-- MRI Report Manager — Database Schema
-- This file is used by docker-entrypoint.sh to create tables on first run.
-- Generated from Prisma schema — DO NOT EDIT MANUALLY.

CREATE TABLE IF NOT EXISTS "MriReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
    "patientId" TEXT,
    "patientAge" INTEGER,
    "patientGender" TEXT,
    "referringDoctor" TEXT,
    "studyDate" DATETIME,
    "accessionNumber" TEXT,
    "bodyRegion" TEXT NOT NULL,
    "studyType" TEXT NOT NULL,
    "modality" TEXT NOT NULL DEFAULT 'MRI',
    "scannerModel" TEXT,
    "fieldStrength" TEXT,
    "clinicalIndication" TEXT,
    "clinicalHistory" TEXT,
    "technique" TEXT,
    "comparison" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "contrastAdministered" BOOLEAN NOT NULL DEFAULT 0,
    "contrastAgent" TEXT,
    "contrastVolume" TEXT,
    "contrastRoute" TEXT,
    "reportStatus" TEXT NOT NULL DEFAULT 'Draft',
    "priority" TEXT NOT NULL DEFAULT 'Routine',
    "reportNumber" TEXT,
    "attachmentPath" TEXT,
    "attachmentName" TEXT,
    "fileSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "bodyRegion" TEXT NOT NULL,
    "description" TEXT,
    "technique" TEXT,
    "findings" TEXT,
    "impression" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "FindingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bodyRegion" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "HospitalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hospitalName" TEXT NOT NULL DEFAULT 'MRI Report Center',
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "radiologistName" TEXT,
    "radiologistQualification" TEXT,
    "radiologistRegNumber" TEXT,
    "accreditation" TEXT,
    "accreditationNumber" TEXT,
    "footerMessage" TEXT NOT NULL DEFAULT 'Thank you for choosing our services.',
    "reportHeaderColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "reportLayout" TEXT NOT NULL DEFAULT 'classic',
    "showTechnique" BOOLEAN NOT NULL DEFAULT 1,
    "showComparison" BOOLEAN NOT NULL DEFAULT 1,
    "showClinicalInfo" BOOLEAN NOT NULL DEFAULT 1,
    "showSignature" BOOLEAN NOT NULL DEFAULT 1,
    "showFooterMessage" BOOLEAN NOT NULL DEFAULT 1,
    "showAccreditation" BOOLEAN NOT NULL DEFAULT 1,
    "patientColumns" TEXT NOT NULL DEFAULT '3',
    "impressionStyle" TEXT NOT NULL DEFAULT 'bordered',
    "headerStyle" TEXT NOT NULL DEFAULT 'full',
    "orthancUrl" TEXT,
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "MriReport_patientName_idx" ON "MriReport"("patientName");
CREATE INDEX IF NOT EXISTS "MriReport_bodyRegion_idx" ON "MriReport"("bodyRegion");
CREATE INDEX IF NOT EXISTS "MriReport_studyDate_idx" ON "MriReport"("studyDate");
CREATE INDEX IF NOT EXISTS "MriReport_reportStatus_idx" ON "MriReport"("reportStatus");
CREATE INDEX IF NOT EXISTS "MriReport_accessionNumber_idx" ON "MriReport"("accessionNumber");
CREATE INDEX IF NOT EXISTS "FindingTemplate_bodyRegion_idx" ON "FindingTemplate"("bodyRegion");