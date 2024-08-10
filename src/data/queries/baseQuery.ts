import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { BACKEND_API_URL } from "../../util/env";
import { StorageService } from "../../util/StorageService";

export function createBaseQuery(append: string = "") {
	return fetchBaseQuery({
		baseUrl: BACKEND_API_URL + append,
		prepareHeaders: (headers) => {
			const token = StorageService.getJWTToken();
			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}
			return headers;
		}
	});
}