/**
 * 
 * @param ms number of milliseconds to sleep
 * @returns 
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
