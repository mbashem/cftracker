import { toast } from "react-toastify";

function useToast() {
	function showGeneralToast(message: string) {
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

	function showErrorToast(message: string) {
		toast.error(message, {
			position: "top-right",
			autoClose: 1000,
			hideProgressBar: false,
			closeOnClick: true,
			pauseOnHover: true,
			draggable: true,
			progress: undefined,
			theme: "dark",
		});
	}

	return {
		showGeneralToast,
		showErrorToast
	};
}

export default useToast;