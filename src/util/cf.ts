export const RATING_CONSTANTS = {
	max: 3500,
	min: 800,
	interval: 100
};

export const RATING_LABELS = function () {
	let labels = [];
	for (let rating = RATING_CONSTANTS.min; rating <= RATING_CONSTANTS.max; rating += RATING_CONSTANTS.interval) {
		labels.push(rating);
	}
	return labels;
}();