import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createMcpHandler } from "mcp-handler";
import {
	MANAGE_CONTESTS_MCP_INSTRUCTIONS,
	registerManageContestsTools,
	type ManageContestsMcpDependencies
} from "../../src/features/mcp/McpServer";
import {
	SHARED_CONTEST_PROBLEM_SYNC_DELAY_MS,
	syncSharedContestGroup
} from "../../src/features/shared-contests/services/GroupContestService";
import { writeRelatedTsFile } from "../../src/features/shared-contests/services/RelatedFileService";
import { err, isError, ok, type AppError } from "../../src/utils/result";

const toolNames = [
	"sync_contests",
	"sync_contest_problems",
	"sync_shared_contest_group",
	"list_ungrouped_contests",
	"list_problems",
	"list_shared_contest_groups",
	"write_related_ts"
] as const;

type ToolName = typeof toolNames[number];

type GroupOperation =
	| Readonly<{ operation: "link"; contestId: number; parentContestId: number }>
	| Readonly<{ operation: "wait"; milliseconds: number }>
	| Readonly<{ operation: "syncProblems"; contestId: number }>;

type GroupFailure = Readonly<{
	operation: "link" | "syncProblems";
	contestId: number;
	error: AppError;
}>;

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

type InspectorResult = {
	result: Record<string, unknown>;
};

type InspectorInvocation = {
	exitCode: number;
	stdout: string;
	stderr: string;
	json?: InspectorResult;
};

const synchronizedContests: Contest[] = [
	{ contestId: 202, name: "Codeforces Round 202" },
	{ contestId: 103, name: "Codeforces Round 103" },
	{ contestId: 101, name: "Codeforces Round 101" },
	{ contestId: 201, name: "Codeforces Round 201" },
	{ contestId: 102, name: "Codeforces Round 102" }
];

const synchronizedProblems = new Map<number, Problem[]>([
	[101, [
		{ contestId: 101, index: "B", name: "First B", rating: 1000 },
		{ contestId: 101, index: "A", name: "First A", rating: 800 }
	]],
	[102, [
		{ contestId: 102, index: "C", name: "Second C", rating: 1200 },
		{ contestId: 102, index: "A", name: "Second A", rating: 900 }
	]],
	[103, [{ contestId: 103, index: "A", name: "Third A", rating: null }]],
	[201, [
		{ contestId: 201, index: "B", name: "Fourth B", rating: 1100 },
		{ contestId: 201, index: "A", name: "Fourth A", rating: 800 }
	]],
	[202, [{ contestId: 202, index: "A", name: "Fifth A", rating: 900 }]]
]);

function compareContests(left: Contest, right: Contest) {
	return left.contestId - right.contestId;
}

function compareProblems(left: Problem, right: Problem) {
	if (left.contestId !== right.contestId) return left.contestId - right.contestId;
	return left.index.localeCompare(right.index);
}

class FakeManageContestsServices {
	readonly contests = new Map<number, Contest>();
	readonly problems = new Map<string, Problem>();
	readonly mappings = new Map<number, number>();
	readonly groupOperations: GroupOperation[] = [];
	readonly calls: Record<ToolName, number> = {
		sync_contests: 0,
		sync_contest_problems: 0,
		sync_shared_contest_group: 0,
		list_ungrouped_contests: 0,
		list_problems: 0,
		list_shared_contest_groups: 0,
		write_related_ts: 0
	};
	writtenOutputPath?: string;
	nextError?: AppError;
	nextThrow = false;
	groupFailure?: GroupFailure;

	private startCall(toolName: ToolName) {
		this.calls[toolName] += 1;

		if (this.nextThrow) {
			this.nextThrow = false;
			throw new Error("Unexpected fake service failure");
		}

		if (this.nextError) {
			const error = this.nextError;
			this.nextError = undefined;
			return err(error);
		}

		return undefined;
	}

	private takeGroupFailure(operation: GroupFailure["operation"], contestId: number) {
		if (
			this.groupFailure?.operation !== operation
			|| this.groupFailure.contestId !== contestId
		) {
			return undefined;
		}

		const error = this.groupFailure.error;
		this.groupFailure = undefined;
		return err(error);
	}

	private readonly saveContestProblems = async (contestId: number) => {
		const contest = this.contests.get(contestId);
		const problems = synchronizedProblems.get(contestId);
		if (!contest || !problems) {
			return err({
				code: "CONTEST_NOT_FOUND",
				publicMessage: `Contest not found: ${contestId}`,
				retryable: false
			});
		}

		for (const problem of problems) {
			this.problems.set(`${problem.contestId}-${problem.index}`, problem);
		}
		return ok({ insertedContest: contest, problemsList: [...problems] });
	};

	private readonly linkGroupContest = async (contestId: number, parentContestId: number) => {
		this.groupOperations.push({ operation: "link", contestId, parentContestId });
		const configuredFailure = this.takeGroupFailure("link", contestId);
		if (configuredFailure) return configuredFailure;

		if (!this.contests.has(contestId) || !this.contests.has(parentContestId)) {
			return err({
				code: "CONTEST_NOT_FOUND",
				publicMessage: "Contest not found",
				retryable: false
			});
		}
		if (parentContestId > contestId) {
			return err({
				code: "INVALID_PARENT_ORDER",
				publicMessage: `Parent contest ${parentContestId} cannot be greater than contest ${contestId}`,
				retryable: false
			});
		}
		if (contestId !== parentContestId && this.mappings.get(parentContestId) !== parentContestId) {
			return err({
				code: "PARENT_NOT_INITIALIZED",
				publicMessage: `Parent contest ${parentContestId} must be linked to itself first`,
				retryable: false
			});
		}

		const existingParent = this.mappings.get(contestId);
		if (existingParent !== undefined && existingParent !== parentContestId) {
			return err({
				code: "MAPPING_CONFLICT",
				publicMessage: `Contest ${contestId} is already linked to parent ${existingParent}`,
				retryable: false
			});
		}

		this.mappings.set(contestId, parentContestId);
		return ok({
			status: existingParent === parentContestId ? "unchanged" as const : "created" as const,
			mapping: { contestId, parentContestId }
		});
	};

	private readonly syncGroupContestProblems = async (contestId: number) => {
		this.groupOperations.push({ operation: "syncProblems", contestId });
		const configuredFailure = this.takeGroupFailure("syncProblems", contestId);
		if (configuredFailure) return configuredFailure;

		return this.saveContestProblems(contestId);
	};

	private readonly waitForGroupContest = async (milliseconds: number) => {
		this.groupOperations.push({ operation: "wait", milliseconds });
	};

	readonly dependencies: ManageContestsMcpDependencies = {
		syncContests: async () => {
			const failure = this.startCall("sync_contests");
			if (failure) return failure;

			for (const contest of synchronizedContests) {
				this.contests.set(contest.contestId, contest);
			}
			return ok([...synchronizedContests]);
		},
		syncContestProblems: async (contestId) => {
			const failure = this.startCall("sync_contest_problems");
			if (failure) return failure;

			return this.saveContestProblems(contestId);
		},
		syncSharedContestGroup: async (contestIds) => {
			const failure = this.startCall("sync_shared_contest_group");
			if (failure) return failure;

			return syncSharedContestGroup(contestIds, {
				linkContest: this.linkGroupContest,
				syncContestProblems: this.syncGroupContestProblems,
				wait: this.waitForGroupContest
			});
		},
		listUngroupedContests: async () => {
			const failure = this.startCall("list_ungrouped_contests");
			if (failure) return failure;

			return ok([...this.contests.values()]
				.filter((contest) => !this.mappings.has(contest.contestId))
				.toSorted(compareContests));
		},
		listProblems: async () => {
			const failure = this.startCall("list_problems");
			if (failure) return failure;

			return ok([...this.problems.values()].toSorted(compareProblems));
		},
		listSharedContestGroups: async () => {
			const failure = this.startCall("list_shared_contest_groups");
			if (failure) return failure;

			const parentIds = [...new Set(this.mappings.values())].toSorted((left, right) => left - right);
			return ok(parentIds.map((parentContestId) => ({
				parentContestId,
				parentContest: this.contests.get(parentContestId)!,
				contests: [...this.mappings.entries()]
					.filter(([, parentId]) => parentId === parentContestId)
					.map(([contestId]) => ({
						...this.contests.get(contestId)!,
						problems: [...this.problems.values()]
							.filter((problem) => problem.contestId === contestId)
							.toSorted(compareProblems)
					}))
					.toSorted(compareContests)
			})));
		},
		writeRelatedTs: async (outputPath) => {
			const failure = this.startCall("write_related_ts");
			if (failure) return failure;

			this.writtenOutputPath = outputPath ?? "../src/data/saved_api/related.ts";
			return ok({
				outputPath: this.writtenOutputPath,
				relatedProblemCount: this.problems.size
			});
		}
	};
}

type JsonSchema = Record<string, unknown>;

const jsonSchemaUrl = "https://json-schema.org/draft/2020-12/schema";
const positiveIntegerSchema = {
	type: "integer",
	exclusiveMinimum: 0,
	maximum: Number.MAX_SAFE_INTEGER
};
const nonnegativeIntegerSchema = {
	type: "integer",
	minimum: 0,
	maximum: Number.MAX_SAFE_INTEGER
};
const nullableIntegerSchema = {
	anyOf: [
		{ type: "integer", minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER },
		{ type: "null" }
	]
};

function objectSchema(
	properties: Record<string, unknown>,
	required = Object.keys(properties)
): JsonSchema {
	return {
		type: "object",
		properties,
		...(required.length ? { required } : {}),
		additionalProperties: false
	};
}

function rootObjectSchema(
	properties: Record<string, unknown>,
	required = Object.keys(properties)
): JsonSchema {
	return {
		...objectSchema(properties, required),
		$schema: jsonSchemaUrl
	};
}

const contestSchema = objectSchema({
	contestId: positiveIntegerSchema,
	name: { type: "string" }
});
const problemSchema = objectSchema({
	contestId: positiveIntegerSchema,
	index: { type: "string" },
	name: { type: "string" },
	rating: nullableIntegerSchema
});
const sharedContestMappingSchema = objectSchema({
	contestId: positiveIntegerSchema,
	parentContestId: positiveIntegerSchema
});
const emptyInputSchema = rootObjectSchema({}, []);

const expectedTools = [
	{
		name: "sync_contests",
		title: "Sync Codeforces contests",
		description: "Fetch every non-gym contest from Codeforces and upsert it into the local contest database. Returns every synchronized contest in ascending contest ID order.",
		inputSchema: emptyInputSchema,
		outputSchema: rootObjectSchema({
			syncedCount: nonnegativeIntegerSchema,
			contests: { type: "array", items: contestSchema }
		}),
		annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
	},
	{
		name: "sync_contest_problems",
		title: "Sync contest problems",
		description: "Fetch one Codeforces contest and its problems, then upsert the contest and all returned problems into the local database.",
		inputSchema: rootObjectSchema({
			contestId: { ...positiveIntegerSchema, description: "Numeric Codeforces contest ID" }
		}),
		outputSchema: rootObjectSchema({
			contest: contestSchema,
			problemCount: nonnegativeIntegerSchema,
			problems: { type: "array", items: problemSchema }
		}),
		annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
	},
	{
		name: "sync_shared_contest_group",
		title: "Sync shared contest group",
		description: "Create one operator-confirmed shared-contest group from one or more contest IDs, using the smallest ID as parent, then wait two seconds before fetching and saving each contest's problems serially.",
		inputSchema: rootObjectSchema({
			contestIds: {
				description: "One or more unique, operator-confirmed contest IDs belonging to exactly one shared group",
				type: "array",
				items: positiveIntegerSchema,
				minItems: 1
			}
		}),
		outputSchema: rootObjectSchema({
			parentContestId: positiveIntegerSchema,
			contestIds: {
				type: "array",
				items: positiveIntegerSchema,
				minItems: 1
			},
			mappings: {
				type: "array",
				items: objectSchema({
					status: { type: "string", enum: ["created", "unchanged"] },
					mapping: sharedContestMappingSchema
				})
			},
			synchronizedContests: {
				type: "array",
				items: objectSchema({
					contest: contestSchema,
					problemCount: nonnegativeIntegerSchema,
					problems: { type: "array", items: problemSchema }
				})
			},
			totalProblemCount: nonnegativeIntegerSchema
		}),
		annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
	},
	{
		name: "list_ungrouped_contests",
		title: "List ungrouped contests",
		description: "Return every contest in the local database that has no shared-contest mapping, ordered by contest ID.",
		inputSchema: emptyInputSchema,
		outputSchema: rootObjectSchema({
			count: nonnegativeIntegerSchema,
			contests: { type: "array", items: contestSchema }
		}),
		annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
	},
	{
		name: "list_problems",
		title: "List problems",
		description: "Return every problem in the local database, ordered by contest ID and problem index.",
		inputSchema: emptyInputSchema,
		outputSchema: rootObjectSchema({
			count: nonnegativeIntegerSchema,
			problems: { type: "array", items: problemSchema }
		}),
		annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
	},
	{
		name: "list_shared_contest_groups",
		title: "List shared contest groups",
		description: "Return every shared-contest group from the local database with parent metadata, member contests, and each member's problems. Results are ordered by parent and contest ID.",
		inputSchema: emptyInputSchema,
		outputSchema: rootObjectSchema({
			groupCount: nonnegativeIntegerSchema,
			groups: {
				type: "array",
				items: objectSchema({
					parentContestId: positiveIntegerSchema,
					parentContest: contestSchema,
					contests: {
						type: "array",
						items: objectSchema({
							contestId: positiveIntegerSchema,
							name: { type: "string" },
							problems: { type: "array", items: problemSchema }
						})
					}
				})
			}
		}),
		annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
	},
	{
		name: "write_related_ts",
		title: "Write related.ts",
		description: "Generate related-problem data and write it to the default related.ts path or the path provided by the caller.",
		inputSchema: rootObjectSchema({
			outputPath: {
				description: "Optional output path; relative paths are resolved from the server's current directory",
				type: "string",
				minLength: 1
			}
		}, []),
		outputSchema: rootObjectSchema({
			outputPath: { type: "string" },
			relatedProblemCount: nonnegativeIntegerSchema
		}),
		annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
	}
];

async function requestBody(request: IncomingMessage): Promise<string | undefined> {
	if (request.method === "GET" || request.method === "HEAD") return undefined;

	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

async function serveWebResponse(response: Response, target: ServerResponse) {
	target.statusCode = response.status;
	response.headers.forEach((value, name) => target.setHeader(name, value));
	target.end(Buffer.from(await response.arrayBuffer()));
}

async function startTestServer(dependencies: ManageContestsMcpDependencies) {
	const handler = createMcpHandler((server) => {
		registerManageContestsTools(server, dependencies);
	}, {
		serverInfo: {
			name: "cftracker-manage-contests",
			version: "0.1.0"
		},
		instructions: MANAGE_CONTESTS_MCP_INSTRUCTIONS,
		maxSubscriptions: 0
	});

	const server = createServer(async (request, response) => {
		try {
			const host = request.headers.host ?? "127.0.0.1";
			const body = await requestBody(request);
			const init: RequestInit & { duplex?: "half" } = {
				method: request.method,
				headers: request.headers as HeadersInit,
				body,
				...(body ? { duplex: "half" as const } : {})
			};
			const webRequest = new Request(`http://${host}${request.url ?? "/api/mcp"}`, init);
			await serveWebResponse(await handler(webRequest), response);
		} catch (cause) {
			response.statusCode = 500;
			response.end(cause instanceof Error ? cause.message : String(cause));
		}
	});

	await new Promise<void>((resolveListening, rejectListening) => {
		server.once("error", rejectListening);
		server.listen(0, "127.0.0.1", resolveListening);
	});

	const address = server.address() as AddressInfo;
	return {
		url: `http://127.0.0.1:${address.port}/api/mcp`,
		close: () => new Promise<void>((resolveClose, rejectClose) => {
			server.close((error) => error ? rejectClose(error) : resolveClose());
		})
	};
}

async function runInspector(
	serverUrl: string,
	method: "initialize" | "tools/list" | "tools/call",
	options: { toolName?: ToolName; toolArguments?: Record<string, unknown>; expectedExitCode?: number } = {}
): Promise<InspectorInvocation> {
	const inspectorPath = resolve("node_modules/.bin/mcp-inspector");
	const argumentsList = [
		"--cli",
		serverUrl,
		"--transport", "http",
		"--method", method,
		"--format", "json"
	];
	if (options.toolName) argumentsList.push("--tool-name", options.toolName);
	if (options.toolArguments) {
		argumentsList.push("--tool-args-json", JSON.stringify(options.toolArguments));
	}

	const invocation = await new Promise<InspectorInvocation>((resolveInvocation, rejectInvocation) => {
		const child = spawn(inspectorPath, argumentsList, {
			cwd: process.cwd(),
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"]
		});
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => stdout += chunk);
		child.stderr.on("data", (chunk: string) => stderr += chunk);
		child.once("error", rejectInvocation);
		child.once("close", (exitCode) => {
			const trimmedOutput = stdout.trim();
			resolveInvocation({
				exitCode: exitCode ?? 1,
				stdout,
				stderr,
				...(trimmedOutput ? { json: JSON.parse(trimmedOutput) as InspectorResult } : {})
			});
		});
	});

	assert.equal(
		invocation.exitCode,
		options.expectedExitCode ?? 0,
		`Inspector exited with ${invocation.exitCode}. stderr: ${invocation.stderr}`
	);
	return invocation;
}

function successfulContent(
	invocation: InspectorInvocation,
	expectedText?: string
): Record<string, unknown> {
	assert.ok(invocation.json);
	const result = invocation.json.result;
	assert.equal(result.isError, undefined);
	if (expectedText) {
		assert.deepEqual(result.content, [{ type: "text", text: expectedText }]);
	}
	assert.ok(result.structuredContent && typeof result.structuredContent === "object");
	return result.structuredContent as Record<string, unknown>;
}

function errorContent(invocation: InspectorInvocation) {
	assert.ok(invocation.json);
	const result = invocation.json.result;
	assert.equal(result.isError, true);
	const content = result.content as Array<{ type: string; text: string }>;
	assert.equal(content[0].type, "text");
	return JSON.parse(content[0].text) as { code: string; message: string; retryable: boolean };
}

async function callTool(
	serverUrl: string,
	toolName: ToolName,
	toolArguments: Record<string, unknown>,
	expectedExitCode = 0
) {
	return runInspector(serverUrl, "tools/call", {
		toolName,
		toolArguments,
		expectedExitCode
	});
}

async function suppressExpectedErrorLog<T>(operation: () => Promise<T>): Promise<T> {
	const originalConsoleError = console.error;
	console.error = () => undefined;
	try {
		return await operation();
	} finally {
		console.error = originalConsoleError;
	}
}

async function verifyServerContract(serverUrl: string) {
	const initialized = await runInspector(serverUrl, "initialize");
	assert.deepEqual(initialized.json?.result.serverInfo, {
		name: "cftracker-manage-contests",
		version: "0.1.0"
	});
	assert.equal(
		initialized.json?.result.instructions,
		MANAGE_CONTESTS_MCP_INSTRUCTIONS
	);

	const listed = await runInspector(serverUrl, "tools/list");
	assert.deepEqual(
		(listed.json?.result.tools as Array<{ name: string }>).map((tool) => tool.name),
		toolNames
	);
	assert.deepEqual(listed.json?.result.tools, expectedTools);
}

function expectedSynchronizedContest(contestId: number) {
	const contest = synchronizedContests.find((candidate) => candidate.contestId === contestId)!;
	const problems = [...synchronizedProblems.get(contestId)!].toSorted(compareProblems);
	return {
		contest,
		problemCount: problems.length,
		problems
	};
}

function expectedSharedGroupResult(
	contestIds: number[],
	statuses: Array<"created" | "unchanged">
) {
	const orderedContestIds = [...contestIds].toSorted((left, right) => left - right);
	const parentContestId = orderedContestIds[0];
	const synchronizedGroupContests = orderedContestIds.map(expectedSynchronizedContest);
	return {
		parentContestId,
		contestIds: orderedContestIds,
		mappings: orderedContestIds.map((contestId, index) => ({
			status: statuses[index],
			mapping: { contestId, parentContestId }
		})),
		synchronizedContests: synchronizedGroupContests,
		totalProblemCount: synchronizedGroupContests.reduce(
			(total, contest) => total + contest.problemCount,
			0
		)
	};
}

async function verifySharedGroupInputValidation(
	serverUrl: string,
	services: FakeManageContestsServices
) {
	const invalidArguments: Record<string, unknown>[] = [
		{},
		{ contestIds: [] },
		{ contestIds: [101, 101] },
		{ contestIds: [0] },
		{ contestIds: [-1] },
		{ contestIds: [101.5] },
		{ contestIds: ["101"] },
		{ contestIds: [101], unexpected: true }
	];

	for (const toolArguments of invalidArguments) {
		const callsBefore = services.calls.sync_shared_contest_group;
		const operationsBefore = services.groupOperations.length;
		const invocation = await callTool(
			serverUrl,
			"sync_shared_contest_group",
			toolArguments,
			5
		);
		assert.equal(invocation.json?.result.isError, true);
		assert.equal(services.calls.sync_shared_contest_group, callsBefore);
		assert.equal(services.groupOperations.length, operationsBefore);
	}
}

async function verifyWorkflow(serverUrl: string, services: FakeManageContestsServices) {
	const orderedContests = [...synchronizedContests].toSorted(compareContests);
	const firstSync = successfulContent(
		await callTool(serverUrl, "sync_contests", {}),
		"Synchronized 5 contests from Codeforces."
	);
	assert.deepEqual(firstSync, { syncedCount: 5, contests: orderedContests });

	const repeatedSync = successfulContent(await callTool(serverUrl, "sync_contests", {}));
	assert.deepEqual(repeatedSync, firstSync);
	assert.equal(services.contests.size, 5);

	const ungrouped = successfulContent(
		await callTool(serverUrl, "list_ungrouped_contests", {}),
		"Found 5 ungrouped contests."
	);
	assert.deepEqual(ungrouped, { count: 5, contests: orderedContests });

	await verifySharedGroupInputValidation(serverUrl, services);
	assert.equal(SHARED_CONTEST_PROBLEM_SYNC_DELAY_MS, 2000);

	const mappings = [
		{ parentContestId: 101, contestId: 101 },
		{ parentContestId: 101, contestId: 102 },
		{ parentContestId: 101, contestId: 103 },
		{ parentContestId: 201, contestId: 201 },
		{ parentContestId: 201, contestId: 202 }
	];

	const standaloneContest = synchronizedContests.find((contest) => contest.contestId === 202)!;
	const standaloneProblems = [...synchronizedProblems.get(202)!].toSorted(compareProblems);
	const standaloneSync = successfulContent(await callTool(
		serverUrl,
		"sync_contest_problems",
		{ contestId: 202 }
	));
	assert.deepEqual(standaloneSync, {
		contest: standaloneContest,
		problemCount: standaloneProblems.length,
		problems: standaloneProblems
	});
	assert.deepEqual(
		successfulContent(await callTool(serverUrl, "sync_contest_problems", { contestId: 202 })),
		standaloneSync
	);
	assert.deepEqual(services.groupOperations, []);

	const firstGroupOperationIndex = services.groupOperations.length;
	const firstGroup = successfulContent(
		await callTool(
			serverUrl,
			"sync_shared_contest_group",
			{ contestIds: [103, 101, 102] }
		),
		"Synchronized shared group 101 with 3 contests and 5 problems."
	);
	assert.deepEqual(
		firstGroup,
		expectedSharedGroupResult([103, 101, 102], ["created", "created", "created"])
	);
	assert.deepEqual(services.groupOperations.slice(firstGroupOperationIndex), [
		{ operation: "link", contestId: 101, parentContestId: 101 },
		{ operation: "link", contestId: 102, parentContestId: 101 },
		{ operation: "link", contestId: 103, parentContestId: 101 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 101 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 102 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 103 }
	]);

	const mappingsBeforeRepeat = services.mappings.size;
	const problemsBeforeRepeat = services.problems.size;
	const repeatedGroupOperationIndex = services.groupOperations.length;
	const repeatedGroup = successfulContent(await callTool(
		serverUrl,
		"sync_shared_contest_group",
		{ contestIds: [103, 101, 102] }
	));
	assert.deepEqual(
		repeatedGroup,
		expectedSharedGroupResult([103, 101, 102], ["unchanged", "unchanged", "unchanged"])
	);
	assert.equal(services.mappings.size, mappingsBeforeRepeat);
	assert.equal(services.problems.size, problemsBeforeRepeat);
	assert.deepEqual(services.groupOperations.slice(repeatedGroupOperationIndex), [
		{ operation: "link", contestId: 101, parentContestId: 101 },
		{ operation: "link", contestId: 102, parentContestId: 101 },
		{ operation: "link", contestId: 103, parentContestId: 101 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 101 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 102 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 103 }
	]);

	const singletonOperationIndex = services.groupOperations.length;
	const singletonGroup = successfulContent(
		await callTool(
			serverUrl,
			"sync_shared_contest_group",
			{ contestIds: [201] }
		),
		"Synchronized shared group 201 with 1 contest and 2 problems."
	);
	assert.deepEqual(singletonGroup, expectedSharedGroupResult([201], ["created"]));
	assert.deepEqual(services.groupOperations.slice(singletonOperationIndex), [
		{ operation: "link", contestId: 201, parentContestId: 201 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 201 }
	]);

	const extendedGroupOperationIndex = services.groupOperations.length;
	const extendedGroup = successfulContent(await callTool(
		serverUrl,
		"sync_shared_contest_group",
		{ contestIds: [202, 201] }
	));
	assert.deepEqual(
		extendedGroup,
		expectedSharedGroupResult([202, 201], ["unchanged", "created"])
	);
	assert.deepEqual(services.groupOperations.slice(extendedGroupOperationIndex), [
		{ operation: "link", contestId: 201, parentContestId: 201 },
		{ operation: "link", contestId: 202, parentContestId: 201 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 201 },
		{ operation: "wait", milliseconds: 2000 },
		{ operation: "syncProblems", contestId: 202 }
	]);

	const conflictOperationIndex = services.groupOperations.length;
	const conflict = await callTool(
		serverUrl,
		"sync_shared_contest_group",
		{ contestIds: [102] },
		5
	);
	assert.deepEqual(errorContent(conflict), {
		code: "MAPPING_CONFLICT",
		message: "Could not link contest 102 to shared parent 102: Contest 102 is already linked to parent 101",
		retryable: false
	});
	assert.deepEqual(services.groupOperations.slice(conflictOperationIndex), [
		{ operation: "link", contestId: 102, parentContestId: 102 }
	]);

	const missingOperationIndex = services.groupOperations.length;
	const missingContest = await callTool(
		serverUrl,
		"sync_shared_contest_group",
		{ contestIds: [999] },
		5
	);
	assert.deepEqual(errorContent(missingContest), {
		code: "CONTEST_NOT_FOUND",
		message: "Could not link contest 999 to shared parent 999: Contest not found",
		retryable: false
	});
	assert.deepEqual(services.groupOperations.slice(missingOperationIndex), [
		{ operation: "link", contestId: 999, parentContestId: 999 }
	]);

	const noUngrouped = successfulContent(await callTool(serverUrl, "list_ungrouped_contests", {}));
	assert.deepEqual(noUngrouped, { count: 0, contests: [] });
	assert.deepEqual(
		successfulContent(await callTool(serverUrl, "list_ungrouped_contests", {})),
		noUngrouped
	);

	const problemCount = [...synchronizedProblems.values()].flat().length;
	const problemsBeforeStandaloneRepeat = services.problems.size;
	const repeatedProblemSync = successfulContent(await callTool(
		serverUrl,
		"sync_contest_problems",
		{ contestId: 101 }
	));
	assert.deepEqual(
		(repeatedProblemSync.problems as Problem[]).map((problem) => problem.index),
		["A", "B"]
	);
	assert.equal(services.problems.size, problemsBeforeStandaloneRepeat);
	assert.equal(services.problems.size, problemCount);

	const orderedProblems = [...synchronizedProblems.values()].flat().toSorted(compareProblems);
	const listedProblems = successfulContent(
		await callTool(serverUrl, "list_problems", {}),
		`Found ${problemCount} problems.`
	);
	assert.deepEqual(listedProblems, { count: problemCount, problems: orderedProblems });
	assert.deepEqual(successfulContent(await callTool(serverUrl, "list_problems", {})), listedProblems);

	const expectedGroups = {
		groupCount: 2,
		groups: [101, 201].map((parentContestId) => ({
			parentContestId,
			parentContest: services.contests.get(parentContestId),
			contests: mappings
				.filter((mapping) => mapping.parentContestId === parentContestId)
				.map(({ contestId }) => ({
					...services.contests.get(contestId)!,
					problems: orderedProblems.filter((problem) => problem.contestId === contestId)
				}))
		}))
	};
	const groups = successfulContent(
		await callTool(serverUrl, "list_shared_contest_groups", {}),
		"Found 2 shared contest groups."
	);
	assert.deepEqual(groups, expectedGroups);
	assert.deepEqual(
		successfulContent(await callTool(serverUrl, "list_shared_contest_groups", {})),
		expectedGroups
	);

	const defaultWrite = successfulContent(await callTool(serverUrl, "write_related_ts", {}));
	assert.deepEqual(defaultWrite, {
		outputPath: "../src/data/saved_api/related.ts",
		relatedProblemCount: problemCount
	});

	const outputPath = "tmp/inspection-related.ts";
	const firstWrite = successfulContent(await callTool(serverUrl, "write_related_ts", { outputPath }));
	const repeatedWrite = successfulContent(await callTool(serverUrl, "write_related_ts", { outputPath }));
	assert.deepEqual(firstWrite, { outputPath, relatedProblemCount: problemCount });
	assert.deepEqual(repeatedWrite, firstWrite);
	assert.equal(services.writtenOutputPath, outputPath);
}

async function verifyEveryToolFailure(serverUrl: string, services: FakeManageContestsServices) {
	const cases: Array<{
		toolName: ToolName;
		arguments: Record<string, unknown>;
		error: AppError;
	}> = [
		{
			toolName: "sync_contests",
			arguments: {},
			error: { code: "CODEFORCES_ERROR", publicMessage: "Could not synchronize contests", retryable: true }
		},
		{
			toolName: "sync_contest_problems",
			arguments: { contestId: 101 },
			error: { code: "CODEFORCES_INVALID_RESPONSE", publicMessage: "Could not synchronize problems", retryable: false }
		},
		{
			toolName: "sync_shared_contest_group",
			arguments: { contestIds: [101] },
			error: { code: "DATABASE_ERROR", publicMessage: "Could not save mapping", retryable: true }
		},
		{
			toolName: "list_ungrouped_contests",
			arguments: {},
			error: { code: "DATABASE_ERROR", publicMessage: "Could not list ungrouped contests", retryable: true }
		},
		{
			toolName: "list_problems",
			arguments: {},
			error: { code: "DATABASE_ERROR", publicMessage: "Could not list problems", retryable: true }
		},
		{
			toolName: "list_shared_contest_groups",
			arguments: {},
			error: { code: "DATABASE_ERROR", publicMessage: "Could not list shared groups", retryable: true }
		},
		{
			toolName: "write_related_ts",
			arguments: {},
			error: { code: "FILESYSTEM_ERROR", publicMessage: "Could not write related.ts", retryable: true }
		}
	];

	for (const testCase of cases) {
		services.nextError = testCase.error;
		const invocation = await callTool(
			serverUrl,
			testCase.toolName,
			testCase.arguments,
			5
		);
		assert.deepEqual(errorContent(invocation), {
			code: testCase.error.code,
			message: testCase.error.publicMessage,
			retryable: testCase.error.retryable
		});
	}

	services.nextThrow = true;
	const unexpected = await suppressExpectedErrorLog(
		() => callTool(serverUrl, "list_problems", {}, 5)
	);
	assert.deepEqual(errorContent(unexpected), {
		code: "INTERNAL_ERROR",
		message: "An unexpected internal error occurred",
		retryable: false
	});
}

async function verifySharedGroupStopAndRetry() {
	const services = new FakeManageContestsServices();
	const testServer = await startTestServer(services.dependencies);

	try {
		successfulContent(await callTool(testServer.url, "sync_contests", {}));

		services.groupFailure = {
			operation: "link",
			contestId: 102,
			error: {
				code: "DATABASE_ERROR",
				publicMessage: "Could not save mapping",
				retryable: true
			}
		};
		const mappingFailure = await callTool(
			testServer.url,
			"sync_shared_contest_group",
			{ contestIds: [103, 101, 102] },
			5
		);
		assert.deepEqual(errorContent(mappingFailure), {
			code: "DATABASE_ERROR",
			message: "Could not link contest 102 to shared parent 101: Could not save mapping",
			retryable: true
		});
		assert.deepEqual(services.groupOperations, [
			{ operation: "link", contestId: 101, parentContestId: 101 },
			{ operation: "link", contestId: 102, parentContestId: 101 }
		]);
		assert.deepEqual([...services.mappings.entries()], [[101, 101]]);
		assert.equal(services.problems.size, 0);

		const mappingRetryOperationIndex = services.groupOperations.length;
		const mappingRetry = successfulContent(await callTool(
			testServer.url,
			"sync_shared_contest_group",
			{ contestIds: [103, 101, 102] }
		));
		assert.deepEqual(
			mappingRetry,
			expectedSharedGroupResult([103, 101, 102], ["unchanged", "created", "created"])
		);
		assert.deepEqual(services.groupOperations.slice(mappingRetryOperationIndex), [
			{ operation: "link", contestId: 101, parentContestId: 101 },
			{ operation: "link", contestId: 102, parentContestId: 101 },
			{ operation: "link", contestId: 103, parentContestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 102 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 103 }
		]);

		services.problems.clear();
		services.groupFailure = {
			operation: "syncProblems",
			contestId: 102,
			error: {
				code: "CODEFORCES_INVALID_RESPONSE",
				publicMessage: "Could not synchronize problems",
				retryable: false
			}
		};
		const problemFailureOperationIndex = services.groupOperations.length;
		const problemFailure = await callTool(
			testServer.url,
			"sync_shared_contest_group",
			{ contestIds: [102, 103, 101] },
			5
		);
		assert.deepEqual(errorContent(problemFailure), {
			code: "CODEFORCES_INVALID_RESPONSE",
			message: "Could not synchronize problems for contest 102: Could not synchronize problems",
			retryable: false
		});
		assert.deepEqual(services.groupOperations.slice(problemFailureOperationIndex), [
			{ operation: "link", contestId: 101, parentContestId: 101 },
			{ operation: "link", contestId: 102, parentContestId: 101 },
			{ operation: "link", contestId: 103, parentContestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 102 }
		]);
		assert.equal(services.problems.size, synchronizedProblems.get(101)!.length);
		assert.ok([...services.problems.values()].every((problem) => problem.contestId === 101));

		const problemRetryOperationIndex = services.groupOperations.length;
		const problemRetry = successfulContent(await callTool(
			testServer.url,
			"sync_shared_contest_group",
			{ contestIds: [102, 103, 101] }
		));
		assert.deepEqual(
			problemRetry,
			expectedSharedGroupResult([102, 103, 101], ["unchanged", "unchanged", "unchanged"])
		);
		assert.deepEqual(services.groupOperations.slice(problemRetryOperationIndex), [
			{ operation: "link", contestId: 101, parentContestId: 101 },
			{ operation: "link", contestId: 102, parentContestId: 101 },
			{ operation: "link", contestId: 103, parentContestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 101 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 102 },
			{ operation: "wait", milliseconds: 2000 },
			{ operation: "syncProblems", contestId: 103 }
		]);
		assert.equal(
			services.problems.size,
			[101, 102, 103].flatMap((contestId) => synchronizedProblems.get(contestId)!).length
		);
	} finally {
		await testServer.close();
	}
}

async function verifyNoInputToolsRejectArguments(
	serverUrl: string,
	services: FakeManageContestsServices
) {
	const noInputTools: ToolName[] = [
		"sync_contests",
		"list_ungrouped_contests",
		"list_problems",
		"list_shared_contest_groups"
	];

	for (const toolName of noInputTools) {
		const callsBefore = services.calls[toolName];
		const invocation = await callTool(serverUrl, toolName, { unexpected: true }, 5);
		assert.equal(invocation.json?.result.isError, true);
		assert.equal(services.calls[toolName], callsBefore);
	}
}

async function verifyTemporaryFileWriting() {
	const temporaryDirectory = await mkdtemp(join(tmpdir(), "cftracker-related-ts-"));
	const outputPath = join(temporaryDirectory, "related.ts");
	const relatedProblems = [{
		contestId: 101,
		index: "A",
		id: "101-A",
		shared: [{ contestId: 102, index: "A", id: "102-A" }]
	}];
	const expectedContents = `export const jsonData = ${JSON.stringify({
		status: "OK",
		result: relatedProblems
	})};\n`;

	try {
		const firstWrite = await writeRelatedTsFile(relatedProblems, outputPath);
		assert.equal(isError(firstWrite), false);
		if (isError(firstWrite)) assert.fail(firstWrite.error.publicMessage);
		assert.deepEqual(firstWrite.value, {
			outputPath,
			relatedProblemCount: 1
		});
		assert.equal(await readFile(outputPath, "utf8"), expectedContents);

		const repeatedWrite = await writeRelatedTsFile(relatedProblems, outputPath);
		assert.equal(isError(repeatedWrite), false);
		if (isError(repeatedWrite)) assert.fail(repeatedWrite.error.publicMessage);
		assert.deepEqual(repeatedWrite.value, firstWrite.value);
		assert.equal(await readFile(outputPath, "utf8"), expectedContents);

		const failedWrite = await suppressExpectedErrorLog(
			() => writeRelatedTsFile(relatedProblems, temporaryDirectory)
		);
		assert.equal(isError(failedWrite), true);
		if (!isError(failedWrite)) assert.fail("Writing to a directory should fail");
		assert.deepEqual(failedWrite.error, {
			code: "FILESYSTEM_ERROR",
			publicMessage: "Could not write related.ts to the requested output path.",
			retryable: true
		});
	} finally {
		await rm(temporaryDirectory, { recursive: true, force: true });
	}
}

async function main() {
	const services = new FakeManageContestsServices();
	const testServer = await startTestServer(services.dependencies);

	try {
		await verifyServerContract(testServer.url);
		await verifyWorkflow(testServer.url, services);
		await verifyEveryToolFailure(testServer.url, services);
		await verifyNoInputToolsRejectArguments(testServer.url, services);
		await verifyTemporaryFileWriting();
	} finally {
		await testServer.close();
	}

	await verifySharedGroupStopAndRetry();
	console.log("MCP Inspector tests passed.");
}

main().catch((cause) => {
	console.error(cause);
	process.exitCode = 1;
});
