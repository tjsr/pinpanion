import type { PinSelectionList } from '../src/types.ts';

const jsonResponse = (body: unknown, status = 200): Response => Response.json(body, { status });

const isLanyard = (value: unknown): value is PinSelectionList => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const lanyard = value as Partial<PinSelectionList>;
  return typeof lanyard.id === 'string' && typeof lanyard.name === 'string' &&
    typeof lanyard.ownerId === 'string' && Number.isInteger(lanyard.revision) &&
    ['availableIds', 'availableSetIds', 'wantedIds', 'wantedSetIds'].every((key) =>
      Array.isArray(lanyard[key as keyof PinSelectionList]) &&
      (lanyard[key as keyof PinSelectionList] as unknown[]).every(Number.isInteger));
};

const handleLanyardRequest = async (request: Request, env: Env, id: string): Promise<Response> => {
  if (request.method === 'GET') {
    const result = await env.LANYARDS.prepare('SELECT data FROM lanyards WHERE id = ?').bind(id).first<{ data: string }>();
    if (!result) {
      return jsonResponse({ error: 'Lanyard not found' }, 404);
    }
    return jsonResponse(JSON.parse(result.data));
  }

  if (request.method === 'PUT') {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 65536) {
      return jsonResponse({ error: 'Lanyard data is too large' }, 413);
    }
    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON' }, 400);
    }
    if (!isLanyard(value) || value.id !== id) {
      return jsonResponse({ error: 'Request body must be a lanyard matching the requested ID' }, 400);
    }
    const data = JSON.stringify(value);
    if (new TextEncoder().encode(data).length > 65536) {
      return jsonResponse({ error: 'Lanyard data is too large' }, 413);
    }
    await env.LANYARDS.prepare(
      'INSERT INTO lanyards (id, data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP'
    ).bind(id, data).run();
    return jsonResponse(value);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/lanyards\/([^/]+)$/);
    if (match) {
      let id: string;
      try {
        id = decodeURIComponent(match[1]);
      } catch {
        return jsonResponse({ error: 'Invalid lanyard ID' }, 400);
      }
      return handleLanyardRequest(request, env, id);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
