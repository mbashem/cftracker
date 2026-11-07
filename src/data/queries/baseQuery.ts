import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { BACKEND_API_URL } from "../../util/env";
import { StorageService } from "../../util/StorageService";
import { isBackendAccessEnabled } from "../../util/backendAccess";

export function createBaseQuery(append: string = ""): ReturnType<typeof fetchBaseQuery> {
	const baseQuery = fetchBaseQuery({
		baseUrl: BACKEND_API_URL + append,
		credentials: "include",
		prepareHeaders: (headers) => {
			const token = StorageService.getJWTToken();
			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}
			return headers;
		}
	});
	return (args, api, extraOptions) => {
		if (!isBackendAccessEnabled()) {
			return { error: { status: "CUSTOM_ERROR", error: "Backend features are not enabled in this browser." } };
		}
		return baseQuery(args, api, extraOptions);
	};
}
