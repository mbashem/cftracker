/**
 * 
 * @param ms number of milliseconds to sleep
 * @returns 
 */
function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}