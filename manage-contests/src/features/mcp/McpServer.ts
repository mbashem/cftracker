import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { isError } from "@/utils/result";
import type { AppError, Result } from "@/utils/result";

type Contest = {
	contestId: number;
	name: string;
};

type Problem = {
	contestId: number;
	index: string;
	name: string;
	rating: number | null;
};

type SharedContestGroup = {
	parentContestId: number;
	parentContest: Contest;
	contests: Array<Contest & { problems: Problem[] }>;
};

export type ManageContestsMcpDependencies = {
	syncContests: () => Promise<Result<Contest[]>>;
	syncContestProblems: (contestId: number) => Promise<Result<{
		insertedContest: Contest;
		problemsList: Problem[];
	}>>;
	linkContestToSharedParent: (contestId: number, parentContestId: number) => Promise<Result<{
		status: "created" | "unchanged";
		mapping: {
			contestId: number;
			parentContestId: number;
		};
	}>>;
	listUngroupedContests: () => Promise<Result<Contest[]>>;
	listProblems: () => Promise<Result<Problem[]>>;
	listSharedContestGroups: () => Promise<Result<SharedContestGroup[]>>;
	writeRelatedTs: (outputPath?: string) => Promise<Result<{
		outputPath: string;
		relatedProblemCount: number;
	}>>;
};

const emptyInputSchema = z.object({}).strict();
const contestIdSchema = z.number().int().positive();

const contestSchema = z.object({
	contestId: contestIdSchema,
	name: z.string()
});

const problemSchema = z.object({
	contestId: contestIdSchema,
	index: z.string(),
	name: z.string(),
	rating: z.number().int().nullable()
});

const sharedContestMappingSchema = z.object({
	contestId: contestIdSchema,
	parentContestId: contestIdSchema
});

const sharedContestGroupSchema = z.object({
	parentContestId: contestIdSchema,
	parentContest: contestSchema,
	contests: z.array(contestSchema.extend({
		problems: z.array(problemSchema)
	}))
});

function toolError(error: AppError): CallToolResult {
	return {
		content: [{
			type: "text",
			text: JSON.stringify({
				code: error.code,
				message: error.publicMessage,
				retryable: error.retryable
			})
		}],
		isError: true
	};
}

async function runTool<T>(
	toolName: string,
	operation: () => Promise<Result<T>>,
	onSuccess: (value: T) => CallToolResult
): Promise<CallToolResult> {
	try {
		const result = await operation();
		if (isError(result)) return toolError(result.error);

		return onSuccess(result.value);
	} catch (cause) {
		console.error("Unexpected MCP tool failure", { toolName, cause });
		return toolError({
			code: "INTERNAL_ERROR",
			publicMessage: "An unexpected internal error occurred",
			retryable: false
		});
	}
}

export function registerManageContestsTools(
	server: McpServer,
	dependencies: ManageContestsMcpDependencies
) {
	server.registerTool(
		"sync_contests",
		{
			title: "Sync Codeforces contests",
			description: "Fetch every non-gym contest from Codeforces and upsert it into the local contest database. Returns every synchronized contest in ascending contest ID order.",
			inputSchema: emptyInputSchema,
			outputSchema: z.object({
				syncedCount: z.number().int().nonnegative(),
				contests: z.array(contestSchema)
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: true
			}
		},
		async () => {
			return runTool(
				"sync_contests",
				dependencies.syncContests,
				(synchronizedContests) => {
					const contests = synchronizedContests
						.toSorted((left, right) => left.contestId - right.contestId);
				const output = {
					syncedCount: contests.length,
					contests
				};

				return {
					content: [{
						type: "text" as const,
						text: `Synchronized ${contests.length} contests from Codeforces.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"sync_contest_problems",
		{
			title: "Sync contest problems",
			description: "Fetch one Codeforces contest and its problems, then upsert the contest and all returned problems into the local database.",
			inputSchema: z.object({
				contestId: contestIdSchema.describe("Numeric Codeforces contest ID")
			}).strict(),
			outputSchema: z.object({
				contest: contestSchema,
				problemCount: z.number().int().nonnegative(),
				problems: z.array(problemSchema)
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: true
			}
		},
		async ({ contestId }) => {
			return runTool(
				"sync_contest_problems",
				() => dependencies.syncContestProblems(contestId),
				({ insertedContest, problemsList }) => {
				const problems = problemsList.toSorted((left, right) => {
					if (left.index === right.index) return 0;
					return left.index < right.index ? -1 : 1;
				});
				const output = {
					contest: insertedContest,
					problemCount: problems.length,
					problems
				};

				return {
					content: [{
						type: "text" as const,
						text: `Synchronized ${problems.length} problems for contest ${contestId}.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"link_contest_to_shared_parent",
		{
			title: "Link contest to shared parent",
			description: "Create one directional shared-contest mapping. The parent ID must not exceed the contest ID, a parent must be linked to itself before its children, identical calls are unchanged, and an existing mapping is never reassigned.",
			inputSchema: z.object({
				parentContestId: contestIdSchema.describe("Smallest confirmed contest ID and shared-group parent"),
				contestId: contestIdSchema.describe("Contest to link, including the parent itself on the first call")
			}).strict(),
			outputSchema: z.object({
				status: z.enum(["created", "unchanged"]),
				mapping: sharedContestMappingSchema
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ parentContestId, contestId }) => {
			return runTool(
				"link_contest_to_shared_parent",
				() => dependencies.linkContestToSharedParent(contestId, parentContestId),
				(output) => {
				return {
					content: [{
						type: "text" as const,
						text: output.status === "created"
							? `Linked contest ${contestId} to shared parent ${parentContestId}.`
							: `Contest ${contestId} was already linked to shared parent ${parentContestId}.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"list_ungrouped_contests",
		{
			title: "List ungrouped contests",
			description: "Return every contest in the local database that has no shared-contest mapping, ordered by contest ID.",
			inputSchema: emptyInputSchema,
			outputSchema: z.object({
				count: z.number().int().nonnegative(),
				contests: z.array(contestSchema)
			}),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => {
			return runTool(
				"list_ungrouped_contests",
				dependencies.listUngroupedContests,
				(contests) => {
				const output = {
					count: contests.length,
					contests
				};

				return {
					content: [{
						type: "text" as const,
						text: `Found ${contests.length} ungrouped contests.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"list_problems",
		{
			title: "List problems",
			description: "Return every problem in the local database, ordered by contest ID and problem index.",
			inputSchema: emptyInputSchema,
			outputSchema: z.object({
				count: z.number().int().nonnegative(),
				problems: z.array(problemSchema)
			}),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => {
			return runTool(
				"list_problems",
				dependencies.listProblems,
				(problems) => {
				const output = {
					count: problems.length,
					problems
				};

				return {
					content: [{
						type: "text" as const,
						text: `Found ${problems.length} problems.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"list_shared_contest_groups",
		{
			title: "List shared contest groups",
			description: "Return every shared-contest group from the local database with parent metadata, member contests, and each member's problems. Results are ordered by parent and contest ID.",
			inputSchema: emptyInputSchema,
			outputSchema: z.object({
				groupCount: z.number().int().nonnegative(),
				groups: z.array(sharedContestGroupSchema)
			}),
			annotations: {
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async () => {
			return runTool(
				"list_shared_contest_groups",
				dependencies.listSharedContestGroups,
				(groups) => {
				const output = {
					groupCount: groups.length,
					groups
				};

				return {
					content: [{
						type: "text" as const,
						text: `Found ${groups.length} shared contest groups.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);

	server.registerTool(
		"write_related_ts",
		{
			title: "Write related.ts",
			description: "Generate related-problem data and write it to the default related.ts path or the path provided by the caller.",
			inputSchema: z.object({
				outputPath: z.string().min(1).optional().describe("Optional output path; relative paths are resolved from the server's current directory")
			}).strict(),
			outputSchema: z.object({
				outputPath: z.string(),
				relatedProblemCount: z.number().int().nonnegative()
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: false
			}
		},
		async ({ outputPath }) => {
			return runTool(
				"write_related_ts",
				() => dependencies.writeRelatedTs(outputPath),
				(output) => {
				return {
					content: [{
						type: "text" as const,
						text: `related.ts written to ${output.outputPath} with ${output.relatedProblemCount} related problem records.`
					}],
					structuredContent: output
				};
				}
			);
		}
	);
}
