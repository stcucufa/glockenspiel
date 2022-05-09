import { nop, sign } from "./util.js";

export const Scheduler = {

    // Create a new scheduler
    create() {
        return Object.assign(Object.create(this), {
            // TODO heap for easier querying
            events: new Set(),
        });
    },

    // Schedule an event at time t
    // TODO period
    at(f, t) {
        const event = [f, t];
        this.events.add(event);

        // TODO handle adding an event during an update: create a new timeline.
    },

    // Advance time by d, then process all events between the last time (excluded) and now
    update(from, to) {
        const d = to - from;
        if (d === 0) {
            return;
        }

        const schedule = [];
        for (const event of this.events.values()) {
            const [_, t] = event;
            const p = (t - from) / d;
            if (p > 0 && p <= 1) {
                schedule.push(event);
            }
        }
        const direction = sign(d);
        schedule.sort(([_, a], [__, b]) => direction * (a - b));

        for (const [f, t] of schedule) {
            f(t, [from, to]);
        }
    }

};
