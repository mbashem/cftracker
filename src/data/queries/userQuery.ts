import { createApi } from '@reduxjs/toolkit/query/react'
import User from '../../types/User'
import { createBaseQuery } from './baseQuery';

interface AuthenticationResponse {
	user: {
		id: number;
		github_id: number;
		github_username: string;
		email: string;
		avatar_url: string;
		cf_handle: string;
		cf_verified_handle: string;
		admin: boolean;
	};
	token: string;
}

export const userApi = createApi({
	reducerPath: 'userApi',
	baseQuery: createBaseQuery(),
	endpoints: (builder) => ({
		authenticate: builder.query<User, { code: string; state: string }>({
			query: (body) => ({
				url: "/auth/github/callback",
				params: body,
				method: 'GET'
			}),
			transformResponse: (response: AuthenticationResponse): User => {
				return {
					id: response.user.id,
					githubId: response.user.github_id,
					githubUsername: response.user.github_username,
					email: response.user.email,
					avatarUrl: response.user.avatar_url,
					cfHandle: response.user.cf_handle,
					cfVerifiedHandle: response.user.cf_verified_handle,
					admin: response.user.admin,
					jwtToken: response.token
				};
			}
		}),
	}),
});

export const { useLazyAuthenticateQuery } = userApi
