import type { SlotDescriptor, PageSchema } from '@castor/types';
import { reidentifySlot } from './slot-id.js';
import type { BoundingBox } from './crawler.js';
import { env } from '../config/env.js';

export interface InvarianceReport {
  stableSlots: string[];
  undetectableSlots: string[];
}

/**
 * Given a page schema and freshly-fetched HTML + bboxes, verify every slot
 * can still be identified. Marks undetectable slots without removing them.
 */
export function checkInvariance(
  page: PageSchema,
  freshHtml: string,
  freshBboxes: Record<string, BoundingBox> = {},
): InvarianceReport {
  const report: InvarianceReport = { stableSlots: [], undetectableSlots: [] };

  for (const [slotId, descriptor] of Object.entries(page.slots)) {
    const result = reidentifySlot(descriptor, freshHtml, freshBboxes);
    if (result.found) {
      report.stableSlots.push(slotId);
    } else {
      report.undetectableSlots.push(slotId);
    }
  }

  return report;
}

/** Fire-and-forget alert for undetectable slots (log + optional webhook). */
export async function alertUndetectable(
  siteId: string,
  pageId: string,
  slotIds: string[],
): Promise<void> {
  const message = {
    event: 'SLOT_UNDETECTABLE',
    siteId,
    pageId,
    slotIds,
    ts: new Date().toISOString(),
  };
  console.warn('[invariance]', JSON.stringify(message));

  if (env.ALERT_WEBHOOK_URL) {
    try {
      await fetch(env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (err) {
      console.error('[invariance] Webhook delivery failed:', err);
    }
  }
}
