import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import { BACKEND_API_URL } from "../../util/env";

export const baseQuery = fetchBaseQuery({ baseUrl: BACKEND_API_URL })