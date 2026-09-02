import { createMcpHandler } from "mcp-handler";
import { fetchAndSaveAllContests, getAllUngroupedContests } from "@/features/contests/services/ContestDBService";
import {
	MANAGE_CONTESTS_MCP_INSTRUCTIONS,
	registerManageContestsTools
} from "@/features/mcp/McpServer";
import { getAllProblems } from "@/features/problems/services/ProblemDBService";
import { fetchAndSaveProblemsByContestId } from "@/features/problems/services/ProblemService";
import { syncSharedContestGroup } from "@/features/shared-contests/services/GroupContestService";
import { writeRelatedTs } from "@/features/shared-contests/services/RelatedFileService";
import { getAllSharedContestGroupsWithDetails } from "@/features/shared-contests/services/SharedContestsDBService";

export const runtime = "nodejs";

const handler = createMcpHandler((server) => {
	registerManageContestsTools(server, {
		syncContests: () => fetchAndSaveAllContests(false),
		syncContestProblems: fetchAndSaveProblemsByContestId,
		syncSharedContestGroup,
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
	instructions: MANAGE_CONTESTS_MCP_INSTRUCTIONS,
	maxSubscriptions: 0
});

export { handler as GET, handler as POST };
