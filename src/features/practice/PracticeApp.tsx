import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PracticeHeader } from "./components/PracticeHeader";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { TopControls } from "./components/TopControls";
import { MainGradeMenu } from "./components/MainGradeMenu";
import { getPracticeLocale, subscribeToPracticeLocale } from "./legacy/bridge";
import { useActiveScreen, useNavigator } from "./navigation/navigationContext";

export function PracticeApp({ headerRoot, mobileNavRoot, topControlsRoot }: {
  headerRoot: HTMLElement; mobileNavRoot: HTMLElement; topControlsRoot: HTMLElement;
}) {
  const navigator = useNavigator();
  const locale = useSyncExternalStore(subscribeToPracticeLocale, getPracticeLocale);
  const active = useActiveScreen() === "levelsScreen";

  return <>
    <MainGradeMenu locale={locale} active={active} onNavigate={navigator.navigate} />
    {createPortal(<PracticeHeader locale={locale} active={active} />, headerRoot)}
    {createPortal(<MobileBottomNav locale={locale} />, mobileNavRoot)}
    {createPortal(<TopControls locale={locale} />, topControlsRoot)}
  </>;
}
