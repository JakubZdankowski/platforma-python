import { describe, expect, it, vi } from 'vitest';
import { handleAccountRequest, parseAccountAction, type AccountAdmin } from './handler';
const id = '11111111-1111-4111-8111-111111111111';
function fake(): AccountAdmin {
  return { adminIdFromToken: vi.fn(async () => id), account: vi.fn(async () => ({ role: 'student', createdBy: id })),
    create: vi.fn(async () => id), edit: vi.fn(async () => {}), delete: vi.fn(async () => {}), resetPassword: vi.fn(async () => {}) };
}
const request = (body: unknown) => new Request('http://local', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify(body) });
describe('admin account management', () => {
  it('rejects teacher and student callers before any account mutation', async () => {
    const a = fake(); a.adminIdFromToken = vi.fn(async () => null);
    const r = await handleAccountRequest(request({ action: 'delete', userId: id }), a);
    expect(r.status).toBe(403); expect(a.delete).not.toHaveBeenCalled(); expect(a.account).not.toHaveBeenCalled();
  });
  it('does not create or manage other administrators', async () => {
    expect(parseAccountAction({ action: 'create', role: 'admin', login: 'admin@example.test', displayName: 'Admin' })).toBeNull();
    const a = fake(); a.account = vi.fn(async () => ({ role: 'admin', createdBy: null }));
    expect((await handleAccountRequest(request({ action: 'delete', userId: id }), a)).status).toBe(404);
    expect(a.delete).not.toHaveBeenCalled();
  });
  it('validates login according to the actual account role on edit', async () => {
    const a = fake();
    expect((await handleAccountRequest(request({ action: 'edit', userId: id, displayName: 'Uczeń', login: 'invalid@email.test' }), a)).status).toBe(400);
    expect(a.edit).not.toHaveBeenCalled();
  });
  it('creates student metadata with the authenticated admin as creator', async () => {
    const a = fake();
    const r = await handleAccountRequest(request({ action: 'create', role: 'student', login: ' ANIA ', displayName: ' Ania ' }), a);
    expect(r.status).toBe(200);
    expect(a.create).toHaveBeenCalledWith(expect.objectContaining({ metadata: { role: 'student', username: 'ania', display_name: 'Ania', created_by: id } }));
  });
  it('validates target ids and unsupported actions', () => {
    expect(parseAccountAction({ action: 'delete', userId: 'not-a-uuid' })).toBeNull();
    expect(parseAccountAction({ action: 'elevate', userId: id })).toBeNull();
  });
});
