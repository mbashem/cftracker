import { useState } from "react";
import AddButton from "../common/AddButton";
import CloseButton from "../common/CloseButton";
import TextInputForm from "../common/TextInputForm";

interface HomeHeaderProps {
  handles: readonly string[];
  onAddHandle: (handle: string) => void;
  onRemoveHandle: (handle: string) => void;
}

function formatHandle(handle: string) {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function HomeHeader({ handles, onAddHandle, onRemoveHandle }: HomeHeaderProps) {
  const hasHandles = handles.length > 0;
  const handleLabel = handles.length === 1 ? "Current handle" : "Current handles";
  const [showHandleInput, setShowHandleInput] = useState(false);

  return (
    <header className="mb-4">
      <h1 className="h2 fw-bold mb-3">Home</h1>
      <div className="d-flex flex-wrap align-items-center gap-2">
        {hasHandles ? (
          <>
            <span className="home-context-label fw-semibold">{handleLabel}</span>
            {handles.map((handle) => (
              <span
                className="home-handle-badge rounded-pill d-inline-flex align-items-center gap-2"
                key={handle}
              >
                <span>{formatHandle(handle)}</span>
                <CloseButton
                  label={`Remove ${formatHandle(handle)}`}
                  onClick={() => onRemoveHandle(handle)}
                />
              </span>
            ))}
          </>
        ) : (
          <div className="d-inline-flex align-items-center gap-2 home-context-empty rounded-pill">
            <span className="home-context-dot" aria-hidden="true" />
            <span>No Codeforces handle selected</span>
          </div>
        )}
        {showHandleInput && (
          <TextInputForm
            label="Add Codeforces handle"
            placeholder="Codeforces handle"
            formClassName="home-handle-input"
            inputClassName="bg-transparent text-reset"
            onSubmit={(handle) => {
              onAddHandle(handle);
              setShowHandleInput(false);
            }}
          />
        )}
        <AddButton
          label="Add Codeforces handle"
          onClick={() => setShowHandleInput((isVisible) => !isVisible)}
        />
      </div>
    </header>
  );
}

export default HomeHeader;
