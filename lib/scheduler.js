import { create, nop, sign } from "./util.js";

export const Inclusive = Symbol.for("inclusive");

export const Scheduler = {

    // Create a new scheduler
    create: create(),

    init() {
        this.events = new Set();
    },

    // Schedule an event at time t.
    at(f, t) {
        this.addEvent({ f, t });
    },

    // Schedule an event to occur at a period of d, with an optional phase t
    // (e.g., every(f, 5, 13) will occur at 3, 8, 13, 18, ...) The period can
    // be given as a tuple [n, d] expressing n occurrences over the duration d.
    every(f, d, t = 0) {
        this.addEvent({ f, t, period: d });
    },

    // Add an event if its time is definite.
    addEvent(event) {
        if (isNaN(event.t)) {
            throw new Error("Time of event is not a number");
        }
        if (event.t < Infinity && event.t > -Infinity) {
            this.events.add(event);
        }
    },

    // Return all events in the interval ]from, to], unless `inclusive` is set
    // to Inclusive, in which case the interval is [from, to].
    schedule(from, to, inclusive) {
        let delta = to - from;
        if (delta === 0) {
            if (inclusive === Inclusive) {
                delta = 1;
            } else {
                return [];
            }
        }

        const schedule = [];
        for (const event of this.events.values()) {
            const { f, t, period } = event;
            const d = Array.isArray(period) ? period[1] / period[0] : period;
            if (isNaN(d)) {
                // Single occurrence
                const p = (t - from) / delta;
                if (((p > 0) || (p === 0 && inclusive === Inclusive)) && p <= 1) {
                    schedule.push([event, t]);
                }
            } else {
                // Repeating occurrence
                const m = Math.ceil((from - t) / d);
                const n = Math.floor((to - t) / d);
                for (let i = Math.min(m, n); i <= Math.max(m, n); ++i) {
                    const ti = t + i * d;
                    const p = (ti - from) / delta;
                    if (((p > 0) || (p === 0 && inclusive === Inclusive)) && p <= 1) {
                        const ev = [event, ti];
                        if (Array.isArray(period)) {
                            ev.push(Math.round(period[0] * (ti - t) / period[1]));
                        }
                        schedule.push(ev);
                    }
                }
            }
        }

        if (delta !== 0) {
            const d = sign(delta);
            schedule.sort(
                ([e, a], [f, b]) => d * (a - b) || (f.priority ?? 0) - (e.priority ?? 0)
            );
        }

        return schedule;
    }

};
