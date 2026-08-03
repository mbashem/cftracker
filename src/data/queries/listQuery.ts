import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseQuery';
import { jsonToList, jsonToListItem, List, ListItem, ListWithItem } from '../../types/list';

export enum ListApiTags {
	Lists = "Lists"
}
function IndividualPostTag(listId: number) {
	return [{ "type": ListApiTags.Lists, "id": listId }];
}

export const listApi = createApi({
	reducerPath: 'listApi',
	baseQuery: createBaseQuery(),
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
		addToList: builder.mutation<ListItem, { listId: number; problemId: string; position: number; }>({
			query: ({ listId, problemId, position }) => ({
				url: `/lists/${listId}/item`,
				method: 'PUT',
				body: { "problem_id": problemId, position },
			}),
			transformResponse: (response: any) => jsonToListItem(response.item),
			invalidatesTags: (_result, _error, arg, _meta) => IndividualPostTag(arg.listId),
		}),
		deleteFromList: builder.mutation<void, { listId: number; problemId: string; }>({
			query: ({ listId, problemId }) => ({
				url: `/lists/${listId}/item/${problemId}`,
				method: 'DELETE'
			}),
			invalidatesTags: (_result, _error, arg, _meta) => IndividualPostTag(arg.listId),
		}),
	}),
});

export const { useCreateListMutation, useGetListQuery } = listApi;
