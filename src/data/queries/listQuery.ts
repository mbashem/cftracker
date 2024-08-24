import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseQuery';
import { List, ListWithItem } from '../../types/list';

export const listApi = createApi({
	reducerPath: 'listApi',
	baseQuery: createBaseQuery(),
	endpoints: (builder) => ({
		getAllLists: builder.query<List[], void>({
			query: () => ({
				url: `/lists`,
				method: 'GET',
			}),
			transformResponse: (response: any) => {
				return response.lists;
			}
		}),
		createList: builder.mutation<List, Partial<List>>({
			query: (body) => ({
				url: `/lists`,
				method: 'POST',
				body,
			}),
		}),
		getList: builder.query<ListWithItem, number>({
			query: (listID) => ({
				url: `/lists/${listID}`,
				method: 'GET',
			}),
		}),
		updateListName: builder.mutation<void, { listID: number; name: string; }>({
			query: ({ listID, name }) => ({
				url: `/lists/${listID}`,
				method: 'PUT',
				body: { name },
			}),
		}),
		deleteList: builder.mutation<void, number>({
			query: (listID) => ({
				url: `/lists/${listID}`,
				method: 'DELETE',
			}),
		}),
		addToList: builder.mutation<void, { listID: number; item: ListItem; }>({
			query: ({ listID, item }) => ({
				url: `/lists/${listID}/item`,
				method: 'PUT',
				body: item,
			}),
		}),
		deleteFromList: builder.mutation<void, { listID: number; problemID: string; }>({
			query: ({ listID, problemID }) => ({
				url: `/lists/${listID}/item`,
				method: 'DELETE',
				body: { problem_id: problemID },
			}),
		}),

	}),
});

export const { useCreateListMutation, useGetListQuery } = listApi;