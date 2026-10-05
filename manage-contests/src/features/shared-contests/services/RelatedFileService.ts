import "server-only";

import { writeFile } from "node:fs/promises";
import type { RelatedProblem } from "./CreateSharedService";
import { err, isError, ok, type Result } from "@/utils/result";

const DEFAULT_OUTPUT_PATH = "../src/data/saved_api/related.json";

export type WriteRelatedJsonResult = {
	outputPath: string;
	relatedProblemCount: number;
};

export async function writeRelatedJsonFile(
	relatedProblems: RelatedProblem[],
	outputPath = DEFAULT_OUTPUT_PATH
): Promise<Result<WriteRelatedJsonResult>> {
	const fileContents = `${JSON.stringify({
		status: "OK",
		result: relatedProblems
	})}\n`;

	try {
		await writeFile(outputPath, fileContents, "utf8");
	} catch (cause) {
		console.error("Failed to write related.json", cause);
		return err({
			code: "FILESYSTEM_ERROR",
			publicMessage: "Could not write related.json to the requested output path.",
			retryable: true
		});
	}

	return ok({
		outputPath,
		relatedProblemCount: relatedProblems.length
	});
}

export async function writeRelatedJson(outputPath?: string): Promise<Result<WriteRelatedJsonResult>> {
	const { getGroupedSharedProblems } = await import("./CreateSharedService");
	const relatedProblemsResult = await getGroupedSharedProblems();
	if (isError(relatedProblemsResult)) return relatedProblemsResult;

	return writeRelatedJsonFile(relatedProblemsResult.value, outputPath);
}
