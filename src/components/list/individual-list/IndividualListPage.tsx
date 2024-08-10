import useIndividualListPage from "./useIndividualListPage";

interface Props {
  id: number;
}

function IndividualListPage({ id }: Props) {
  const {} = useIndividualListPage({ id });

  return <>{id}</>;
}

export default IndividualListPage;
