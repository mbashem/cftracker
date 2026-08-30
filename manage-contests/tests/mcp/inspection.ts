import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createMcpHandler } from "mcp-handler";
import {
	registerManageContestsTools,
	type ManageContestsMcpDependencies
} from "../../src/features/mcp/McpServer";
import { writeRelatedTsFile } from "../../src/features/shared-contests/services/RelatedFileService";
import { err, isError, ok, type AppError } from "../../src/utils/result";

const toolNames = [
	"sync_contests",
	"sync_contest_problems",
	"link_contest_to_shared_parent",
	"list_ungrouped_contests",
	"list_problems",
	"list_shared_contest_groups",
	"write_related_ts"
] as const;

type ToolName = typeof toolNames[number];

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
	readonly calls: Record<ToolName, number> = {
		sync_contests: 0,
		sync_contest_problems: 0,
		link_contest_to_shared_parent: 0,
		list_ungrouped_contests: 0,
		list_problems: 0,
		list_shared_contest_groups: 0,
		write_related_ts: 0
	};
	writtenOutputPath?: string;
	nextError?: AppError;
	nextThrow = false;

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
		},
		linkContestToSharedParent: async (contestId, parentContestId) => {
			const failure = this.startCall("link_contest_to_shared_parent");
			if (failure) return failure;

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
				status: existingParent === parentContestId ? "unchanged" : "created",
				mapping: { contestId, parentContestId }
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
		name: "link_contest_to_shared_parent",
		title: "Link contest to shared parent",
		description: "Create one directional shared-contest mapping. The parent ID must not exceed the contest ID, a parent must be linked to itself before its children, identical calls are unchanged, and an existing mapping is never reassigned.",
		inputSchema: rootObjectSchema({
			parentContestId: { ...positiveIntegerSchema, description: "Smallest confirmed contest ID and shared-group parent" },
			contestId: { ...positiveIntegerSchema, description: "Contest to link, including the parent itself on the first call" }
		}),
		outputSchema: rootObjectSchema({
			status: { type: "string", enum: ["created", "unchanged"] },
			mapping: objectSchema({
				contestId: positiveIntegerSchema,
				parentContestId: positiveIntegerSchema
			})
		}),
		annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
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

	const listed = await runInspector(serverUrl, "tools/list");
	assert.deepEqual(
		(listed.json?.result.tools as Array<{ name: string }>).map((tool) => tool.name),
		toolNames
	);
	assert.deepEqual(listed.json?.result.tools, expectedTools);
}

async function verifyMappingValidation(serverUrl: string) {
	const cases = [
		{
			arguments: { parentContestId: 102, contestId: 103 },
			error: {
				code: "PARENT_NOT_INITIALIZED",
				message: "Parent contest 102 must be linked to itself first",
				retryable: false
			}
		},
		{
			arguments: { parentContestId: 103, contestId: 101 },
			error: {
				code: "INVALID_PARENT_ORDER",
				message: "Parent contest 103 cannot be greater than contest 101",
				retryable: false
			}
		},
		{
			arguments: { parentContestId: 101, contestId: 999 },
			error: {
				code: "CONTEST_NOT_FOUND",
				message: "Contest not found",
				retryable: false
			}
		}
	];

	for (const testCase of cases) {
		const invocation = await callTool(
			serverUrl,
			"link_contest_to_shared_parent",
			testCase.arguments,
			5
		);
		assert.deepEqual(errorContent(invocation), testCase.error);
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

	await verifyMappingValidation(serverUrl);

	const mappings = [
		{ parentContestId: 101, contestId: 101 },
		{ parentContestId: 101, contestId: 102 },
		{ parentContestId: 101, contestId: 103 },
		{ parentContestId: 201, contestId: 201 },
		{ parentContestId: 201, contestId: 202 }
	];
	for (const mapping of mappings) {
		const linked = successfulContent(await callTool(
			serverUrl,
			"link_contest_to_shared_parent",
			mapping
		));
		assert.deepEqual(linked, { status: "created", mapping });
	}

	const repeatedChild = successfulContent(await callTool(
		serverUrl,
		"link_contest_to_shared_parent",
		{ parentContestId: 101, contestId: 102 }
	));
	assert.deepEqual(repeatedChild, {
		status: "unchanged",
		mapping: { parentContestId: 101, contestId: 102 }
	});

	const conflict = await callTool(
		serverUrl,
		"link_contest_to_shared_parent",
		{ parentContestId: 102, contestId: 102 },
		5
	);
	assert.deepEqual(errorContent(conflict), {
		code: "MAPPING_CONFLICT",
		message: "Contest 102 is already linked to parent 101",
		retryable: false
	});

	const noUngrouped = successfulContent(await callTool(serverUrl, "list_ungrouped_contests", {}));
	assert.deepEqual(noUngrouped, { count: 0, contests: [] });
	assert.deepEqual(
		successfulContent(await callTool(serverUrl, "list_ungrouped_contests", {})),
		noUngrouped
	);

	for (const contest of orderedContests) {
		const expectedProblems = [...synchronizedProblems.get(contest.contestId)!].toSorted(compareProblems);
		const synchronizedContest = successfulContent(await callTool(
			serverUrl,
			"sync_contest_problems",
			{ contestId: contest.contestId }
		));
		assert.deepEqual(synchronizedContest, {
			contest,
			problemCount: expectedProblems.length,
			problems: expectedProblems
		});
	}

	const problemCount = [...synchronizedProblems.values()].flat().length;
	const problemsBeforeRepeat = services.problems.size;
	const repeatedProblemSync = successfulContent(await callTool(
		serverUrl,
		"sync_contest_problems",
		{ contestId: 101 }
	));
	assert.deepEqual(
		(repeatedProblemSync.problems as Problem[]).map((problem) => problem.index),
		["A", "B"]
	);
	assert.equal(services.problems.size, problemsBeforeRepeat);
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
			toolName: "link_contest_to_shared_parent",
			arguments: { parentContestId: 101, contestId: 101 },
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
		console.log("MCP Inspector tests passed.");
	} finally {
		await testServer.close();
	}
}

main().catch((cause) => {
	console.error(cause);
	process.exitCode = 1;
});
