// import { contest_statings_problems_url } from "../../util/cf/cf_api";
// import Problem from "../../util/DataTypes/Problem";
// import { fetch_json } from "../../util/util";

// const get_contest_problems = async (contest_id: number): Promise<Problem> => {
// 	let response = await fetch_json(contest_statings_problems_url(contest_id));
	
// 	let problems: Problem[] = []; 

// 	//console.log(response);

// 	if (response.status === "OK") {
// 		for (let problem of response.result.problems) {
// 			problems.push(new Problem(problem.contestId, problem.index, problem.name, problem.type, problem.tags, problem.rating));
// 		}
// 	}

// 	return problems;
// }

// export default get_contest_problems;
export {}