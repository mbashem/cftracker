export function formateDate(time: number) {
	const date = new Date(time * 1000);
	//console.log(date);
	return (
		date.getDate() +
		"/" +
		(date.getMonth() + 1) +
		"/" +
		date.getFullYear() +
		" " +
		date.getHours() +
		":" +
		date.getMinutes()
	);
};

export function getDaysInYear(year: number) {
	return (year % 4 === 0 && year % 100 > 0) || year % 400 == 0 ? 366 : 365;
}

export function getDaysInMonth(year: number, month: number) {
	return new Date(year, month, 0).getDate();
}

export function delay(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

// 0 Indexed
export function getWeekNumber(date: Date) {
	let startDayOfTheYear = new Date(date.getFullYear(), 0, 1).getDay()
	const numberOfDaysInAWeek = 7;
	const daysInFirstWeek = numberOfDaysInAWeek - startDayOfTheYear;

	let dayInYear = getDayOfTheYear(date) - 1; 
	if (dayInYear < daysInFirstWeek)
		return 0;
	
	dayInYear -= daysInFirstWeek;

	return Math.floor(dayInYear / 7) + 1;
}

export function getDayOfTheYear(date: Date) {
	var start = new Date(date.getFullYear(), 0, 0);
	var diff = date.getTime() - start.getTime();
	var oneDay = 1000 * 60 * 60 * 24;
	var day = Math.floor(diff / oneDay);
	return day;
}

export function getLocalizedWeekdays(localeName = 'en-US', format: "short" | "long" = "short") {
	let now = new Date();
	const { format: dateTimeFormat } = new Intl.DateTimeFormat(localeName, { weekday: format });
	return [...Array(7).keys()]
		.map((day) => dateTimeFormat(new Date().getTime() - (now.getDay() - day) * 86400000));
}
