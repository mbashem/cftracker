import { useState } from "react";
import { List } from "../../types/list";

function useListPage() {

	const [lists, setList] = useState<List[]>([]);

	return {
		lists
	};
}

export default useListPage;