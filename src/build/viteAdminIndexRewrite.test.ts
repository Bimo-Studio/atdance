import { describe, expect, it } from 'vitest';

import { viteAdminIndexRewrite } from '@/build/viteAdminIndexRewrite';

describe('viteAdminIndexRewrite', () => {
  it('rewrites /admin to admin index html', () => {
    expect(viteAdminIndexRewrite('/admin')).toBe('/admin/index.html');
  });

  it('rewrites /admin/ to admin index html', () => {
    expect(viteAdminIndexRewrite('/admin/')).toBe('/admin/index.html');
  });

  it('preserves query string', () => {
    expect(viteAdminIndexRewrite('/admin?x=1')).toBe('/admin/index.html?x=1');
  });

  it('leaves other paths unchanged', () => {
    expect(viteAdminIndexRewrite('/')).toBe('/');
    expect(viteAdminIndexRewrite('/src/foo.ts')).toBe('/src/foo.ts');
    expect(viteAdminIndexRewrite('/admin/index.html')).toBe('/admin/index.html');
  });
});
