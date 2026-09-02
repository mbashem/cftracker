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
	syncSharedContestGroup: (contestIds: number[]) => Promise<Result<{
		parentContestId: number;
		contestIds: number[];
		mappings: Array<{
			status: "created" | "unchanged";
			mapping: {
				contestId: number;
				parentContestId: number;
			};
		}>;
		synchronizedContests: Array<{
			contest: Contest;
			problemCount: number;
			problems: Problem[];
		}>;
		totalProblemCount: number;
	}>>;
	listUngroupedContests: () => Promise<Result<Contest[]>>;
	listProblems: () => Promise<Result<Problem[]>>;
	listSharedContestGroups: () => Promise<Result<SharedContestGroup[]>>;
	writeRelatedTs: (outputPath?: string) => Promise<Result<{
		outputPath: string;
		relatedProblemCount: number;
	}>>;
};

export const MANAGE_CONTESTS_MCP_INSTRUCTIONS = `Use this server to process a newly concluded shared Codeforces contest or resume that workflow in the same conversation.

Call tools sequentially, never in parallel. A notification that a contest concluded starts discovery but is not confirmation to create a group. First call sync_contests, then list_ungrouped_contests. Identify exactly one plausible candidate group from those ungrouped contests. Treat an operator-supplied name as the strongest anchor, compare common event/name stems and complementary division or round labels, and use nearby IDs only as supporting evidence. One contest is a valid group. If exactly one group cannot be selected confidently, ask for the contest name or IDs; do not propose multiple groups for one confirmation.

Present one non-empty contestIds array with IDs and names sorted ascending, state that the smallest ID will be the parent, and ask the operator to confirm that every listed contest belongs to the same group. Never call sync_shared_contest_group before confirmation. After confirmation, call sync_shared_contest_group once with that exact array, then call write_related_ts, using its default path unless the operator supplied a path. The composite tool owns mapping order, two-second waits, and serial problem synchronization; do not reproduce those operations with the standalone sync_contest_problems tool.

Stop immediately after the first tool error and do not run later steps. Keep the confirmed contestIds and the first incomplete tool in the conversation. On same-conversation resume, repeat sync_shared_contest_group with the same array if it failed or was uncertain, or retry only write_related_ts if group synchronization completed. Ask for confirmation again only if the array changed.`;

const emptyInputSchema = z.object({}).strict();
const contestIdSchema = z.number().int().positive();
const confirmedContestIdsSchema = z.array(contestIdSchema)
	.min(1)
	.refine(
		(contestIds) => new Set(contestIds).size === contestIds.length,
		{ message: "contestIds must not contain duplicates" }
	)
	.describe("One or more unique, operator-confirmed contest IDs belonging to exactly one shared group");

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
		"sync_shared_contest_group",
		{
			title: "Sync shared contest group",
			description: "Create one operator-confirmed shared-contest group from one or more contest IDs, using the smallest ID as parent, then wait two seconds before fetching and saving each contest's problems serially.",
			inputSchema: z.object({
				contestIds: confirmedContestIdsSchema
			}).strict(),
			outputSchema: z.object({
				parentContestId: contestIdSchema,
				contestIds: z.array(contestIdSchema).min(1),
				mappings: z.array(z.object({
					status: z.enum(["created", "unchanged"]),
					mapping: sharedContestMappingSchema
				})),
				synchronizedContests: z.array(z.object({
					contest: contestSchema,
					problemCount: z.number().int().nonnegative(),
					problems: z.array(problemSchema)
				})),
				totalProblemCount: z.number().int().nonnegative()
			}),
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
				openWorldHint: true
			}
		},
		async ({ contestIds }) => {
			return runTool(
				"sync_shared_contest_group",
				() => dependencies.syncSharedContestGroup(contestIds),
				(output) => {
					return {
						content: [{
							type: "text" as const,
							text: `Synchronized shared group ${output.parentContestId} with ${output.contestIds.length} contest${output.contestIds.length === 1 ? "" : "s"} and ${output.totalProblemCount} problems.`
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
