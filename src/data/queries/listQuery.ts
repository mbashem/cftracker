import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseQuery';
import { jsonToList, jsonToListItem, List, ListItem, ListWithItem, ListAddResult, ListRemoveResult } from '../../types/list';
import type { UserState } from '../reducers/userSlice';

export enum ListApiTags {
	Lists = "Lists"
}
function IndividualPostTag(listId: number) {
	return [{ "type": ListApiTags.Lists, "id": listId }];
}

const baseQuery = createBaseQuery();

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
  // One add contract inserts a batch before an existing anchor, or prepends it.
  addToList: builder.mutation<ListAddResult, { listId: number; problemIds: string[]; beforeProblemId?: string }>({
   query: ({listId,problemIds,beforeProblemId})=>({url:`/lists/${listId}/items`,method:'POST',body:{items:problemIds.map(problem_id=>({problem_id})),before_problem_id:beforeProblemId}}),
   transformResponse:(response:any):ListAddResult=>({
    added:(response.added??[]).map(jsonToListItem),
    duplicateProblemIds:response.duplicate_problem_ids??[],
    order:response.order.map((item:any)=>({problemId:item.problem_id,position:item.position})),rebalanced:response.rebalanced,
   }),
   invalidatesTags:(_result,_error,arg)=>IndividualPostTag(arg.listId),
  }),
  // One removal contract handles single clicks and selected batches.
  deleteFromList: builder.mutation<ListRemoveResult,{listId:number;problemIds:string[]}>({
   query:({listId,problemIds})=>({url:`/lists/${listId}/items/remove`,method:'POST',body:{problem_ids:problemIds}}),
   transformResponse:(response:any):ListRemoveResult=>({
    removedProblemIds:response.removed_problem_ids??[],absentProblemIds:response.absent_problem_ids??[],
    order:response.order.map((item:any)=>({problemId:item.problem_id,position:item.position})),rebalanced:response.rebalanced,
   }),
   invalidatesTags:(_result,_error,arg)=>IndividualPostTag(arg.listId),
  }),
	}),
});

export const { useCreateListMutation, useGetListQuery } = listApi;
