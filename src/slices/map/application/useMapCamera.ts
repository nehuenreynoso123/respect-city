import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

import {
  clampView,
  fitView,
  INITIAL_VIEW,
  panBy,
  toWorld,
  type Point,
  type View,
} from '../domain/view';
import {
  beginPinch,
  pinchView,
  wheelFactor,
  zoomAtPoint,
  zoomByCenter,
  type PinchStart,
} from '../domain/zoom';

export interface UseMapCameraOptions {
  /**
   * A tap (pointer down → up without crossing the 5px drag threshold) on the
   * map, in world coordinates. Legacy `handleMapTap` consumer (pick mode /
   * create modal) is wired at the app root in T7.
   */
  onMapTap?: (world: Point) => void;
}

export interface MapCamera {
  view: View;
  /** True while a single pointer is down (legacy `.dragging` class). */
  dragging: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** Zoom in button (+): factor 1.25 around the viewport centre. */
  zoomIn: () => void;
  /** Zoom out button (−): factor 1/1.25 around the viewport centre. */
  zoomOut: () => void;
  /** Home button (⌂): fit the island. */
  fit: () => void;
}

/** Legacy zoom-button factors. */
const ZOOM_IN_FACTOR = 1.25;
/** 5px threshold: drag vs tap (legacy pointermove check). */
const DRAG_THRESHOLD = 5;

/**
 * Owns the map camera: view state, Pointer Events (1 pointer = pan,
 * 2 pointers = pinch), a non-passive wheel listener (so preventDefault
 * works) and the zoom-buttons API. All math is delegated to the pure
 * domain functions — this hook only tracks pointers and the viewport size.
 */
export function useMapCamera(options: UseMapCameraOptions = {}): MapCamera {
  const { onMapTap } = options;

  const viewportRef = useRef<HTMLDivElement>(null);
  // viewRef mirrors `view` so pointer handlers always read fresh math state
  // (React state alone would hand out stale closures mid-gesture).
  const viewRef = useRef<View>(INITIAL_VIEW);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);

  const pointersRef = useRef(new Map<number, Point>());
  const dragRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);
  const pinchRef = useRef<PinchStart | null>(null);
  const movedRef = useRef(false);

  const commit = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.marker')) return; // markers handle their own clicks
    const vp = e.currentTarget;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const v = viewRef.current;
      dragRef.current = { startX: e.clientX, startY: e.clientY, vx: v.x, vy: v.y };
      movedRef.current = false;
      vp.setPointerCapture(e.pointerId);
      setDragging(true);
    } else if (pointersRef.current.size === 2) {
      // Second finger → switch to pinch mode
      dragRef.current = null;
      movedRef.current = true;
      const [a, b] = [...pointersRef.current.values()];
      const r = vp.getBoundingClientRect();
      const va = { x: a.x - r.left, y: a.y - r.top };
      const vb = { x: b.x - r.left, y: b.y - r.top };
      pinchRef.current = beginPinch(viewRef.current, va, vb, {
        x: (va.x + vb.x) / 2,
        y: (va.y + vb.y) / 2,
      });
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchRef.current;
    const vp = e.currentTarget;

    /* --- Pinch zoom (two fingers) --- */
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const r = vp.getBoundingClientRect();
      const va = { x: a.x - r.left, y: a.y - r.top };
      const vb = { x: b.x - r.left, y: b.y - r.top };
      const dist = Math.hypot(va.x - vb.x, va.y - vb.y);
      commit(
        pinchView(
          pinch,
          dist,
          (va.x + vb.x) / 2,
          (va.y + vb.y) / 2,
          vp.clientWidth,
          vp.clientHeight,
        ),
      );
      return;
    }

    /* --- Single-pointer pan --- */
    const drag = dragRef.current;
    if (drag) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) movedRef.current = true;
      const v = viewRef.current;
      commit(
        panBy({ x: drag.vx, y: drag.vy, s: v.s }, dx, dy, vp.clientWidth, vp.clientHeight),
      );
    }
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    pointers.delete(e.pointerId);
    setDragging(false);

    if (pointers.size < 2) pinchRef.current = null;

    /* A tap (not a drag) on the map → report the world point (legacy handleMapTap) */
    if (pointers.size === 0) {
      const drag = dragRef.current;
      if (drag && !movedRef.current) {
        const r = e.currentTarget.getBoundingClientRect();
        onMapTap?.(toWorld(viewRef.current, e.clientX - r.left, e.clientY - r.top));
      }
      dragRef.current = null;
    }
  };

  /** Run a pure domain transform against the live viewport size. */
  const withViewport = (fn: (view: View, vpW: number, vpH: number) => View) => {
    const vp = viewportRef.current;
    if (!vp) return;
    commit(fn(viewRef.current, vp.clientWidth, vp.clientHeight));
  };

  const zoomIn = () => withViewport((v, w, h) => zoomByCenter(v, ZOOM_IN_FACTOR, w, h));
  const zoomOut = () => withViewport((v, w, h) => zoomByCenter(v, 1 / ZOOM_IN_FACTOR, w, h));
  const fit = () => withViewport((_v, w, h) => fitView(w, h));

  /* --- Wheel zoom (anchored under the cursor; non-passive so preventDefault works) --- */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      commit(
        zoomAtPoint(
          viewRef.current,
          wheelFactor(e.deltaY),
          e.clientX - r.left,
          e.clientY - r.top,
          vp.clientWidth,
          vp.clientHeight,
        ),
      );
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [commit]);

  /* --- Boot: fit the map once layout is settled (legacy requestAnimationFrame) --- */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const id = requestAnimationFrame(() => {
      commit(fitView(vp.clientWidth, vp.clientHeight));
    });
    return () => cancelAnimationFrame(id);
  }, [commit]);

  /* --- Keep the view sane on window resize (legacy resize listener) --- */
  useEffect(() => {
    const onResize = () => {
      const vp = viewportRef.current;
      if (!vp) return;
      commit(clampView(viewRef.current, vp.clientWidth, vp.clientHeight));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [commit]);

  return {
    view,
    dragging,
    viewportRef,
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    zoomIn,
    zoomOut,
    fit,
  };
}
