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
    category: 'code', x: 600, y: 980, respect: 300,
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
    category: 'code', x: 1150, y: 1150, respect: 350,
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
    category: 'work', x: 1620, y: 1000, respect: 250,
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
    category: 'work', x: 1980, y: 950, respect: 200,
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
    category: 'code', x: 980, y: 500, respect: 150,
    items: [
      'Posicionamiento: Senior Backend que usa AI/agents (no AI Engineer ahora)',
      'Practicar: coding agents · tool calling · workflows',
      'Practicar: RAG · integración con APIs de LLM · agentes',
      'Construir una feature con LLM sobre tu API Node.js — aplicado a backend',
      'Cubrir: evaluación · AI-assisted development · Spec-Driven Development',
    ],
  },
];

/** First-run demo missions so the map is never empty (legacy seedMissions). */
export function seedMissions(): Mission[] {
  return [
    {
      id: uid(), title: 'Morning Workout', category: 'gym', x: 640, y: 640, respect: 150,
      items: [it('Run 20 minutes'), it('Push-ups 3 × 15'), it('Stretch 5 minutes')],
    },
    {
      id: uid(), title: 'Ship Login Feature', category: 'code', x: 1240, y: 740, respect: 300,
      items: [it('Define API contract'), it('Implement endpoint'), it('Write unit tests')],
    },
    {
      id: uid(), title: 'Drink 2L of Water', category: 'health', x: 1900, y: 700, respect: 60,
      items: [
        it('2 glasses — morning'), it('2 glasses — midday'),
        it('2 glasses — afternoon'), it('2 glasses — evening'),
      ],
    },
  ];
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
