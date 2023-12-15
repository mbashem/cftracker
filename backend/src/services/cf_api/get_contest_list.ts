// import { contest_list_url } from "../../util/cf/cf_api";
// import Contest from "../../util/DataTypes/Contest";
// import { fetch_json } from "../../util/util";

// const get_contest_list = async () : Promise<Contest[]>  => {
// 	let response = await fetch_json(contest_list_url());

// 	let contests  : Contest[] = [];

// 	//console.log(response)

// 	for(let contest of response.result){
// 		contests.push(new Contest(contest.id,contest.name,contest.type,contest.phase,contest.durationSeconds,contest.startTimeSeconds));
// 	}

// 	return contests;
// }	

// export default get_contest_list;
export {}