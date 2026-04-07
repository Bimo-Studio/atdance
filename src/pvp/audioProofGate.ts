import { ntpOffsetMs } from '@/sync/ntp';

/**
 * Map one NTP ping/pong exchange to offset (PRD §8 audio proof path). Pure — tests use fixed timestamps.
 */
export function offsetMsFromNtpExchange(t1: number, t2: number, t3: number, t4: number): number {
  return ntpOffsetMs(t1, t2, t3, t4);
}
