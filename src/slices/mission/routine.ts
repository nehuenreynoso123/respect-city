import type { CategoryKey } from './domain/categories';
import { it, uid } from './domain/ids';
import type { Mission } from './domain/types';

/** Bump to re-offer an updated routine (legacy ROUTINE_VERSION). */
export const ROUTINE_VERSION = 1;

export interface RoutineTemplate {
  title: string;
  category: CategoryKey;
  x: number;
  y: number;
  respect: number;
  items: string[];
}

export const ROUTINE_MISSIONS: RoutineTemplate[] = [
  {
    title: 'Bloque 1 · Backend profundo (90 min)',
    category: 'code', x: 1000, y: 640, respect: 300,
    items: [
      'Teoría 30% — un solo concepto, ~25 min',
      'Código 70% — escribir código, ~65 min (sin teoría los 90)',
      'Rotar: Node.js · TypeScript · APIs REST · SQL/PostgreSQL',
      'Rotar: MongoDB · Redis · RabbitMQ · microservicios',
      'Rotar: Docker · Kubernetes · testing/Jest · concurrencia',
      'Rotar: DDD · CQRS · SOLID · patrones · seguridad · performance',
    ],
  },
  {
    title: 'Bloque 2 · Proyecto Backend (90 min)',
    category: 'code', x: 760, y: 1160, respect: 350,
    items: [
      'UN solo proyecto, no cinco — algo parecido a un backend real',
      'Stack base: Node.js · TypeScript · PostgreSQL · REST API · JWT',
      'Integrar: Redis · RabbitMQ · Docker · Jest',
      'Arquitectura: DDD / hexagonal',
      'Sumar de a uno: autenticación · autorización · validaciones',
      'Endurecer: errores · logs · cache · colas · workers',
      'Cierre: tests · observabilidad · documentación · CI/CD',
    ],
  },
  {
    title: 'Bloque 3 · Entrevistas (45 min)',
    category: 'work', x: 1620, y: 860, respect: 250,
    items: [
      '15 min — preguntas técnicas EN VOZ ALTA',
      'Tema: event loop · Promise.all vs Promise.allSettled · errores',
      'Tema: API escalable · microservicio · cuándo RabbitMQ o Redis',
      'Tema: PostgreSQL vs MongoDB · CQRS · DDD · hexagonal vs tradicional',
      '15 min — system design: pagos · notificaciones · reservas · marketplace',
      '15 min — tu experiencia: Contame sobre vos · último trabajo · por qué dejaste',
      'Preparar: proyecto complejo · decisión arquitectónica · "¿Por qué contratarte?"',
    ],
  },
  {
    title: 'Bloque 4 · Búsqueda laboral (60 min)',
    category: 'work', x: 1980, y: 940, respect: 200,
    items: [
      '20 min — 3 a 5 postulaciones BUENAS (nada de 30 aplicaciones automáticas)',
      'Buscar: Senior/Sr Backend · Node.js Developer · Backend Engineer',
      'Filtro: priorizar Argentina o remoto LATAM',
      '15 min — networking: recruiters, hiring managers, devs de empresas objetivo',
      '10-20 min — seguimiento: respuestas, entrevistas, aplicaciones, contactos',
      'Actualizar la planilla: Empresa · Puesto · Fecha · Estado · Próximo paso',
    ],
  },
  {
    title: 'Bloque 5 · IA aplicada al desarrollo (30 min)',
    category: 'code', x: 560, y: 400, respect: 150,
    items: [
      'Posicionamiento: Senior Backend que usa AI/agents (no AI Engineer ahora)',
      'Practicar: coding agents · tool calling · workflows',
      'Practicar: RAG · integración con APIs de LLM · agentes',
      'Construir una feature con LLM sobre tu API Node.js — aplicado a backend',
      'Cubrir: evaluación · AI-assisted development · Spec-Driven Development',
    ],
  },
];

/** First-run demo missions (legacy seedMissions), positioned for the city map. */
const SEED_TEMPLATES: RoutineTemplate[] = [
  {
    title: 'Morning Workout', category: 'gym', x: 2010, y: 380, respect: 150,
    items: ['Run 20 minutes', 'Push-ups 3 × 15', 'Stretch 5 minutes'],
  },
  {
    title: 'Ship Login Feature', category: 'code', x: 1080, y: 700, respect: 300,
    items: ['Define API contract', 'Implement endpoint', 'Write unit tests'],
  },
  {
    title: 'Drink 2L of Water', category: 'health', x: 1990, y: 1180, respect: 60,
    items: [
      '2 glasses — morning', '2 glasses — midday',
      '2 glasses — afternoon', '2 glasses — evening',
    ],
  },
];

/** Demo missions so the map is never empty (legacy seedMissions). */
export function seedMissions(): Mission[] {
  return SEED_TEMPLATES.map(toMission);
}

/**
 * Canonical world position per app-owned mission title (demo seeds + routine
 * blocks). The map-layout migration realigns persisted missions to these when
 * the world design changes; user-created missions have no canonical position.
 */
export function canonicalPositions(): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const t of [...SEED_TEMPLATES, ...ROUTINE_MISSIONS]) {
    positions.set(t.title, { x: t.x, y: t.y });
  }
  return positions;
}

/**
 * Inject the routine blocks once per ROUTINE_VERSION, skipping titles that
 * already exist (so a manual delete stays deleted). Runs on every load.
 * Pure: returns the same reference when there is nothing to do, so the caller
 * can skip the persist (legacy mergeRoutine saves only when it injects).
 */
export function mergeRoutine<S extends { missions: Mission[]; routineSeeded: number }>(
  state: S,
): S {
  if (state.routineSeeded >= ROUTINE_VERSION) return state;
  const present = new Set(state.missions.map(m => m.title));
  const additions = ROUTINE_MISSIONS.filter(t => !present.has(t.title)).map(toMission);
  return {
    ...state,
    missions: [...state.missions, ...additions],
    routineSeeded: ROUTINE_VERSION,
  };
}

function toMission(t: RoutineTemplate): Mission {
  return {
    id: uid(), title: t.title, category: t.category,
    x: t.x, y: t.y, respect: t.respect,
    items: t.items.map(text => it(text)),
  };
}
