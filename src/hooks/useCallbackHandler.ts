import { useEffect } from "react";
import { matchPath, useNavigate } from "react-router";
import { useLazyAuthenticateQuery } from "../data/queries/userQuery";
import { useLocation } from "react-router";
import { useAppDispatch } from "../data/store";
import { errorAuthenticatingUser, setUser } from "../data/reducers/userSlice";
import useToast from "./useToast";
import { Path } from "../util/constants";
import { LocalStorage } from "../util/localstorage";

function useCallbackHandler() {
	const [authenticate] = useLazyAuthenticateQuery();
	const location = useLocation();
	const dispatch = useAppDispatch();
	const { popErrorToast, popGeneralToast } = useToast();
	const navigate = useNavigate();

	useEffect(() => {
		const query = new URLSearchParams(location.search);
		const code = query.get('code');

		if (matchPath(location.pathname, "/callback/auth-gh") && code !== null) {
			popGeneralToast("Authenticating...");
			authenticate({ code }).unwrap().then(user => {
				dispatch(setUser(user))
				LocalStorage.setJWTToken(user.jwtToken)
			}).catch(err => {
				console.log(err);
				dispatch(errorAuthenticatingUser({ errorMessage: err.data.error }))
				popErrorToast(err.data.error)

			})
			navigate(Path.CONTESTS);
		}

	}, [location]);
}

export default useCallbackHandler;