export interface List {
	id: number;
	userId: number;
	name: string;
	createdAt: string;
}

export interface ListItem {
	listId: number;
	problemId: string;
	position: number;
	createdAt: string;
}

export interface ListWithItem extends List {
	items: ListItem[];
}

// export function listWithItemToListItem(listWithItem: ListWithItem): List {
// 	return {
// 		id: 
// 	}
// }

export function jsonToList(json: any): List {
	return {
		id: json.id,
		userId: json.user_id,
		name: json.name,
		createdAt: json.created_at,
	};
}

export function jsonToListItem(json: any): ListItem {
	return {
		listId: json.list_id,
		problemId: json.problem_id,
		position: json.position,
		createdAt: json.created_at
	};
}
