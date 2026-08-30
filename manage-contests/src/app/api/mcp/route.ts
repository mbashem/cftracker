import { createMcpHandler } from "mcp-handler";
import { fetchAndSaveAllContests, getAllUngroupedContests } from "@/features/contests/services/ContestDBService";
import { registerManageContestsTools } from "@/features/mcp/McpServer";
import { getAllProblems } from "@/features/problems/services/ProblemDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { writeRelatedTs } from "@/features/shared-contests/services/RelatedFileService";
import {
	createOrUpdateSharedContest,
	getAllSharedContestGroupsWithDetails
} from "@/features/shared-contests/services/SharedContestsDBService";

export const runtime = "nodejs";

const handler = createMcpHandler((server) => {
	registerManageContestsTools(server, {
		syncContests: () => fetchAndSaveAllContests(false),
		syncContestProblems: fetchAndSaveProblemsByContestId,
		linkContestToSharedParent: createOrUpdateSharedContest,
		listUngroupedContests: getAllUngroupedContests,
		listProblems: getAllProblems,
		listSharedContestGroups: getAllSharedContestGroupsWithDetails,
		writeRelatedTs
	});
}, {
	serverInfo: {
		name: "cftracker-manage-contests",
		version: "0.1.0"
	},
	maxSubscriptions: 0
});

export { handler as GET, handler as POST };
