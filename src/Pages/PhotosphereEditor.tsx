import { MuiFileInput } from "mui-file-input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Box, Button, Stack } from "@mui/material";

import { VisitedState } from "../Hooks/HandleVisit.tsx";
import { useVFELoaderContext } from "../Hooks/VFELoaderContext.tsx";
import PhotosphereTutorialEditor from "../PhotosphereFeatures/PhotosphereTutorialEditor";
import { alertMUI, confirmMUI } from "../UI/StyledDialogWrapper.tsx";
import AddAudio from "../buttons/AddAudio.tsx";
import AddHotspot from "../buttons/AddHotspot.tsx";
import AddNavmap from "../buttons/AddNavmap.tsx";
import AddPhotosphere from "../buttons/AddPhotosphere.tsx";
import ChangePhotosphere from "../buttons/ChangePhotosphere.tsx";
import EditNavMap from "../buttons/EditNavMap.tsx";
import RemovePhotosphere from "../buttons/RemovePhotosphere.tsx";
import {
  Hotspot2D,
  Hotspot3D,
  NavMap,
  Photosphere,
  PhotosphereLink,
  VFE,
  newID,
  photosphereLinkTooltip,
} from "./PageUtility/DataStructures.ts";
import { deleteStoredVFE, save } from "./PageUtility/FileOperations.ts";
import { useGamificationState } from "./PageUtility/PointsInterface.tsx";
import {
  HotspotUpdate,
  convertRuntimeToStored,
  convertVFE,
  updatePhotosphereHotspot,
} from "./PageUtility/VFEConversion.ts";
import PhotosphereViewer from "./PhotosphereViewer.tsx";

/** Convert from radians to degrees */
function radToDeg(num: number): number {
  return num * (180 / Math.PI);
}

interface PhotosphereEditorProps {
  isGamified: boolean;
}

function PhotosphereEditor({
  isGamified,
}: PhotosphereEditorProps): JSX.Element {
  const { vfe, onUpdateVFE, currentPS, onChangePS } = useVFELoaderContext();
  const photosphereOptions = Object.keys(vfe.photospheres);
  // Get existing hotspots from the current photosphere
  const existingHotspots = vfe.photospheres[currentPS].hotspots;

  const navigate = useNavigate();

  const [updateTrigger, setUpdateTrigger] = useState(0); // used to force refresh after changes

  const [showAddPhotosphere, setShowAddPhotosphere] = useState(false);
  const [showAddNavMap, setShowAddNavMap] = useState(false); // State to manage whether to show AddNavmap

  const [showAddHotspot, setShowAddHotspot] = useState(false);
  const [elevation, setElevation] = useState(0);
  const [direction, setDirection] = useState(0);

  const [showAddFeatures, setShowAddFeatures] = useState(false);
  const [showChangeFeatures, setShowChangeFeatures] = useState(false);
  const [showRemoveFeatures, setShowRemoveFeatures] = useState(false);

  const [gamifiedState, SwapGamifyState] = useGamificationState(isGamified);

  const visitedState = JSON.parse(
    localStorage.getItem("visitedState") ?? "{}",
  ) as VisitedState;
  const [showChangePhotosphere, setShowChangePhotosphere] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null); // for MuiInputFile

  const [showRemovePhotosphere, setShowRemovePhotosphere] = useState(false);
  const [showEditNavMap, setShowEditNavMap] = useState(false);

  // Filter hotspots to find used photospheres
  const usedPhotospheres = Object.values(existingHotspots)
    .filter(
      (hotspot): hotspot is Hotspot3D & { data: PhotosphereLink } =>
        hotspot.data.tag === "PhotosphereLink",
    )
    .map((hotspot) => hotspot.data.photosphereID);

  // Filter available photosphere options
  const availablePhotosphereOptions = photosphereOptions.filter(
    (option) => option !== currentPS && !usedPhotospheres.includes(option),
  );

  function handleEditNavMap(updatedPhotospheres: Record<string, Photosphere>) {
    const updatedVFE: VFE = {
      ...vfe,
      photospheres: updatedPhotospheres,
    };

    onUpdateVFE(updatedVFE);
    setShowEditNavMap(false);
    setUpdateTrigger((prev) => prev + 1);
  }

  async function handleUpdateHotspot(
    hotspotPath: string[],
    update: HotspotUpdate | null,
  ) {
    if (update === null) {
      const confirmed = await confirmMUI("Remove Hotspot?", {
        details:
          "The hotspot will be permanently removed and its data will be lost.",
        accept: "Remove",
      });
      if (!confirmed) return;
    }

    const updatedPhotosphere = updatePhotosphereHotspot(
      vfe.photospheres[currentPS],
      hotspotPath,
      update,
    );

    const updatedVFE = {
      ...vfe,
      photospheres: {
        ...vfe.photospheres,
        [currentPS]: updatedPhotosphere,
      },
    };

    const hotspotList: (Hotspot2D | Hotspot3D)[] = [
      vfe.photospheres[currentPS].hotspots[hotspotPath[0]],
    ];
    if (hotspotPath.length > 1) {
      let hotspotItem: Hotspot2D | Hotspot3D =
        vfe.photospheres[currentPS].hotspots[hotspotPath[0]];

      for (let i = 1; i < hotspotPath.length; ++i) {
        if ("hotspots" in hotspotItem.data) {
          hotspotItem = hotspotItem.data.hotspots[hotspotPath[i]];
          hotspotList.push(hotspotItem);
        }
      }
    }
    sessionStorage.setItem("listEditedHotspot", JSON.stringify(hotspotList));

    onUpdateVFE(updatedVFE);
    setUpdateTrigger((prev) => prev + 1);
  }

  async function handleRemovePhotosphere(photosphereId: string) {
    if (!photosphereId) {
      await alertMUI("Photosphere not found.");
      return;
    }

    // Create a new object without the removed photosphere
    const remainingPhotospheres = Object.fromEntries(
      Object.entries(vfe.photospheres).filter(([key]) => key !== photosphereId),
    );

    if (Object.keys(remainingPhotospheres).length === 0) {
      // No more photospheres available
      const confirmed = await confirmMUI(
        "This is the last photosphere. The VFE will be deleted and you will return to the home page. Delete the VFE?",
        { accept: "Delete" },
      );
      if (confirmed) {
        await deleteStoredVFE(vfe.name);
        navigate("/"); // Redirect to home
      }
      return;
    }

    // nextPhotosphereId will never be undefined
    const nextPhotosphereId = Object.keys(remainingPhotospheres)[0];

    const newDefaultPhotosphereID =
      photosphereId === vfe.defaultPhotosphereID
        ? nextPhotosphereId
        : vfe.defaultPhotosphereID;

    const updatedVFE: VFE = {
      ...vfe,
      photospheres: updatePhotospheres(
        remainingPhotospheres,
        photosphereId,
        null,
      ),
      defaultPhotosphereID: newDefaultPhotosphereID,
    };

    onUpdateVFE(updatedVFE);
    // After updating the state
    setUpdateTrigger((prev) => prev + 1);
    if (photosphereId !== newDefaultPhotosphereID) {
      onChangePS(newDefaultPhotosphereID); // Navigate to the new or remaining default photosphere
    } else {
      onChangePS(nextPhotosphereId);
    }
    handleCloseRemovePhotosphere();
  }

  function handleAddPhotosphere(newPhotosphere: Photosphere) {
    const updatedVFE: VFE = {
      ...vfe,
      photospheres: {
        ...vfe.photospheres,
        [newPhotosphere.id]: newPhotosphere,
      },
    };

    onUpdateVFE(updatedVFE); // Propagate the change to the AppRoot
    onChangePS(currentPS); // Switch to new photosphere
    setShowAddPhotosphere(false);
    setUpdateTrigger((prev) => prev + 1);
  }

  function handleCreateNavMap(updatedNavMap: NavMap) {
    const updatedVFE: VFE = {
      ...vfe,
      map: updatedNavMap,
    };
    onUpdateVFE(updatedVFE); // Propagate the change to the parent component
    setShowAddNavMap(false); // Close the AddNavMap component
    setUpdateTrigger((prev) => prev + 1);
  }

  function handleAddHotspot(newHotspot: Hotspot3D) {
    const photosphere: Photosphere = vfe.photospheres[currentPS];

    photosphere.hotspots[newHotspot.id] = newHotspot;

    onUpdateVFE(vfe);
    setShowAddHotspot(false);
    setUpdateTrigger((prev) => prev + 1);
  }

  /** Get and use elevation/direction from viewer click */
  function handleLocation(velevation: number, vdirection: number) {
    setElevation(radToDeg(velevation));
    setDirection(radToDeg(vdirection));
  }

  // Reset all states so we dont have issues with handling different components at the same time
  function resetStates() {
    setShowAddPhotosphere(false);
    setShowAddNavMap(false);
    setShowAddHotspot(false);
    setShowChangePhotosphere(false);
    setShowRemovePhotosphere(false);
    setShowEditNavMap(false);
    setElevation(0);
    setDirection(0);
  }

  /** Render the actual component based on states */
  function ActiveComponent() {
    if (showAddPhotosphere)
      return (
        <AddPhotosphere
          onAddPhotosphere={handleAddPhotosphere}
          onCancel={resetStates}
          vfe={vfe}
        />
      );
    if (showAddNavMap)
      return (
        <AddNavmap onCreateNavMap={handleCreateNavMap} onClose={resetStates} />
      );
    if (showEditNavMap)
      return (
        <EditNavMap
          onClose={resetStates}
          vfe={vfe}
          onUpdateVFE={handleEditNavMap}
        />
      );
    if (showAddHotspot)
      return (
        <AddHotspot
          onCancel={resetStates}
          onAddHotspot={handleAddHotspot}
          elevation={elevation}
          direction={direction}
          photosphereOptions={availablePhotosphereOptions}
        />
      );
    if (showChangePhotosphere) {
      return (
        <ChangePhotosphere
          ps={vfe.photospheres[currentPS]}
          onCancel={resetStates}
          onChangePhotosphere={handleChangePhotosphere}
          defaultPhotosphereID={vfe.defaultPhotosphereID}
          onChangeDefault={(newID) => {
            onUpdateVFE({ ...vfe, defaultPhotosphereID: newID });
          }}
        />
      );
    }

    if (showRemovePhotosphere)
      return (
        <RemovePhotosphere
          onRemovePhotosphere={(id) => {
            void handleRemovePhotosphere(id);
          }}
          onClose={handleCloseRemovePhotosphere}
          vfe={vfe}
        />
      );
    return null;
  }

  async function handleExport() {
    const convertedVFE = await convertVFE(
      vfe,
      convertRuntimeToStored(vfe.name),
    );
    await save(convertedVFE);
  }

  function handleAudioChange(file: File | null) {
    setAudioFile(file);
    const updatedVFE = AddAudio(file, vfe, currentPS); // Call the AddAudio function to handle audio change

    onUpdateVFE(updatedVFE);
    setUpdateTrigger((prev) => prev + 1);
  }

  /**
   * Edit parts of a previously created photosphere.
   * @param name Photosphere's new/old ID
   * @param background objectURL for new/old panorama
   */
  function handleChangePhotosphere(name: string, background: string) {
    const currentPhotosphere = vfe.photospheres[currentPS];

    //making updated photosphere list minus the currentPS
    let updatedPhotospheres: Record<string, Photosphere> = updatePhotospheres(
      vfe.photospheres,
      currentPS,
      name,
    );

    //making currentPS entry with name
    updatedPhotospheres[name] = { ...currentPhotosphere, id: name };
    const updatedVisitedState: VisitedState = { ...visitedState };
    updatedVisitedState[name] = visitedState[currentPS];

    const updatedDefaultPhotosphereID =
      vfe.defaultPhotosphereID === currentPS ? name : vfe.defaultPhotosphereID;

    updatedPhotospheres[currentPS] = {
      ...currentPhotosphere,
      src: { tag: "Runtime", id: newID(), path: background },
    };

    //remove photosphere that has been renamed
    if (name != currentPS) {
      const { [currentPS]: _, ...withoutCurrentPS } = updatedPhotospheres;
      updatedPhotospheres = withoutCurrentPS;
    }

    const updatedVFE: VFE = {
      ...vfe,
      defaultPhotosphereID: updatedDefaultPhotosphereID,
      photospheres: updatedPhotospheres,
    };

    localStorage.setItem("visitedState", JSON.stringify(updatedVisitedState));

    onChangePS(name); //set currentPS index to new name to access it correctly moving forward
    onUpdateVFE(updatedVFE);
    setShowChangePhotosphere(false);
    setUpdateTrigger((prev) => prev + 1);

    return;
  }

  function handleRemovePhotosphereClick() {
    setShowRemovePhotosphere(true);
  }

  function handleCloseRemovePhotosphere() {
    setShowRemovePhotosphere(false);
  }

  async function handleRemoveNavMap() {
    const confirmed = await confirmMUI("Remove Navigation Map?", {
      details: "The map will be permanently removed and its data will be lost.",
      accept: "Remove",
    });
    if (!confirmed) return;

    const updatedVFE: VFE = {
      ...vfe,
      map: undefined,
    };

    onUpdateVFE(updatedVFE); // Propagate the change to the parent component
    setUpdateTrigger((prev) => prev + 1);
  }

  /** Update PhotosphereLink hotspots with new photosphere ID */
  function updateHotspots(
    photosphere: Photosphere,
    oldPhotosphereID: string,
    newPhotosphereID: string | null,
  ): Photosphere {
    const hotspots: Record<string, Hotspot3D> = {};

    // iterate through hotspots in the current ps
    for (const [id, hotspot] of Object.entries(photosphere.hotspots)) {
      if (
        hotspot.data.tag === "PhotosphereLink" &&
        hotspot.data.photosphereID === oldPhotosphereID
      ) {
        if (newPhotosphereID !== null) {
          hotspots[id] = {
            ...hotspot,
            tooltip: photosphereLinkTooltip(newPhotosphereID),
            data: { tag: "PhotosphereLink", photosphereID: newPhotosphereID },
          };
        }
      } else {
        hotspots[id] = hotspot;
      }
    }

    return { ...photosphere, hotspots };
  }

  /** Update photosphere name in each photosphere's PhotosphereLink hotspots */
  function updatePhotospheres(
    photospheres: Record<string, Photosphere>,
    oldPhotosphereID: string,
    newPhotosphereID: string | null,
  ): Record<string, Photosphere> {
    return Object.fromEntries(
      Object.entries(photospheres)
        .filter(([key]) => key !== oldPhotosphereID)
        .map(([key, photosphere]) => {
          // update hotspots in the current photosphere
          const updatedPhotosphere = updateHotspots(
            photosphere,
            oldPhotosphereID,
            newPhotosphereID,
          );
          return [key, updatedPhotosphere];
        }),
    );
  }

  const [runTutorial, setRunTutorial] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  return (
    <Box sx={{ height: "100vh" }}>
      <PhotosphereTutorialEditor
        runTutorial={runTutorial}
        stepIndex={stepIndex}
        setRunTutorial={setRunTutorial}
        setStepIndex={setStepIndex}
      />
      <Stack
        sx={{
          position: "absolute",
          zIndex: 1000,
          left: "20px",
          top: "20px",
          background: "rgba(255, 255, 255, 0.8)",
          borderRadius: "8px",
          padding: "10px",
        }}
      >
        {!showAddFeatures && !showChangeFeatures && !showRemoveFeatures && (
          <>
            <Button
              className="add-features-button"
              sx={{ margin: "10px 0" }}
              onClick={() => {
                setShowAddFeatures(true);
              }}
              variant="contained"
            >
              Add Features
            </Button>
            <Button
              className="edit-features-button"
              sx={{
                margin: "10px 0",
              }}
              onClick={() => {
                setShowChangeFeatures(true);
              }}
              variant="contained"
            >
              Edit Features
            </Button>
            <Button
              className="remove-features-button"
              sx={{ margin: "10px 0" }}
              onClick={() => {
                setShowRemoveFeatures(true);
              }}
              variant="contained"
            >
              Remove Features
            </Button>
            <Button
              className="export-button"
              sx={{ margin: "10px 0" }}
              onClick={() => {
                void handleExport();
              }}
              variant="contained"
            >
              Export
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={async () => {
                await SwapGamifyState();
                //correcting for it always setting saved state to the opposite of what it should be for some reason.  Timing issue?
                vfe.gamificationToggle = !gamifiedState;
                console.log(
                  "The gamified state is: " +
                    !gamifiedState +
                    " and the vfe gamification state is: " +
                    vfe.gamificationToggle,
                );
                onUpdateVFE(vfe);
              }}
              variant="contained"
            >
              Gamify!
            </Button>
          </>
        )}
        {showAddFeatures && (
          <>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                resetStates();
                setShowAddPhotosphere(true);
              }}
              variant="contained"
            >
              Add New Photosphere
            </Button>

            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                resetStates();
                setShowAddNavMap(true); // Set state to show AddNavmap
                //Call your setShowAddNavmap function to set the state and display the function
              }}
              variant="contained"
            >
              {vfe.map ? "Change NavMap" : "Add New NavMap"}
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                resetStates();
                //Call your setShowAddHotspot function to set the state and display the function
                setShowAddHotspot(true);
              }}
              variant="contained"
            >
              Add New Hotspot
            </Button>
            <MuiFileInput
              placeholder="Upload Background Audio"
              value={audioFile}
              onChange={handleAudioChange}
              inputProps={{ accept: "audio/*" }}
              InputProps={{
                startAdornment: <AttachFileIcon />,
              }}
              sx={{ width: "275px", margin: "5px 0" }}
            />
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                setShowAddFeatures(false);
              }}
              variant="outlined"
            >
              Back
            </Button>
          </>
        )}

        {showRemoveFeatures && (
          <>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                //remove photosphere
                handleRemovePhotosphereClick();
              }}
              variant="contained"
            >
              Remove Photosphere
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                void handleRemoveNavMap();
              }}
              variant="contained"
            >
              Remove NavMap
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                setShowRemoveFeatures(false);
              }}
              variant="outlined"
            >
              Back
            </Button>
          </>
        )}

        {showChangeFeatures && (
          <>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                resetStates();
                setShowChangePhotosphere(true);
              }}
              variant="contained"
            >
              Edit Photosphere
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                resetStates();
                setShowEditNavMap(true); // Set state to show EditNavmap
              }}
              variant="contained"
            >
              Edit NavMap
            </Button>
            <Button
              sx={{ margin: "10px 0" }}
              onClick={() => {
                setShowChangeFeatures(false);
              }}
              variant="outlined"
            >
              Back
            </Button>
          </>
        )}
      </Stack>
      <Box style={{ width: "100%", height: "100%" }}>
        <PhotosphereViewer
          onViewerClick={handleLocation}
          key={updateTrigger}
          photosphereOptions={availablePhotosphereOptions}
          onUpdateHotspot={(hotspotPath, update) => {
            void handleUpdateHotspot(hotspotPath, update);
          }}
          isGamified={gamifiedState ?? false}
          isEditor={true}
        />
        <ActiveComponent />
      </Box>
    </Box>
  );
}

export default PhotosphereEditor;
