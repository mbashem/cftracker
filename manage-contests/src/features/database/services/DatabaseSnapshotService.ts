import "server-only";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Contest, Problem, SharedContest } from "@/prisma/generated/client/client";
import { getAllContests } from "@/features/contests/services/ContestDBService";
import { getAllProblems } from "@/features/problems/services/ProblemDBService";
import { getAllSharedContests } from "@/features/shared-contests/services/SharedContestsDBService";
import { err, isError, ok, type Result } from "@/utils/result";

const DEFAULT_OUTPUT_DIRECTORY = "src/saved-db";

type DatabaseSnapshotDependencies = Readonly<{
	getContests: () => Promise<Contest[]>;
	getProblems: () => Promise<Result<Problem[]>>;
	getSharedContests: () => Promise<SharedContest[]>;
	writeFile: (path: string, contents: string) => Promise<void>;
}>;

const defaultDependencies: DatabaseSnapshotDependencies = {
	getContests: getAllContests,
	getProblems: getAllProblems,
	getSharedContests: getAllSharedContests,
	writeFile: (path, contents) => writeFile(path, contents, "utf8")
};

export type DatabaseSnapshotResult = Readonly<{
	outputDirectory: string;
	contestCount: number;
	problemCount: number;
	sharedContestCount: number;
}>;

export async function saveDatabaseSnapshot(
	outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
	dependencies: DatabaseSnapshotDependencies = defaultDependencies
): Promise<Result<DatabaseSnapshotResult>> {
	let contests: Contest[];
	let problems: Problem[];
	let sharedContests: SharedContest[];

	try {
		const problemsResult = await dependencies.getProblems();
		if (isError(problemsResult)) return problemsResult;
		problems = problemsResult.value;
		contests = await dependencies.getContests();
		sharedContests = await dependencies.getSharedContests();
	} catch (cause) {
		console.error("Failed to load database snapshot", cause);
		return err({
			code: "DATABASE_ERROR",
			publicMessage: "Could not load the database snapshot.",
			retryable: true
		});
	}

	try {
		await dependencies.writeFile(join(outputDirectory, "problems.json"), JSON.stringify(problems));
		await dependencies.writeFile(join(outputDirectory, "contests.json"), JSON.stringify(contests));
		await dependencies.writeFile(join(outputDirectory, "shared-contests.json"), JSON.stringify(sharedContests));
	} catch (cause) {
		console.error("Failed to write database snapshot", cause);
		return err({
			code: "FILESYSTEM_ERROR",
			publicMessage: "Could not write the database snapshot.",
			retryable: true
		});
	}

	return ok({
		outputDirectory,
		contestCount: contests.length,
		problemCount: problems.length,
		sharedContestCount: sharedContests.length
	});
}
