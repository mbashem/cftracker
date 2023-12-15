// import { Contest } from "@prisma/client";
// import { api } from "../api/client/SharedClient";

// const check = (child_name: string, parent_name: string): boolean => {
// 	// if (name1.includes(name2)) return true;
// 	// else {
// 	let p_name = `${parent_name}`;
// 	let c_name = `${child_name}`;

// 	p_name = p_name.replace(/\s/g, "");
// 	c_name = c_name.replace(/\s/g, "");

// 	const div1 = "Div.1";
// 	const div2 = "Div.2";

// 	if (c_name.includes(div2)) {
// 		c_name = c_name.replace(div2, div1);
// 	}

// 	return (c_name === p_name);
// };

// const group_contest = async (contests: Contest[]) => {
// 	console.log("HHHH");
// 	console.log(contests);

// 	for (let i = 0; i < contests.length; i++) {
// 		let curr: Contest[] = [];

// 		for (let j = 0; j < contests.length; j++) {
// 			if (
// 				i !== j && check(contests[j].name, contests[i].name)
// 			) {
// 				curr.push(contests[j]);
// 			}
// 		}

// 		//console.log(curr);

// 		if (curr.length !== 0) {
// 			await api.SharedClient.create_or_update(contests[i].id, contests[i].id);

// 			for (let cont of curr) {
// 				console.log(cont.id);
// 				await api.SharedClient.create_or_update(cont.id, contests[i].id);
// 			}
// 		}
// 	}
// }

// export default group_contest;
export {}