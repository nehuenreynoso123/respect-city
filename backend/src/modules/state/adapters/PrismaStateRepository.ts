import type {
  Mission as PrismaMission,
  MissionItem as PrismaMissionItem,
  PrismaClient,
} from '@prisma/client';

import type { CategoryKey } from '../../mission/domain/categories.js';
import type { ChecklistItem, Mission } from '../../mission/domain/types.js';
import type { Player } from '../../player/domain/player.js';
import type { PersistedGameState, StateRepository } from '../ports/StateRepository.js';

/** Narrow DB surface the adapter needs — injectable for composition/tests. */
export type StateDb = Pick<
  PrismaClient,
  'player' | 'mission' | 'missionItem' | '$transaction'
>;

export class PrismaStateRepository implements StateRepository {
  constructor(private readonly db: StateDb) {}

  async findByUser(userId: string): Promise<PersistedGameState | null> {
    const player = await this.db.player.findUnique({ where: { userId } });
    if (!player) return null;
    const missions = await this.db.mission.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return { player: toPlayer(player), missions: missions.map(toMission) };
  }

  async create(userId: string, state: PersistedGameState): Promise<void> {
    await this.db.$transaction(async tx => {
      await tx.player.create({
        data: { userId, exp: state.player.exp, stamina: state.player.stamina, intel: state.player.intel, coins: state.player.coins },
      });
      for (const mission of state.missions) {
        await tx.mission.create({ data: toMissionCreate(userId, mission) });
      }
    });
  }

  async save(userId: string, state: PersistedGameState): Promise<void> {
    const keptIds = state.missions.map(m => m.id);
    await this.db.$transaction(async tx => {
      await tx.player.upsert({
        where: { userId },
        create: { userId, exp: state.player.exp, stamina: state.player.stamina, intel: state.player.intel, coins: state.player.coins },
        update: { exp: state.player.exp, stamina: state.player.stamina, intel: state.player.intel, coins: state.player.coins },
      });

      // Missions no longer present are gone for good (items cascade).
      await tx.mission.deleteMany({
        where: { userId, id: { notIn: keptIds } },
      });

      for (const mission of state.missions) {
        await tx.mission.upsert({
          where: { id: mission.id },
          create: toMissionCreate(userId, mission),
          update: {
            title: mission.title,
            category: mission.category,
            x: mission.x,
            y: mission.y,
            respect: mission.respect,
            rewardGranted: mission.rewardGranted ?? false,
          },
        });

        const itemIds = mission.items.map(i => i.id);
        await tx.missionItem.deleteMany({
          where: { missionId: mission.id, id: { notIn: itemIds } },
        });
        for (const [position, item] of mission.items.entries()) {
          await tx.missionItem.upsert({
            where: { id: item.id },
            create: { id: item.id, missionId: mission.id, text: item.text, done: item.done, position },
            update: { text: item.text, done: item.done, position },
          });
        }
      }
    });
  }
}

function toMissionCreate(userId: string, m: Mission): PrismaMissionCreateInput {
  return {
    id: m.id,
    user: { connect: { id: userId } },
    title: m.title,
    category: m.category,
    x: m.x,
    y: m.y,
    respect: m.respect,
    rewardGranted: m.rewardGranted ?? false,
    items: {
      create: m.items.map((item, position) => ({
        id: item.id,
        text: item.text,
        done: item.done,
        position,
      })),
    },
  };
}

function toPlayer(row: { exp: number; stamina: number; intel: number; coins: number }): Player {
  return { exp: row.exp, stamina: row.stamina, intel: row.intel, coins: row.coins };
}

function toMission(row: PrismaMissionWithItems): Mission {
  return {
    id: row.id,
    title: row.title,
    category: row.category as CategoryKey,
    x: row.x,
    y: row.y,
    respect: row.respect,
    rewardGranted: row.rewardGranted,
    items: row.items.map(toItem),
  };
}

function toItem(row: PrismaMissionItem): ChecklistItem {
  return { id: row.id, text: row.text, done: row.done };
}

type PrismaMissionWithItems = PrismaMission & { items: PrismaMissionItem[] };

/** Narrow data-shape type for tx.mission.create() (keeps imports honest). */
type PrismaMissionCreateInput = {
  id: string;
  user: { connect: { id: string } };
  title: string;
  category: string;
  x: number;
  y: number;
  respect: number;
  rewardGranted: boolean;
  items: { create: { id: string; text: string; done: boolean; position: number }[] };
};