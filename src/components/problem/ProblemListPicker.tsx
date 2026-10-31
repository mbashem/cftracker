import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { Link } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faListUl, faPlus } from "@fortawesome/free-solid-svg-icons";
import useUser from "../../hooks/useUser";
import useListApi from "../../data/hooks/useListApi";
import useAppSearchParams from "../../hooks/useSearchParam";
import useTheme from "../../data/hooks/useTheme";
import { SearchKeys } from "../../util/constants";
import { Path } from "../../util/route/path";
import "../common/IconButton.css";

export default function ProblemListPicker({ problemId }: { problemId?: string }) {
  const { isAuthenticated, user } = useUser();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(new Set<number>());
  const [message, setMessage] = useState("");
  const [addError, setAddError] = useState("");
  const generation = useRef(0);
  const adding = useRef(false);
  const panelId = useId();
  const api = useListApi();
  const { data: lists, isFetching, error, refetch } = api.useGetAllListsQuery({ skip: !open });
  const { getSearchParam, updateSearchParam, deleteSearchParam } = useAppSearchParams();
  const selectedId = problemId === undefined ? getSearchParam(SearchKeys.ListId) : undefined;

  useEffect(() => {
    setOpen(false); setAdded(new Set()); setMessage(""); setAddError(""); setPending(false); adding.current = false;
    generation.current++;
    return () => { generation.current++; };
  }, [isAuthenticated, user?.id, user?.jwtToken, problemId]);
  if (!isAuthenticated) return undefined;

  async function selectList(listId: number, name: string) {
    if (problemId === undefined) {
      updateSearchParam(SearchKeys.ListId, String(listId));
      setOpen(false);
      return;
    }
    if (adding.current || added.has(listId)) return;
    adding.current = true; setPending(true); setMessage(""); setAddError("");
    const currentGeneration = generation.current;
    try {
      const list = await api.getListWithItems(listId);
      if (generation.current !== currentGeneration) return;
      const exists = list.items.some(item => item.problemId === problemId);
      if (!exists) {
        const position = list.items.reduce((max, item) => Math.max(max, item.position), -1) + 1;
        await api.addProblemToList(listId, problemId, position);
      }
      if (generation.current !== currentGeneration) return;
      setAdded(current => new Set(current).add(listId));
      setMessage(exists ? `${problemId} is already in ${name}.` : `Added ${problemId} to ${name}.`);
    } catch (error) {
      if (generation.current === currentGeneration) setAddError(error instanceof Error ? error.message : "Could not add problem to list.");
    } finally {
      if (generation.current === currentGeneration) { adding.current = false; setPending(false); }
    }
  }

  const choices = (
    <section id={panelId} aria-label="Choose a list" className={theme.bgText}>
      {isFetching && <p role="status">Loading your lists…</p>}
      {error !== undefined && <div role="alert">Could not load your lists. <button type="button" className={`btn ${theme.btn}`} onClick={() => { void refetch(); }}>Retry</button></div>}
      {message && <p role="status">{message}</p>}
      {addError && <p role="alert">{addError}</p>}
      {pending && <p role="status">Adding {problemId}…</p>}
      <div className="d-flex flex-wrap align-items-start gap-2">
        {lists?.map(list => (
          <button key={list.id} type="button" aria-pressed={selectedId === String(list.id)}
            aria-label={problemId === undefined ? undefined : `${added.has(list.id) ? "Added" : "Add"} ${problemId} to ${list.name}`}
            disabled={pending || added.has(list.id)} className={`btn text-wrap text-break ${theme.btn}`} style={{ maxWidth: "100%" }}
            onClick={() => { void selectList(list.id, list.name); }}>{list.name}{added.has(list.id) ? " ✓" : ""}</button>
        ))}
      </div>
      {!isFetching && error === undefined && lists?.length === 0 && <p>You have no lists yet. <Link to={Path.Lists}>Create a list</Link> to start adding problems.</p>}
    </section>
  );

  return (
    <div className={problemId === undefined ? "container p-0 pt-3" : "d-inline-block"}>
      <div className="d-flex align-items-start flex-wrap gap-2">
        <button type="button" className={`btn ${problemId === undefined ? theme.btn : "btn-ghost"}`} aria-label={problemId === undefined ? undefined : `Add ${problemId} to a list`}
          title={problemId === undefined ? undefined : `Add ${problemId} to a list`}
          aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
          <FontAwesomeIcon icon={problemId === undefined ? faListUl : faPlus} />
          {problemId === undefined && (selectedId ? " Change list" : " Add problems to a list")}
        </button>
        {selectedId && <button type="button" className={`btn ${theme.btn}`} onClick={() => deleteSearchParam(SearchKeys.ListId)}>Stop adding to list</button>}
      </div>
      {problemId !== undefined ? (
        <Modal show={open} onHide={() => setOpen(false)} contentClassName={theme.bgText}>
          <Modal.Header closeButton><Modal.Title>Add {problemId} to a list</Modal.Title></Modal.Header>
          <Modal.Body>{open && choices}</Modal.Body>
        </Modal>
      ) : open && <div className="border rounded p-3 mt-2">{choices}</div>}
    </div>
  );
}
