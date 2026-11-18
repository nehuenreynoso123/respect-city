# ODD — map-2-5d

**Feature**: versión 2.5D del mapa de la ciudad: profundidad falsa en SVG, sin WebGL.
**Creado**: 2026-11-17 · **Rama**: `feat/map-2-5d` (cuelga de `feat/map-islands-neighborhoods`)

## Objetivo

Dar volumen al mapa synthwave actual sin cambiar de tecnología: islas con borde en
profundidad y edificios extruidos con caras laterales, conservando el artwork
`2400×1600` y la cámara pan/zoom intacta.

## Problema / Por qué

El mapa es hoy un SVG plano visto desde arriba. El usuario pidió "el mapa en 3D".
Se evaluaron tres rutas:

1. **Three.js / react-three-fiber**: 3D real, pero agrega dependencias pesadas,
   exige rehacer el artwork como geometría y reproyectar markers, taps y zoom.
2. **CSS 3D (`perspective` + `rotateX`)**: cambio chico, pero deforma los markers
   HTML y rompe la conversión screen → world del `useMapCamera`.
3. **2.5D en SVG (elegida)**: profundidad creíble con caras de prismas y sombras,
   cero dependencias nuevas y cero cambios en el modelo de cámara.

El usuario eligió la opción 3 el 2026-11-17.

## Alcance

**IN (autorizado):**

- `src/slices/map/domain/extrusion.ts`: geometría pura de extrusión (footprint
  rectangular + profundidad → caras del prisma) y su test
  `src/slices/map/domain/extrusion.test.ts`.
- `src/slices/map/ui/ExtrudedCity.tsx`: capa SVG con los edificios extruidos por
  distrito (centro cyan, hoteles pink, mansiones gold, galpones gold).
- `src/slices/map/ui/CityMap.tsx`: reemplazar los grupos de edificios planos por
  la capa extruida; agregar profundidad de costa a las islas.
- `src/styles.css`: sombras de costa y ajustes visuales de los edificios.
- `README.md`: nota breve sobre el render 2.5D.

**OUT (no ahora):**

- Three.js, WebGL, cámara orbital, luces reales o geometría 3D verdadera.
- Cambios en `useMapCamera`, `toWorld`, markers ni en la lógica de taps.
- Backend, API, persistencia ni datos de misiones.

## Restricciones

1. El mundo sigue siendo `2400×1600`; ninguna coordenada de marker, tap o cámara cambia.
2. Sin dependencias nuevas: solo React, SVG y CSS.
3. Copy/UI en inglés; este documento en español (convención del repo).
4. `domain/` sigue puro (sin React ni DOM); tests Vitest en entorno `node`.
5. TDD: **off** (convención del repo). RDD: **off**
   (`gentle-ai review mode status` → off) → verificación ordinaria:
   `npm run typecheck` + `npm test` + `npm run build`.
6. Sin push ni PR sin pedirlo (política de entrega del repo).

## Tareas

- [x] **T1 — Geometría pura**: `domain/extrusion.ts` +
      `domain/extrusion.test.ts`. Prisma con cara superior y dos laterales,
      vector de elevación constante, sin React ni DOM.
      Commit: `d9523a3` (`feat(map): add pure 2.5D extrusion geometry`).
- [ ] **T2 — Capa visual**: `ui/ExtrudedCity.tsx` con los footprints actuales de
      downtown, hoteles, mansiones y galpones; reemplazo en `CityMap.tsx` y
      profundidad de costa en las cinco masas de tierra.
- [ ] **T3 — Pulido + docs**: estilos en `styles.css` y nota en `README.md`.
- [ ] **T4 — Verificación**: typecheck + tests + build en verde; cierre del doc
      con la evidencia observada.

## Criterios de aceptación

1. Los edificios se ven con volumen (cara superior + dos laterales) conservando
   sus huellas y colores actuales.
2. Las islas tienen sombra de costa que sugiere altura sobre el océano.
3. Pan, zoom, pinch, taps y markers funcionan exactamente igual; coordenadas sin cambios.
4. `npm run typecheck`, `npm test` y `npm run build` en verde.
5. Cero dependencias nuevas y cero cambios en `backend/`.

## Verificación

| Comando | Resultado | Evidencia |
| --- | --- | --- |
| `npx vitest run src/slices/map/domain/extrusion.test.ts` | ✅ verde | 1 archivo, 10 tests pasados (writer y spot check del orquestador) |
| `npm run typecheck` | ✅ verde | `tsc --noEmit` sin diagnósticos (writer) |
| `npm test` | pendiente | suite completa, al cierre de la feature |
| `npm run build` | pendiente | al cierre de la feature |

`gentle-ai review assess` sobre el diff de T1: `risk: medium` (RDD está off;
no se abre review, solo se calibra la verificación).

## Progreso / Próximo paso

- **Estado**: T1 cerrado en `d9523a3`; geometría pura con 10 tests verdes y typecheck limpio.
- **Próximo paso**: T2 — capa `ExtrudedCity.tsx`, reemplazo en `CityMap.tsx` y costa de las islas.
- **Checklist de entrega**: Work units con commit convencional en `feat/map-2-5d`;
  push y PR quedan a decisión del usuario.
