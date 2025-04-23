/*
  Warnings:

  - Added the required column `creatorId` to the `Case` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CaseRole" AS ENUM ('STUDENT', 'PROFESSOR');

-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "creatorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CaseAccess" ADD COLUMN     "role" "CaseRole" NOT NULL DEFAULT 'STUDENT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canCreateCases" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AdminCaseAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminCaseAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminCaseAccess_userId_caseId_key" ON "AdminCaseAccess"("userId", "caseId");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCaseAccess" ADD CONSTRAINT "AdminCaseAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCaseAccess" ADD CONSTRAINT "AdminCaseAccess_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
