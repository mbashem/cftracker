import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";

function useStatPage() {
	const { rawSubmissions: submissions } = useSubmissionsStore();


	return { submissions };
}

export default useStatPage;