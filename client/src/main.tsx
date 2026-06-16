import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ask the browser to keep our IndexedDB data from being evicted under storage
// pressure — important for an offline-first app whose data lives only locally.
if (navigator.storage?.persist) {
  void navigator.storage.persisted().then((already) => {
    if (!already) void navigator.storage.persist();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
