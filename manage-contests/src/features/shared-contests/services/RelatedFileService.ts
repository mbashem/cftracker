import "server-only";

import { writeFile } from "node:fs/promises";
import { err, isError, ok, Result } from "@/utils/result";
import { getGroupedSharedProblems } from "./CreateSharedService";

const DEFAULT_OUTPUT_PATH = "../src/data/saved_api/related.ts";

export type WriteRelatedTsResult = {
	status: "written";
	outputPath: string;
	relatedProblemCount: number;
};

export async function writeRelatedTs(outputPath?: string): Promise<Result<WriteRelatedTsResult>> {
	const relatedProblemsResult = await getGroupedSharedProblems();
	if (isError(relatedProblemsResult)) return relatedProblemsResult;

	const targetPath = outputPath ?? DEFAULT_OUTPUT_PATH;
	const fileContents = `export const jsonData = ${JSON.stringify({
		status: "OK",
		result: relatedProblemsResult.value
	})};\n`;

	try {
		await writeFile(targetPath, fileContents, "utf8");
	} catch (cause) {
		console.error("Failed to write related.ts", cause);
		return err({
			code: "FILESYSTEM_ERROR",
			publicMessage: "Could not write related.ts to the requested output path.",
			retryable: true
		});
	}

	return ok({
		status: "written",
		outputPath: targetPath,
		relatedProblemCount: relatedProblemsResult.value.length
	});
}
