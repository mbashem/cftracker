import path from "node:path";

export function validateRepositoryPath(filePath: string): string[] {
  const basename = path.posix.basename(filePath.replaceAll("\\", "/"));
  const errors: string[] = [];

  if (basename.startsWith(".env") && !basename.endsWith(".example")) {
    errors.push("environment files are not allowed; commit an .env.example instead");
  }
  if (basename === ".DS_Store") {
    errors.push("macOS metadata files are not allowed");
  }
  if (basename.endsWith(".log")) {
    errors.push("log files are not allowed");
  }

  return errors;
}
