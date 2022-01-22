import fetch from 'node-fetch';

// fetch all problems
import fs from "fs";


//const ALL_CONTEST_URL = "https://codeforces.com/api/contest.list?lang=en";
const ALL_PROBLEMS_URL = "https://codeforces.com/api/problemset.problems?lang=en";

const update_problems_list = async () => {

	try {

		let response = await fetch(ALL_PROBLEMS_URL);

		console.log(response.status);
		const body = await response.json();

		if (response.status == 200 && body["status"] == "OK") {

			let writable = "export const problem_data=" + JSON.stringify(body);

			fs.writeFile("../src/data/saved_api/porblems_data.ts", writable,  function (err) {
				if (err) {
					console.error("Error Writing to filesystem:");
					throw err;
				}
				else console.log('complete');
			}
			);
		} else {
			console.error("Failed");
		}

	} catch (e) {
		console.error("Error :");
		throw e;
	}
}

update_problems_list();