import { Point, Viewer, ViewerConfig } from "@photo-sphere-viewer/core";
import { MapHotspot } from "@photo-sphere-viewer/map-plugin";
import { MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import {
  VirtualTourLink,
  VirtualTourNode,
} from "@photo-sphere-viewer/virtual-tour-plugin";
import { useEffect, useRef, useState } from "react";
import {
  MapPlugin,
  MapPluginConfig,
  MarkersPlugin,
  ReactPhotoSphereViewer,
  VirtualTourPlugin,
  VirtualTourPluginConfig,
} from "react-photo-sphere-viewer";

import { Box, alpha } from "@mui/material";
import { common } from "@mui/material/colors";

import { useVisitedState } from "../Hooks/HandleVisit";
import { useTimelineSelectedContext } from "../Hooks/TimelineSelected";
import { useVFELoaderContext } from "../Hooks/VFELoaderContext";
import {
  Hotspot2D,
  Hotspot3D,
  NavMap,
  Photosphere,
} from "../Pages/PageUtility/DataStructures";
import PopOver from "../Pages/PageUtility/PopOver";
import { ViewerProps } from "../Pages/PhotosphereViewer";
import { LinkArrowIconHTML } from "../UI/LinkArrowIcon";

/** Convert sizes from numbers to strings ending in "px" */
function sizeToStr(val: number): string {
  return String(val) + "px";
}

/** Convert elevation/direction degrees from numbers to strings ending in "deg" */
function degToStr(val: number): string {
  return String(val) + "deg";
}

function convertMap(
  map: NavMap,
  photospheres: Record<string, Photosphere>,
  currentCenter?: Point,
  staticEnabled = false,
): MapPluginConfig {
  const hotspots: MapHotspot[] = [];

  for (const [id, photosphere] of Object.entries(photospheres)) {
    if (photosphere.center === undefined) continue;

    hotspots.push({
      id: id,
      tooltip: id,
      x: photosphere.center.x,
      y: photosphere.center.y,
      color: "yellow",
    });
  }

  return {
    imageUrl: map.src.path,
    center: currentCenter ?? map.defaultCenter,
    rotation: map.rotation,
    defaultZoom: map.defaultZoom,
    minZoom: 1,
    maxZoom: 100,
    size: sizeToStr(map.size),
    hotspots,
    static: staticEnabled,
  };
}

function convertHotspots(
  hotspots: Record<string, Hotspot3D>,
  isViewerMode: boolean,
): MarkerConfig[] {
  const markers: MarkerConfig[] = [];

  for (const hotspot of Object.values(hotspots)) {
    if (isViewerMode && hotspot.data.tag === "PhotosphereLink") continue;

    const marker: MarkerConfig = {
      id: hotspot.id,
      size: { width: 64, height: 64 },
      position: {
        yaw: degToStr(hotspot.direction),
        pitch: degToStr(hotspot.elevation),
      },
      tooltip: hotspot.tooltip,
    };
    if (hotspot.data.tag === "PhotosphereLink") {
      marker.html = LinkArrowIconHTML({
        color: alpha(common.white, 0.8),
        size: 80,
      });
    } else {
      marker.image = hotspot.icon.path;
    }

    markers.push(marker);
  }

  return markers;
}

/** Convert photosphere-link hotspots to virtual tour links  */
function convertLinks(
  hotspots: Record<string, Hotspot3D>,
  isViewerMode: boolean,
): VirtualTourLink[] {
  if (!isViewerMode) {
    return [];
  }

  const links: VirtualTourLink[] = [];

  for (const hotspot of Object.values(hotspots)) {
    if (hotspot.data.tag !== "PhotosphereLink") continue;

    links.push({
      nodeId: hotspot.data.photosphereID,
      position: {
        pitch: degToStr(hotspot.elevation),
        yaw: degToStr(hotspot.direction),
      },
      data: { tooltip: hotspot.tooltip } as LinkData,
    });
  }

  return links;
}

interface LinkData {
  tooltip: string;
}

interface PhotospherePlaceholderProps {
  viewerProps: ViewerProps;
  isPrimary: boolean;
  mapStatic: boolean;
  lockViews: boolean;
}

function PhotospherePlaceholder({
  viewerProps,
  isPrimary,
  mapStatic,
  lockViews,
}: PhotospherePlaceholderProps) {
  const { onUpdateHotspot, onViewerClick, photosphereOptions, states } =
    viewerProps;
  const { vfe, currentPS, onChangePS } = useVFELoaderContext();
  const statesIdx = isPrimary ? 0 : 1;
  const photosphereRef = states.references[statesIdx];

  const currentPhotosphere = states.states[statesIdx];
  const setCurrentPhotosphere = states.setStates[statesIdx];

  const [hotspotArray, setHotspotArray] = useState<(Hotspot3D | Hotspot2D)[]>(
    [],
  );
  const hotspotPath = hotspotArray.map((h) => h.id);

  const lockViewsRef = useRef(lockViews);

  const { wasTimelineSelected: _, setWasTimelineSelected } =
    useTimelineSelectedContext();

  useEffect(() => {
    lockViewsRef.current = lockViews;
  }, [lockViews]);

  const ready = useRef(false);
  const defaultPan = useRef(vfe.photospheres[currentPS].src.path);

  const initialPhotosphereHotspots: Record<string, Hotspot3D[]> = Object.keys(
    vfe.photospheres,
  ).reduce<Record<string, Hotspot3D[]>>((acc, psId) => {
    acc[psId] = Object.values(vfe.photospheres[psId].hotspots);
    return acc;
  }, {});

  const [__, handleVisit] = useVisitedState(initialPhotosphereHotspots);

  const isViewerMode = onUpdateHotspot === undefined;

  useEffect(() => {
    if (ready.current) {
      const virtualTour =
        photosphereRef.current?.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
      void virtualTour?.setCurrentNode(currentPhotosphere.id);

      if (isPrimary) {
        const map = photosphereRef.current?.getPlugin<MapPlugin>(MapPlugin);
        if (currentPhotosphere.center) {
          map?.setCenter(currentPhotosphere.center);
        }
      }
    }
  }, [currentPhotosphere, photosphereRef]);

  const plugins: ViewerConfig["plugins"] = [
    [MarkersPlugin, {}],

    [
      VirtualTourPlugin,
      {
        renderMode: "markers",
        getLinkTooltip(_content: string, link: VirtualTourLink): string {
          return (link.data as LinkData).tooltip;
        },
      } as unknown as VirtualTourPluginConfig, // needed to make build happy
    ],
  ];
  isPrimary &&
    plugins.push(
      // Only fill map plugin config when VFE has a map
      [
        MapPlugin,
        vfe.map
          ? convertMap(
              vfe.map,
              vfe.photospheres,
              currentPhotosphere.center ?? vfe.map.defaultCenter,
              mapStatic,
            )
          : {},
      ],
    );

  function handleReady(instance: Viewer) {
    const markerTestPlugin: MarkersPlugin = instance.getPlugin(MarkersPlugin);

    markerTestPlugin.addEventListener("select-marker", ({ marker }) => {
      if (marker.config.id.includes("__tour-link")) return;

      // setCurrentPhotosphere has to be used to get the current state value because
      // the value of currentPhotosphere does not get updated in an event listener
      setCurrentPhotosphere((currentState) => {
        const passMarker = currentState.hotspots[marker.config.id];
        setHotspotArray([passMarker]);
        handleVisit(currentState.id, marker.config.id);
        return currentState;
      });
    });

    instance.addEventListener("click", ({ data }) => {
      if (!data.rightclick) {
        onViewerClick?.(data.pitch, data.yaw);
      }
    });

    instance.addEventListener("position-updated", ({ position }) => {
      if (!lockViewsRef.current) return;
      const [otherRef] = states.references.filter((ref) => {
        if (ref != photosphereRef) return ref;
      });

      if (!otherRef.current) return;

      otherRef.current.rotate(position);
    });

    const virtualTour =
      instance.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);

    const nodes: VirtualTourNode[] = Object.values(vfe.photospheres).map(
      (p) => {
        return {
          id: p.id,
          panorama: p.src.path,
          name: p.id,
          markers: convertHotspots(p.hotspots, isViewerMode),
          links: convertLinks(p.hotspots, isViewerMode),
        };
      },
    );

    virtualTour.setNodes(nodes, currentPS);
    virtualTour.addEventListener("node-changed", ({ node }) => {
      if (!vfe.photospheres[node.id].parentPS) {
        states.setStates.forEach((setStateFunc) =>
          setStateFunc(vfe.photospheres[node.id]),
        );
      } else {
        // just reset it and don't update all nodes
        setWasTimelineSelected(false);
      }
      onChangePS(node.id);

      // clear popovers on scene change
      // Upon saving a hotspot, the scene will refresh and automatically load back into what ever hotspot was saved last
      if (Number(sessionStorage.getItem("lastEditedHotspotFlag")) == 1) { 
        setHotspotArray( 
          JSON.parse(sessionStorage.getItem("listEditedHotspot") || "[]") 
        ); 
      }
      else { 
        setHotspotArray([]); 
      }

      sessionStorage.setItem("listEditedHotspot", "[]"); // Clear the last hotspot so it doesn't keep loading into the same hotspot
      sessionStorage.removeItem("lastEditedHotspotFlag");
    });
    if (isPrimary) {
      const map = instance.getPlugin<MapPlugin>(MapPlugin);
      map.addEventListener("select-hotspot", ({ hotspotId }) => {
        const photosphere = vfe.photospheres[hotspotId];
        states.setStates.forEach((setPS) => {
          setPS(photosphere);
        });
        onChangePS(photosphere.id);
      });
    }
    ready.current = true;
  }

  return (
    <>
      {hotspotArray.length > 0 && (
        <PopOver
          key={hotspotPath.join()}
          hotspotPath={hotspotPath}
          hotspot={hotspotArray[hotspotArray.length - 1]}
          pushHotspot={(add: Hotspot2D) => {
            setHotspotArray([...hotspotArray, add]);
          }}
          popHotspot={() => {
            setHotspotArray(hotspotArray.slice(0, -1));
          }}
          closeAll={() => {
            setHotspotArray([]);
          }}
          onUpdateHotspot={onUpdateHotspot}
          changeScene={(id) => {
            setCurrentPhotosphere(vfe.photospheres[id]);
            onChangePS(id);
          }}
          photosphereOptions={photosphereOptions}
        />
      )}
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ReactPhotoSphereViewer
          key={mapStatic ? "static" : "dynamic"}
          onReady={handleReady}
          ref={photosphereRef}
          src={defaultPan.current}
          plugins={plugins}
          height={"100vh"}
          width={"100%"}
          navbar={["zoom", "caption", "download", "fullscreen"]}
        />
      </Box>
    </>
  );
}

export default PhotospherePlaceholder;
