import { useState } from "react";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { VFE } from "../Pages/PageUtility/DataStructures";
import PhotosphereSelector, {
  PhotosphereSelectorProps,
} from "../PhotosphereFeatures/PhotosphereSelector";
import { alertMUI } from "../UI/StyledDialogWrapper";

interface RemovePhotosphereProps {
  onClose: () => void;
  vfe: VFE;
  onRemovePhotosphere: (PhotosphereID: string) => void; // Function to remove photosphere from navigation map
}

function RemovePhotosphere({
  onClose,
  vfe,
  onRemovePhotosphere,
}: RemovePhotosphereProps): JSX.Element {
  const [selectedPhotosphere, setSelectedPhotosphere] = useState<string>("");

  // Dummy options for the PhotosphereSelector
  const options: string[] = Object.keys(vfe.photospheres);

  // Create the props for the PhotosphereSelector component
  const selectorProps: PhotosphereSelectorProps = {
    options: options,
    value: selectedPhotosphere,
    setValue: setSelectedPhotosphere,
    defaultPhotosphereID: vfe.defaultPhotosphereID,
  };

  async function handleRemovePhotosphere() {
    if (selectedPhotosphere === vfe.defaultPhotosphereID) {
      await alertMUI(
        `"${selectedPhotosphere}" is the default scene and cannot be removed.\n`
      );
      return;
    }
    
    if (!selectedPhotosphere) {
      await alertMUI("Please select a photosphere to remove.");
      return;
    }
    onRemovePhotosphere(selectedPhotosphere);
    onClose();
  }

  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>Remove Photosphere</DialogTitle>
      <DialogContent sx={{ overflow: "visible" }}>
        <Stack gap={2}>
          <Typography>
            Select a photosphere to remove from the list below
          </Typography>
          <Box sx={{ margin: "auto" }}>
            <PhotosphereSelector {...selectorProps} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            void handleRemovePhotosphere();
          }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RemovePhotosphere;
