export interface List {
	id: number;
	userId: number;
	name: string;
	createdAt: Date;
}

export interface ListItem {
	listId: number;
	problemId: string;
	name?: String;
	position: number;
	createdAt: Date;
}

export interface ListWithItem extends List {
	items: ListItem[];
}

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
		name: json.name,
		position: json.position,
		createdAt: json.created_at
	};
}