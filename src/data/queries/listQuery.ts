import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseQuery';
import {
	jsonToList, jsonToListItem, practiceToJson,
	type List, type ListItem, type ListWithItem, type ListItemInput,
	type ListAddResult, type ListMoveResult, type ListRemoveResult, type PracticeFields,
} from '../../types/list';
import type { UserState } from '../reducers/userSlice';

export enum ListApiTags {
	Lists = "Lists"
}
function IndividualPostTag(listId: number) {
	return [{ "type": ListApiTags.Lists, "id": listId }];
}

const baseQuery = createBaseQuery();

interface OrderResponse {
	order: { problem_id: string; position: number }[];
	rebalanced: boolean;
}

function readOrder({ order, rebalanced }: OrderResponse) {
	return {
		order: order.map(({ problem_id, position }) => ({ problemId: problem_id, position })),
		rebalanced,
	};
}

export const listApi = createApi({
	reducerPath: 'listApi',
	baseQuery: (args, api, extraOptions) => {
		const { userList } = api.getState() as { userList: UserState };
		if (userList.authenticationStatus !== 'authenticated' || !userList.user) {
			return { error: { status: 401, data: { error: "Sign in to manage lists." } } };
		}
		return baseQuery(args, api, extraOptions);
	},
	tagTypes: [ListApiTags.Lists],
	endpoints: (builder) => ({
		getAllLists: builder.query<List[], void>({
			query: () => ({
				url: `/lists`,
				method: 'GET',
			}),
			providesTags: [ListApiTags.Lists],
			transformResponse: (response: any) => {
				return response.lists.map((list: any) => jsonToList(list));
			}
		}),
		createList: builder.mutation<List, Partial<List> & Pick<List, 'name'>>({
			query: (body) => ({
				url: `/lists`,
				method: 'POST',
				body,
			}),
			transformResponse: (response: any) => {
				return jsonToList(response.list);
			},
			invalidatesTags: [ListApiTags.Lists]
		}),
		getList: builder.query<ListWithItem, number>({
			query: (listID) => ({
				url: `/lists/${listID}`,
				method: 'GET',
			}),
			transformResponse: (response: any) => {
				const items = response.items.map((item: any) => jsonToListItem(item));
				items.sort((first: ListItem, second: ListItem) => {
					if (first.position !== second.position) {
						return first.position < second.position ? -1 : 1;
					}

					const createdAtComparison = first.createdAt.localeCompare(second.createdAt);
					if (createdAtComparison !== 0) return createdAtComparison;

					return first.problemId.localeCompare(second.problemId);
				});
				return {
					...jsonToList(response.list),
					items,
				};
			},
			providesTags: (_result, _error, arg, _meta) => IndividualPostTag(arg),
		}),
		updateListName: builder.mutation<void, { listId: number; name: string; }>({
			query: ({ listId, name }) => ({
				url: `/lists/${listId}`,
				method: 'PUT',
				body: { name },
			}),
			invalidatesTags: [ListApiTags.Lists]
		}),
		deleteList: builder.mutation<void, number>({
			query: (listID) => ({
				url: `/lists/${listID}`,
				method: 'DELETE',
			}),
			invalidatesTags: [ListApiTags.Lists]
		}),
		addToList: builder.mutation<ListAddResult, { listId: number; items: ListItemInput[]; beforeProblemId?: string }>({
			query: ({ listId, items, beforeProblemId }) => ({
				url: `/lists/${listId}/items`,
				method: 'POST',
				body: {
					items: items.map(item => ({ problem_id: item.problemId, ...practiceToJson(item) })),
					before_problem_id: beforeProblemId,
				},
			}),
			transformResponse: (response: OrderResponse & { added?: unknown[]; duplicate_problem_ids?: string[] }) => ({
				...readOrder(response),
				added: (response.added ?? []).map(jsonToListItem),
				duplicateProblemIds: response.duplicate_problem_ids ?? [],
			}),
			invalidatesTags: (_result, _error, arg) => IndividualPostTag(arg.listId),
		}),
		updateListItem: builder.mutation<ListItem, { listId: number; problemId: string; patch: PracticeFields }>({
			query: ({ listId, problemId, patch }) => ({
				url: `/lists/${listId}/item/${encodeURIComponent(problemId)}`,
				method: 'PATCH',
				body: practiceToJson(patch),
			}),
			transformResponse: (response: { item: unknown }) => jsonToListItem(response.item),
			invalidatesTags: (_result, _error, arg) => IndividualPostTag(arg.listId),
		}),
		moveListItems: builder.mutation<ListMoveResult, { listId: number; problemIds: string[]; beforeProblemId?: string }>({
			query: ({ listId, problemIds, beforeProblemId }) => ({
				url: `/lists/${listId}/items/move`,
				method: 'POST',
				body: { problem_ids: problemIds, before_problem_id: beforeProblemId },
			}),
			transformResponse: (response: OrderResponse & { absent_problem_ids?: string[] }) => ({
				...readOrder(response),
				absentProblemIds: response.absent_problem_ids ?? [],
			}),
			invalidatesTags: (_result, _error, arg) => IndividualPostTag(arg.listId),
		}),
		deleteFromList: builder.mutation<ListRemoveResult, { listId: number; problemIds: string[] }>({
			query: ({ listId, problemIds }) => ({
				url: `/lists/${listId}/items/remove`,
				method: 'POST',
				body: { problem_ids: problemIds },
			}),
			transformResponse: (response: OrderResponse & { removed_problem_ids?: string[]; absent_problem_ids?: string[] }) => ({
				...readOrder(response),
				removedProblemIds: response.removed_problem_ids ?? [],
				absentProblemIds: response.absent_problem_ids ?? [],
			}),
			invalidatesTags: (_result, _error, arg) => IndividualPostTag(arg.listId),
		}),
	}),
});

export const { useCreateListMutation, useGetListQuery } = listApi;
