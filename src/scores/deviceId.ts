import { get, set } from 'idb-keyval';

const DEVICE_KEY = 'atdance.deviceId.v1';

/** Anonymous install id for correlating local scores (plan Phase 3.4). */
export async function getOrCreateDeviceId(): Promise<string> {
  let id = await get<string>(DEVICE_KEY);
  if (id !== undefined && id !== '') {
    return id;
  }
  id = crypto.randomUUID();
  await set(DEVICE_KEY, id);
  return id;
}
