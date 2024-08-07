import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQuery } from './baseQuery'
import User from '../../types/User'

export const userApi = createApi({
	reducerPath: 'userApi',
	baseQuery: baseQuery,
	endpoints: (builder) => ({
		authenticate: builder.query<User, { code: string }>({
			query: (body) => ({
				url: `/auth/github/callback?code=${body.code}`,
				method: 'GET'
			}),
			transformResponse: (response: any) => {
				let user: User = {
					id: response.user.id,
					githubId: response.user.github_id,
					githubUsername: response.user.github_username,
					email: response.user.email,
					avatarUrl: response.user.avatar_url,
					cfHandle: response.user.cf_handle,
					cfVerified: response.user.cf_verified,
					admin: response.user.admin,
					jwtToken: response.token
				}

				return user;
			}
		}),
	}),
});

export const { useLazyAuthenticateQuery } = userApi