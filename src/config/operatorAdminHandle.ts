/** Handle for the operator account that may open /admin (must match relay ATDANCE_ADMIN_HANDLE). */
const raw = import.meta.env.VITE_ATDANCE_OPERATOR_ADMIN_HANDLE?.trim()
  .toLowerCase()
  .replace(/^@/, '');
export const ATDANCE_OPERATOR_ADMIN_HANDLE =
  raw !== undefined && raw !== '' ? raw : 'distributed.camp';
