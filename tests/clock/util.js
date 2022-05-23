import { Clock } from "../../lib/clock.js";
import { ManualTick } from "../../lib/tick.js";

export const manualClock = () => Clock.create({ tick: ManualTick.create() });
export const pendingUpdate = clock => !!clock.tick.request;
