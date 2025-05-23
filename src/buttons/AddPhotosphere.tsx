import dayjs, { Dayjs } from "dayjs";
import { MuiFileInput } from "mui-file-input";
import { useState } from "react";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import {
  Photosphere,
  VFE,
  newID,
} from "../Pages/PageUtility/DataStructures.ts";
import PhotosphereLocationSelector from "../PhotosphereFeatures/PhotosphereLocationSelector.tsx";
import { alertMUI } from "../UI/StyledDialogWrapper.tsx";

interface AddPhotosphereProps {
  onAddPhotosphere: (newPhotosphere: Photosphere, date?: Dayjs) => void;
  onCancel: () => void;
  vfe: VFE;
  isTimestep?: boolean;
}

function AddPhotosphere({
  onAddPhotosphere,
  onCancel,
  vfe,
  isTimestep,
}: AddPhotosphereProps): JSX.Element {
  const [photosphereID, setPhotosphereID] = useState("");
  const [panoImage, setPanoImage] = useState("");
  const [panoFile, setPanoFile] = useState<File | null>(null);
  const [audioFileStr, setAudioFileStr] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());

  const map = vfe.map;

  function handleImageChange(file: File | null) {
    if (file) {
      setPanoFile(file);
      setPanoImage(URL.createObjectURL(file));
    }
  }

  function handleAudioChange(file: File | null) {
    if (file) {
      setAudioFile(file);
      setAudioFileStr(URL.createObjectURL(file));
    }
  }

  async function handlePhotosphereAdd() {
    if (!photosphereID || !panoImage) {
      await alertMUI("Please, provide a name and source file.");
      return;
    }

    const newPhotosphere: Photosphere = {
      id: photosphereID,
      src: { tag: "Runtime", id: newID(), path: panoImage },
      center: selectedCenter ?? undefined,
      hotspots: {},
      backgroundAudio: audioFileStr
        ? { tag: "Runtime", id: newID(), path: audioFileStr }
        : undefined,
      timeline: {},
    };
    if (isTimestep) {
      onAddPhotosphere(newPhotosphere, selectedDate ? selectedDate : undefined);
    } else {
      onAddPhotosphere(newPhotosphere);
    }

    setPhotosphereID("");
    setPanoImage("");
    setAudioFileStr("");
  }

  return (
    <Dialog open={true} onClose={onCancel}>
      <DialogTitle>Add New Photosphere</DialogTitle>
      <DialogContent sx={{ overflow: "visible" }}>
        <Stack gap={2}>
          <TextField
            required
            label="Photosphere Name"
            value={photosphereID}
            onChange={(e) => {
              setPhotosphereID(e.target.value);
            }}
          />
          <MuiFileInput
            required
            placeholder="Upload Panorama *"
            value={panoFile}
            onChange={handleImageChange}
            inputProps={{ accept: "image/*" }}
            InputProps={{
              startAdornment: <AttachFileIcon />,
            }}
          />
          <MuiFileInput
            placeholder="Upload Background Audio"
            value={audioFile}
            onChange={handleAudioChange}
            inputProps={{ accept: "audio/*" }}
            InputProps={{
              startAdornment: <AttachFileIcon />,
            }}
          />
          {isTimestep && (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={selectedDate}
                onChange={(newDate) => setSelectedDate(newDate)}
              />
            </LocalizationProvider>
          )}
          {!isTimestep && map && (
            <Button
              variant="outlined"
              onClick={() => {
                setMapDialogOpen(true);
              }}
            >
              Select Photosphere Location
            </Button>
          )}

          {map && mapDialogOpen && (
            <PhotosphereLocationSelector
              navMap={map}
              initialPosition={selectedCenter}
              onSelect={(position) => {
                setSelectedCenter(position);
                setMapDialogOpen(false);
              }}
              onCancel={() => {
                setMapDialogOpen(false);
              }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            void handlePhotosphereAdd();
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddPhotosphere;
