import { useCallback, useEffect, useRef, useState } from 'react';

import { WORLD_H, WORLD_W, type Point } from '@/slices/map/domain/view';
import { CityMap } from '@/slices/map/ui/CityMap';
import type { MissionInput } from '@/slices/mission/application/commands';
import type { Filter } from '@/slices/mission/application/state';
import { categoryOf } from '@/slices/mission/domain/categories';
import { missionDone } from '@/slices/mission/domain/missionDone';
import { CreateMissionModal } from '@/slices/mission/ui/CreateMissionModal';
import { MissionList } from '@/slices/mission/ui/MissionList';
import { MissionPanel } from '@/slices/mission/ui/MissionPanel';
import { RespectOverlay } from '@/slices/mission/ui/RespectOverlay';
import { emptyDraft, type MissionDraft } from '@/slices/mission/ui/missionDraft';
import { HUD } from '@/slices/player/ui/HUD';

import { useApp } from './store/AppProvider';

/** Legacy boot location when the camera is not ready yet (viewport centre). */
const FALLBACK_LOCATION: Point = { x: 1200, y: 800 };

/**
 * Composition root: same DOM skeleton as `legacy/index.html`
 * (header#hud → div#app [aside#mission-list + #map-viewport] →
 * #mission-panel / #respect-overlay / #modal-backdrop as #app siblings)
 * and the legacy interaction wiring (Escape priority, drawer auto-close,
 * pick mode, map tap → create modal).
 */
export default function App() {
  const { state, dispatch, sfx, celebration, hideCelebration } = useApp();

  // Legacy `ui` flags (non-persisted).
  const [drawerOpen, setDrawerOpen] = useState(false); // #mission-list.open
  const [modalOpen, setModalOpen] = useState(false); // ui.modalOpen
  const [pickMode, setPickMode] = useState(false); // ui.pickMode
  const [draft, setDraft] = useState<MissionDraft>(() => emptyDraft(null));

  // World point at the viewport centre, pushed by CityMap (legacy `#btn-new`).
  const getDefaultLocationRef = useRef<() => Point | null>(() => null);

  const markers = state.missions.map((m) => {
    const cat = categoryOf(m.category);
    return {
      id: m.id,
      x: m.x,
      y: m.y,
      title: m.title,
      category: m.category,
      icon: cat.icon,
      done: missionDone(m),
    };
  });

  const selected = state.selectedId
    ? (state.missions.find((m) => m.id === state.selectedId) ?? null)
    : null;

  /* --- Header actions --------------------------------------------------- */

  const handleToggleSound = useCallback(() => {
    dispatch({ type: 'toggleSound' });
  }, [dispatch]);

  const handleToggleList = useCallback(() => {
    setDrawerOpen((open) => !open);
  }, []);

  const handleNewMission = useCallback(() => {
    // Legacy: openCreateModal(toWorld(viewport centre)).
    const center = getDefaultLocationRef.current();
    setDraft(emptyDraft(center ?? FALLBACK_LOCATION));
    setModalOpen(true);
    setPickMode(false);
  }, []);

  /* --- Mission list ----------------------------------------------------- */

  const handleFilterChange = useCallback(
    (filter: Filter) => {
      dispatch({ type: 'setFilter', filter });
    },
    [dispatch],
  );

  const handleSelectMission = useCallback(
    (missionId: string) => {
      dispatch({ type: 'selectMission', missionId });
      // Legacy openPanel: close the mobile drawer so the panel is visible.
      setDrawerOpen(false);
    },
    [dispatch],
  );

  /* --- Panel ------------------------------------------------------------ */

  const handleToggleItem = useCallback(
    (missionId: string, itemId: string) => {
      dispatch({ type: 'toggleItem', missionId, itemId });
    },
    [dispatch],
  );

  const handleDeleteMission = useCallback(
    (missionId: string) => {
      dispatch({ type: 'deleteMission', missionId });
    },
    [dispatch],
  );

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'selectMission', missionId: null });
  }, [dispatch]);

  /* --- Create modal + pick mode ----------------------------------------- */

  const handleCreateMission = useCallback(
    (mission: MissionInput) => {
      dispatch({ type: 'createMission', mission });
      setModalOpen(false);
      setPickMode(false);
      setDraft(emptyDraft(null));
    },
    [dispatch],
  );

  const handleCancelModal = useCallback(() => {
    setModalOpen(false);
    setPickMode(false);
  }, []);

  const handlePickOnMap = useCallback(() => {
    // Legacy btn-pick: arm crosshair and hide the modal (modalOpen stays true).
    setPickMode(true);
  }, []);

  /* --- Map -------------------------------------------------------------- */

  const handleMapTap = useCallback(
    (world: Point) => {
      // Legacy handleMapTap: ignore taps on the open sea (outside the world).
      if (world.x < 0 || world.y < 0 || world.x > WORLD_W || world.y > WORLD_H) {
        return;
      }
      if (pickMode && modalOpen) {
        setDraft((d) => ({ ...d, x: Math.round(world.x), y: Math.round(world.y) }));
        setPickMode(false); // location set → modal reopens (legacy updateLocBox)
      } else if (!modalOpen) {
        setDraft(emptyDraft(world));
        setModalOpen(true);
        setPickMode(false);
      }
    },
    [pickMode, modalOpen],
  );

  const handleMarkerClick = useCallback(
    (missionId: string) => {
      handleSelectMission(missionId); // legacy marker click → openPanel(id)
    },
    [handleSelectMission],
  );

  const handleRequestDefaultLocation = useCallback(
    (getter: () => Point | null) => {
      getDefaultLocationRef.current = getter;
    },
    [],
  );

  /* --- Global keys (legacy document keydown) ---------------------------- */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Legacy priority: modal first (incl. pick mode), else the panel.
      // The drawer has NO Escape binding in legacy.
      if (modalOpen) handleCancelModal();
      else if (selected) handleClosePanel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, selected, handleCancelModal, handleClosePanel]);

  /* --- Render ------------------------------------------------------------ */

  return (
    <>
      <HUD
        player={state.player}
        sound={state.sound}
        onToggleSound={handleToggleSound}
        onToggleList={handleToggleList}
        onNewMission={handleNewMission}
      />

      <div id="app">
        <MissionList
          missions={state.missions}
          filter={state.filter}
          selectedId={state.selectedId}
          open={drawerOpen}
          onFilterChange={handleFilterChange}
          onSelect={handleSelectMission}
        />
        <CityMap
          markers={markers}
          onMarkerClick={handleMarkerClick}
          onMapTap={handleMapTap}
          pickMode={pickMode}
          onRequestDefaultLocation={handleRequestDefaultLocation}
        />
      </div>

      <MissionPanel
        mission={selected}
        onToggleItem={handleToggleItem}
        onDelete={handleDeleteMission}
        onClose={handleClosePanel}
      />

      <RespectOverlay
        celebration={celebration}
        onHide={hideCelebration}
        sfx={sfx}
      />

      <CreateMissionModal
        open={modalOpen && !pickMode}
        draft={draft}
        onDraftChange={setDraft}
        onCreate={handleCreateMission}
        onCancel={handleCancelModal}
        onPickOnMap={handlePickOnMap}
      />
    </>
  );
}
