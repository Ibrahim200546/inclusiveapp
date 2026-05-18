import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeNativeUpdates } from "./lib/native-updates";

void initializeNativeUpdates();

createRoot(document.getElementById("root")!).render(<App />);
