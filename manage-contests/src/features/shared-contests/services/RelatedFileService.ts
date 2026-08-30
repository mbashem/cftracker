import "server-only";

import { writeFile } from "node:fs/promises";
import type { RelatedProblem } from "./CreateSharedService";
import { err, isError, ok, type Result } from "@/utils/result";

const DEFAULT_OUTPUT_PATH = "../src/data/saved_api/related.ts";

export type WriteRelatedTsResult = {
	outputPath: string;
	relatedProblemCount: number;
};

export async function writeRelatedTsFile(
	relatedProblems: RelatedProblem[],
	outputPath = DEFAULT_OUTPUT_PATH
): Promise<Result<WriteRelatedTsResult>> {
	const fileContents = `export const jsonData = ${JSON.stringify({
		status: "OK",
		result: relatedProblems
	})};\n`;

	try {
		await writeFile(outputPath, fileContents, "utf8");
	} catch (cause) {
		console.error("Failed to write related.ts", cause);
		return err({
			code: "FILESYSTEM_ERROR",
			publicMessage: "Could not write related.ts to the requested output path.",
			retryable: true
		});
	}

	return ok({
		outputPath,
		relatedProblemCount: relatedProblems.length
	});
}

export async function writeRelatedTs(outputPath?: string): Promise<Result<WriteRelatedTsResult>> {
	const { getGroupedSharedProblems } = await import("./CreateSharedService");
	const relatedProblemsResult = await getGroupedSharedProblems();
	if (isError(relatedProblemsResult)) return relatedProblemsResult;

	return writeRelatedTsFile(relatedProblemsResult.value, outputPath);
}
