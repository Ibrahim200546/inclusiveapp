import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { PracticeApp } from "./PracticeApp";
import { installLegacyNavigation } from "./legacy/navigation";
import { NavigationContext } from "./navigation/navigationContext";

// The module entry runs after classic scripts and before DOMContentLoaded.
// Install navigation first: DOMContentLoaded initializers register hooks on it.
const navigator = installLegacyNavigation(window, document);

// Mount synchronously so the remaining legacy initializers see a complete
// page, including React islands.
const container = document.querySelector<HTMLElement>("[data-practice-root]");
if (!container) throw new Error("Practice root is missing");
const root = createRoot(container);
flushSync(() => root.render(
  <NavigationContext.Provider value={navigator}>
    <PracticeApp />
  </NavigationContext.Provider>,
));

if (import.meta.hot) {
  import.meta.hot.dispose(() => root.unmount());
}
