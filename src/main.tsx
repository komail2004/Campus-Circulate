import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import { localMode } from "./config.ts";
import LocalStoreProvider from "./data/StoreProvider.tsx";
const FirebaseStoreProvider = lazy(() => import("./data/FirebaseStoreProvider.tsx"));
const StoreProvider = localMode ? LocalStoreProvider : FirebaseStoreProvider;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<p className="p-8 text-center">Loading CampusCirculate…</p>}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
