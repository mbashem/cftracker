/*
  Warnings:

  - The primary key for the `Contest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Contest` table. All the data in the column will be lost.
  - Added the required column `contestId` to the `Contest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_parentContestId_fkey";

-- AlterTable
ALTER TABLE "Contest" DROP CONSTRAINT "Contest_pkey",
DROP COLUMN "id",
ADD COLUMN     "contestId" INTEGER NOT NULL,
ADD CONSTRAINT "Contest_pkey" PRIMARY KEY ("contestId");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_parentContestId_fkey" FOREIGN KEY ("parentContestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;
