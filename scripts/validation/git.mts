import { spawnSync } from "node:child_process";

type GitOptions = {
  cwd?: string;
  encoding?: "buffer" | "utf8";
  input?: string | Uint8Array;
};

export function runGit(
  argumentsList: string[],
  options: GitOptions & { encoding: "buffer" },
): Buffer;
export function runGit(argumentsList: string[], options?: GitOptions): string;
export function runGit(
  argumentsList: string[],
  options: GitOptions = {},
): Buffer | string {
  const encoding =
    options.encoding === "buffer" ? null : (options.encoding ?? "utf8");
  const result = spawnSync("git", argumentsList, {
    cwd: options.cwd,
    encoding,
    input: options.input,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Unable to run Git: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || "").trim();
    throw new Error(
      `git ${argumentsList.join(" ")} failed${detail ? `: ${detail}` : ""}`,
    );
  }

  return result.stdout;
}

export function splitNullDelimited(value: string): string[] {
  return value.split("\0").filter(Boolean);
}

export function stagedFiles(): string[] {
  return splitNullDelimited(
    runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"]),
  );
}

export function stagedFile(path: string): Buffer {
  return runGit(["show", `:${path}`], { encoding: "buffer" });
}

export function trackedFiles(revision = "HEAD"): string[] {
  return splitNullDelimited(
    runGit(["ls-tree", "-r", "--name-only", "-z", revision]),
  );
}
