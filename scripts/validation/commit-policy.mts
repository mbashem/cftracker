export const allowedCommitTypes = [
  "feat",
  "fix",
  "refactor",
  "perf",
  "test",
  "docs",
  "build",
  "ci",
  "chore",
  "revert",
];

const subjectPattern = new RegExp(
  `^(${allowedCommitTypes.join("|")})(?:\\(([a-z0-9]+(?:-[a-z0-9]+)*)\\))?(!)?: (.*)$`,
);
const breakingFooterPattern = /^BREAKING CHANGE: \S.*$/m;

function withoutCommentLines(message: string): string {
  return message
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .replace(/\n+$/, "");
}

export function validateCommitMessage(message: string): string[] {
  const cleanedMessage = withoutCommentLines(message);
  const lines = cleanedMessage.split("\n");
  const subject = lines[0] ?? "";
  const errors: string[] = [];
  const match = subject.match(subjectPattern);

  if (!match) {
    errors.push(
      "subject must match <type>(<optional-kebab-case-scope>): <summary> with an allowed type",
    );
    return errors;
  }

  const breakingMarker = match[3] === "!";
  const summary = match[4];

  if (!summary) {
    errors.push("summary must not be empty");
  } else {
    if (!/^[a-z]/.test(summary)) {
      errors.push("summary must begin with a lowercase letter");
    }
    if ([...summary].length > 72) {
      errors.push("summary must be no longer than 72 characters");
    }
    if (summary.endsWith(".")) {
      errors.push("summary must not end with a period");
    }
    if (summary !== summary.trimEnd()) {
      errors.push("summary must not end with whitespace");
    }
  }

  if (lines.length > 1 && lines[1] !== "") {
    errors.push("body and footers must be separated from the subject by a blank line");
  }

  const hasBreakingFooter = breakingFooterPattern.test(cleanedMessage);
  if (breakingMarker && !hasBreakingFooter) {
    errors.push("a ! marker requires a non-empty BREAKING CHANGE: footer");
  }
  if (!breakingMarker && hasBreakingFooter) {
    errors.push("a BREAKING CHANGE: footer requires ! before the colon");
  }

  return errors;
}
