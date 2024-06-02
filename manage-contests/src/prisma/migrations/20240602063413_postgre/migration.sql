/*
  Warnings:

  - You are about to drop the column `contestId` on the `Contest` table. All the data in the column will be lost.
  - The primary key for the `Problem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Problem` table. All the data in the column will be lost.
  - The primary key for the `SharedContest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `SharedContest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_parentContestId_fkey";

-- DropIndex
DROP INDEX "Contest_contestId_key";

-- DropIndex
DROP INDEX "Problem_contestId_index_key";

-- AlterTable
ALTER TABLE "Contest" DROP COLUMN "contestId",
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Contest_id_seq";

-- AlterTable
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Problem_pkey" PRIMARY KEY ("contestId", "index");

-- AlterTable
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "SharedContest_pkey" PRIMARY KEY ("contestId", "parentContestId");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_parentContestId_fkey" FOREIGN KEY ("parentContestId") REFERENCES "Contest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
