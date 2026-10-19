import { apiErrorFrom } from '@/shared/http/ApiError';

import type { MissionInput } from '../application/commands';
import type { PersistedState } from '../application/state';
import type { GameRepository } from '../ports/GameRepository';

type Method = 'GET' | 'POST' | 'DELETE' | 'PATCH';

/**
 * fetch-based GameRepository. The session lives in an httpOnly cookie, so
 * requests go out `credentials: 'same-origin'` and the client never attaches
 * a bearer token. Responses are trusted as `PersistedState` (the server is the
 * source of truth; shape validation is not duplicated here).
 */
export class HttpGameRepository implements GameRepository {
  constructor(private readonly baseUrl: string) {}

  load(): Promise<PersistedState> {
    return this.request('GET', '/api/state');
  }

  createMission(input: MissionInput): Promise<PersistedState> {
    return this.request('POST', '/api/missions', input);
  }

  deleteMission(missionId: string): Promise<PersistedState> {
    return this.request('DELETE', `/api/missions/${encodeURIComponent(missionId)}`);
  }

  toggleItem(missionId: string, itemId: string): Promise<PersistedState> {
    return this.request(
      'POST',
      `/api/missions/${encodeURIComponent(missionId)}/items/${encodeURIComponent(itemId)}/toggle`,
    );
  }

  toggleSound(enabled: boolean): Promise<PersistedState> {
    return this.request('PATCH', '/api/sound', { enabled });
  }

  private async request(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<PersistedState> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw await apiErrorFrom(response);
    return (await response.json()) as PersistedState;
  }
}
