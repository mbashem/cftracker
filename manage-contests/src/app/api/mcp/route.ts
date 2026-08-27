import { createMcpHandler } from "mcp-handler";
import { registerManageContestsTools } from "@/features/mcp/McpServer";

export const runtime = "nodejs";

const handler = createMcpHandler(registerManageContestsTools, {
	serverInfo: {
		name: "cftracker-manage-contests",
		version: "0.1.0"
	},
	maxSubscriptions: 0
});

export { handler as GET, handler as POST };
