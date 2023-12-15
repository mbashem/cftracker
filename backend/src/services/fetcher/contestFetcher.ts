// import Problem from "../models/Problem";

// interface prop {
//   contestId: number[];
// }

// const getUrl = (contestId: number): string => {
//   return "https://codeforces.com/contest/" + contestId.toString() + "/";
// };

// const contestFetcher = async (contestId: number = 1509) => {
//   //return [new Problem(contestId,"bash","em"),new Problem(contestId,"sd","sdf")];
//   const problems: Problem[] = [];

// 	const contestInfo = `https://codeforces.com/api/contest.standings?lang=en&contestId=${contestId}&from=1&count=1&showUnofficial=false`;

//   try {
    
// 		let cont = await fetch(contestInfo);
// 		let objC = await cont.json();

// 		if(objC.hasOwnProperty('status') && objC["status"] == "OK"){

// 			for(let prob of objC["result"]["problems"]){
// 				problems.push(new Problem(prob.contestId,prob.index,prob.name));
// 			}
// 		}
//   } catch (err) {
//     console.log(err);
//   }

//   return problems;
// };

// // contestScrapper();

// export default contestFetcher;
export {}