import { nop, sign } from "./util.js";

export const Scheduler = {

    // Create a new scheduler
    create() {
        return Object.assign(Object.create(this), {
            // TODO heap for easier querying
            events: new Set(),
        });
    },

    // Schedule an event at time t with an optional period d
    at(f, t, d) {
        this.events.add([f, t, d]);

        // TODO handle adding an event during an update (?)
    },

    // Process all events in the interval [from, to[.
    update(from, to) {
        const delta = to - from;
        if (delta === 0) {
            return;
        }

        const schedule = [];
        for (const event of this.events.values()) {
            const [f, t, d] = event;
            if (isNaN(d)) {
                // Single occurrence
                const p = (t - from) / delta;
                if (p > 0 && p <= 1) {
                    schedule.push(event);
                }
            } else {
                // Repeating occurrence
                const m = Math.ceil((from - t) / d);
                const n = Math.floor((to - t) /d);
                for (let i = Math.min(m, n); i <= Math.max(m, n); ++i) {
                    const ti = t + i * d;
                    const p = (ti - from) / delta;
                    if (p > 0 && p <= 1) {
                        schedule.push([f, ti]);
                    }
                }
            }
        }
        const direction = sign(delta);
        schedule.sort(([_, a], [__, b]) => direction * (a - b));

        for (const [f, t] of schedule) {
            f(t, [from, to]);
        }
    }

};
