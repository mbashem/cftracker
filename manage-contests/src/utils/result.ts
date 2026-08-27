export type AppErrorCode =
	| "INVALID_CONTEST_ID"
	| "INVALID_PARENT_ORDER"
	| "CONTEST_NOT_FOUND"
	| "PARENT_NOT_INITIALIZED"
	| "MAPPING_CONFLICT"
	| "NESTED_PARENT_CONFLICT"
	| "CONFIGURATION_ERROR"
	| "CODEFORCES_ERROR"
	| "CODEFORCES_INVALID_RESPONSE"
	| "DATABASE_ERROR"
	| "FILESYSTEM_ERROR"
	| "INTERNAL_ERROR";

export type AppError = Readonly<{
	code: AppErrorCode;
	publicMessage: string;
	retryable: boolean;
}>;

export type ValueResult<T> = Readonly<{
	ok: true;
	value: T;
}>;

export type ErrorResult = Readonly<{
	ok: false;
	error: AppError;
}>;

export type Result<T> = ValueResult<T> | ErrorResult;

export function ok<T>(value: T): ValueResult<T> {
	return { ok: true, value };
}

export function err(error: AppError): ErrorResult {
	return { ok: false, error };
}

/** Checks whether a Result contains an error and narrows it to ErrorResult. */
export function isError<T>(result: Result<T>): result is ErrorResult {
	return result.ok === false;
}
