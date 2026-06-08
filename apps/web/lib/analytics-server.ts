import { after } from "next/server";
import {
  trackServer,
  type AnalyticsEventMap,
  type AnalyticsEventName,
  type ServerAnalyticsOptions,
} from "./analytics";

export function trackServerAfter<Event extends AnalyticsEventName>(
  event: Event,
  distinctId: string | null | undefined,
  properties: AnalyticsEventMap[Event],
  options: ServerAnalyticsOptions,
): void {
  after(() => trackServer(event, distinctId, properties, options));
}
