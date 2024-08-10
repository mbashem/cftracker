export interface List {
	id: number;
	userId: number;
	name: string;
	createdAt: Date;
}

export interface ListItem {
	listId: number;
	problemId: string;
	position: number;
	createdAt: Date;
}

export interface ListWithItem extends List {
	items: ListItem[];
}