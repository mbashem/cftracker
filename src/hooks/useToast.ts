import { toast } from "react-toastify";

function useToast() {
	function popGeneralToast(message: string) {
		toast(message, {
			position: "bottom-right",
			autoClose: 500,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "dark",
		});
	}

	function popErrorToast(message: string) {
		toast(message, {
			position: "bottom-right",
			autoClose: 500,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "dark",
		});
	}

	return {
		popGeneralToast,
		popErrorToast
	};
}

export default useToast;