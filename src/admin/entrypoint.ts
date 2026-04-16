import '@/admin/admin.css';

import { mountAdminApp } from '@/admin/main';

export function runAdminEntrypoint(doc: Pick<Document, 'getElementById'> = document): void {
  const root = doc.getElementById('root');
  if (root !== null) {
    void mountAdminApp(root).catch((err: unknown) => {
      console.error('[admin] mountAdminApp', err);
      const p = root.ownerDocument.createElement('p');
      p.className = 'al-error';
      p.setAttribute('role', 'alert');
      p.textContent = err instanceof Error ? err.message : String(err);
      root.appendChild(p);
    });
  }
}
