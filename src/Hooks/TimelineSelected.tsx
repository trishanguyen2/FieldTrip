import { ReactNode, createContext, useContext, useState } from "react";

export interface TimelineSelectedContextType {
  wasTimelineSelected: boolean;
  setWasTimelineSelected: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TimelineSelectedContext = createContext<
  TimelineSelectedContextType | undefined
>(undefined);

export function useTimelineSelectedContext() {
  const timelineSelectedContext = useContext(TimelineSelectedContext);
  if (!timelineSelectedContext) {
    throw "No provider for Timeline Selected Context, can't use without provider!";
  }
  return timelineSelectedContext;
}

export function TimelineSelectedProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [wasTimelineSelected, setWasTimelineSelected] = useState(false);

  return (
    <TimelineSelectedContext.Provider
      value={{ wasTimelineSelected, setWasTimelineSelected }}
    >
      {children}
    </TimelineSelectedContext.Provider>
  );
}
