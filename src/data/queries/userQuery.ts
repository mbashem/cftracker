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
		/** Check frontend eligibility without creating OAuth state or following provider redirects. */
		prepareGitHubLogin: builder.query<{ status: "ready" }, void>({
			query: () => ({
				url: "/auth/github/login", params: { validate_only: "true" }, method: "GET",
				cache: "no-store", redirect: "error",
			}),
		}),
		getProfile: builder.query<User, string>({
			query: () => ({ url: "/user/profile", method: "GET" }),
			transformResponse: (response: Pick<AuthenticationResponse, 'user'>, _meta, token): User => mapUser(response.user, token),
		}),
		authenticate: builder.query<User, { code: string; state: string }>({
			query: (body) => ({
				url: "/auth/github/callback",
				params: body,
				method: 'GET'
			}),
			transformResponse: (response: AuthenticationResponse): User => {
				return mapUser(response.user, response.token);
			}
		}),
	}),
});

export const { useLazyAuthenticateQuery, useLazyPrepareGitHubLoginQuery } = userApi

function mapUser(user: AuthenticationResponse['user'], token: string): User {
	return {
		id: user.id, githubId: user.github_id, githubUsername: user.github_username,
		email: user.email, avatarUrl: user.avatar_url, cfHandle: user.cf_handle,
		cfVerifiedHandle: user.cf_verified_handle, admin: user.admin, jwtToken: token,
	};
}
