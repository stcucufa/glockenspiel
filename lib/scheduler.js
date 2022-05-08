import { nop, sign } from "./util.js";

export const Scheduler = {

    // Create a new scheduler
    create() {
        return Object.assign(Object.create(this), {
            // TODO heap for easier querying
            events: new Set(),

            // Start just before 0.
            now: (-2) ** -1073
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
    tick(d) {
        if (d === 0) {
            return;
        }

        const now = this.now;
        const schedule = [];
        for (const event of this.events.values()) {
            const [_, t] = event;
            const p = (t - now) / d;
            if (p > 0 && p <= 1) {
                schedule.push(event);
            }
        }
        const direction = sign(d);
        schedule.sort(([_, a], [__, b]) => direction * (a - b));

        for (const [f, t] of schedule) {
            this.now = t;
            f(this);
        }

        this.now = now + d;
    }

};
