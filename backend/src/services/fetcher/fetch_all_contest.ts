const fetch_all_contest = (data: any) => {
	let i = 0;

	const func = () => {
		if (i === data.result.length) {
			clearInterval(refreshIntervalId);
		} else {
			fetch("http://localhost:3000/api/scrap/" + data.result[i].contestId)
				.then((res) => res.json())
				.then((res) => console.log(res))
				.catch((err) => console.log(err));
			for (let j = 0; j < data.result[i].shared.length; j++) {
				fetch("http://localhost:3000/api/scrap/" + data.result[i].shared[j])
					.then((res) => res.json())
					.then((res) => console.log(res))
					.catch((err) => console.log(err));
			}
			i++;
		}
	};

	var refreshIntervalId = setInterval(func, 3000);
};

export default fetch_all_contest;