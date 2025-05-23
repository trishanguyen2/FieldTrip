import dayjs from "dayjs";
import { useEffect, useState } from "react";

import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

import { useTimelineSelectedContext } from "../Hooks/TimelineSelected";
import { useVFELoaderContext } from "../Hooks/VFELoaderContext";

export interface PhotosphereTimelineSelectProps {
  onSelect: (psId: string) => void;
}

function PhotosphereTimelineSelect({
  onSelect,
}: PhotosphereTimelineSelectProps) {
  const { vfe, currentPS } = useVFELoaderContext();
  const [selected, setSelected] = useState<string>(currentPS);
  const [currentSelected, setCurrentSelected] = useState<string>(currentPS);
  const { wasTimelineSelected, setWasTimelineSelected } =
    useTimelineSelectedContext();
  const parentPS = vfe.photospheres[currentPS].parentPS
    ? vfe.photospheres[vfe.photospheres[currentPS].parentPS]
    : vfe.photospheres[currentPS];
  var timeline: Record<string, string> = parentPS.timeline;
  timeline = { ...timeline, ["Now"]: parentPS.id };

  useEffect(() => {
    if (!vfe.photospheres[currentPS].parentPS && !wasTimelineSelected) {
      setCurrentSelected(currentPS);
      setSelected(currentPS);
    } else if (wasTimelineSelected) {
      // make sure not to change both scenes when
      // going back to parent PS
      onSelect(currentSelected);
    }
  }, [currentPS]);

  function handleChange(e: SelectChangeEvent) {
    setWasTimelineSelected(true);
    setCurrentSelected(e.target.value);
    setSelected(e.target.value);
    onSelect(e.target.value);
  }
  return (
    <Select
      sx={{
        width: "fit-content",
        maxWidth: "110px",
      }}
      value={selected}
      onChange={handleChange}
      size="small"
    >
      {Object.entries(timeline).map(([time, ps]) => {
        let time_string;
        if (time !== "Now") {
          const curr_time = dayjs();
          const pass_time = dayjs(time);
          const difference = curr_time.diff(pass_time, "months");
          time_string =
            "(" + difference + "M ago)" + pass_time.format("YYYY-DD-MM");
        } else {
          time_string = time;
        }
        return (
          <MenuItem key={time} value={ps} sx={{ overflow: "hidden" }}>
            {time_string}
          </MenuItem>
        );
      })}
    </Select>
  );
}

export default PhotosphereTimelineSelect;
