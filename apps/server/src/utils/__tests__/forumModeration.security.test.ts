import request from 'supertest';

// Same module mocks as posts.integration.test.ts - lets us import the real app
// without a DB connection, encryption key or ESM-only uuid.
jest.mock('../../utils/crypto', () => ({
  generateApiKey: () => 'mock-key',
  hashApiKey: () => 'mock-hash',
  getKeyPrefix: () => 'mock-prefix',
  encryptSecret: (v: string) => v,
  decryptSecret: (v: string) => v,
}));
jest.mock('../../middleware/requestLogger', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-value' }));

import app from '../../index';
import Post from '../../models/Post';
import Comment from '../../models/Comment';
import { generateAccessToken } from '../jwt';

jest.mock('../../models/Post');
jest.mock('../../models/Comment');

const userToken = generateAccessToken({ userId: '000000000000000000000001', email: 'foo@example.com', role: 'user' });

/**
 * Regression tests: forum moderation routes used to trust `userId` from the request
 * body, so anyone (even unauthenticated) could act as an admin by sending an admin's id.
 */
describe('forum moderation routes - authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('PATCH /api/posts/:id/moderation without a token -> 401, nothing touched', async () => {
    const res = await request(app)
      .patch('/api/posts/abc/moderation')
      .send({ userId: 'some-admin-id', actionType: 'block' });

    expect(res.status).toBe(401);
    expect(Post.findById).not.toHaveBeenCalled();
  });

  test('PATCH /api/posts/:id/moderation as a regular user -> 403', async () => {
    const res = await request(app)
      .patch('/api/posts/abc/moderation')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 'some-admin-id', actionType: 'block' });

    expect(res.status).toBe(403);
    expect(Post.findById).not.toHaveBeenCalled();
  });

  test('DELETE /api/posts/comment/:id without a token -> 401, nothing deleted', async () => {
    const res = await request(app)
      .delete('/api/posts/comment/abc')
      .send({ userId: 'some-admin-id' });

    expect(res.status).toBe(401);
    expect(Comment.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test('DELETE /api/posts/comment/:id as a regular user -> 403', async () => {
    const res = await request(app)
      .delete('/api/posts/comment/abc')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: 'some-admin-id' });

    expect(res.status).toBe(403);
    expect(Comment.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test('POST /api/posts/:id/rate without a token -> 401', async () => {
    const res = await request(app).post('/api/posts/abc/rate').send({ userId: 'victim', rating: 5 });

    expect(res.status).toBe(401);
    expect(Post.findById).not.toHaveBeenCalled();
  });
});
