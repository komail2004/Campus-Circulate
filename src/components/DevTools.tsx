import { useNavigate } from "react-router";
import { localMode } from "../config.ts";
import { sampleUsers } from "../data/sample.ts";
import { useStore } from "../data/storeContext.ts";

// Testing tools while there's no backend. Disappears when localMode is turned off.
export default function DevTools() {
  const { currentUser, signInAsSample, resetLocalData } = useStore();
  const navigate = useNavigate();
  if (!localMode) return null;
  const sampleId = sampleUsers.find((u) => u.id === currentUser?.id)?.id ?? "";

  return (
    <details className="mx-auto max-w-6xl px-4 pb-6 text-sm text-muted">
      <summary className="cursor-pointer py-2 font-medium">Local mode tools</summary>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <label className="flex items-center gap-2">
          Sign in as
          <select
            className="field h-10 w-auto"
            value={sampleId}
            onChange={async (event) => {
              if (!event.target.value) return;
              await signInAsSample(event.target.value);
              navigate("/");
            }}
          >
            <option value="">Choose a sample student</option>
            {sampleUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-outline h-10"
          onClick={async () => {
            if (!window.confirm("Reset local data? Accounts, listings and deals made in this browser will be removed.")) return;
            await resetLocalData();
            navigate("/");
          }}
        >
          Reset local data
        </button>
      </div>
    </details>
  );
}
