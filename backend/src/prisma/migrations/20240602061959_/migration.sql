-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_contestId_fkey";

-- DropForeignKey
ALTER TABLE "SharedContest" DROP CONSTRAINT "SharedContest_parentContestId_fkey";

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedContest" ADD CONSTRAINT "SharedContest_parentContestId_fkey" FOREIGN KEY ("parentContestId") REFERENCES "Contest"("contestId") ON DELETE RESTRICT ON UPDATE CASCADE;
