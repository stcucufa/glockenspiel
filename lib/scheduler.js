import { create, mod } from "./util.js";

export const ASAP = Symbol.for("as soon as possible");

export const Scheduler = {

    // Create a new scheduler
    create: create(),

    init() {
        this.events = new Set();
    },

    clear() {
        this.events.clear();
    },

    // Schedule an event at time t.
    at(f, t) {
        this.addEvent({ f, t });
    },

    // Schedule an event to occur at a period of d, with an optional phase t
    // (e.g., every(f, 5, 13) will occur at 3, 8, 13, 18, ...) The period can
    // be given as a tuple [n, d] expressing n occurrences over the duration d,
    // or can be the symbol ASAP (the default value), in which case the phase
    // does not apply.
    every(f, d = ASAP, t = 0) {
        this.addEvent({ f, t, period: d });
    },

    // Add an event if its time is ASAP or a number; throw if not a number.
    addEvent(event) {
        if (typeof event.t === "number" && !isNaN(event.t)) {
            this.events.add(event);
            return;
        }

        throw new Error("Time of event is not a number");
    },

    // Return all events in the interval [from, to[
    schedule(from, to) {
        if (from === to) {
            return [];
        }

        // Events that happen before regularly scheduled events
        const preschedule = [];
        const schedule = this.delegate?.willScheduleEvents?.(from, to) ?? [];

        for (const event of this.events.values()) {
            const { f, t, period } = event;
            if (period === ASAP) {
                // Occurs once at the beginning of every update
                preschedule.push([event, from]);
            } else if (Array.isArray(period)) {
                // Repeating occurence, n times per d
                const [n, d] = period;

                // Imagine a grid of n columns, each row of length d
                const from_x = Math.ceil(mod(from - t, d) * n / d);
                const from_y = Math.floor((from - t) / d);
                const from_i = from_x + n * from_y;
                const to_x = Math.ceil(mod(to - t, d) * n / d);
                const to_y = Math.floor((to - t) / d);
                const to_i = to_x + n * to_y;
                for (let i = from_i; i < to_i; ++i) {
                    const x = mod(i, n);
                    const y = Math.floor(i / n);
                    const ti = x * d / n + y * d;
                    schedule.push([event, ti, i]);
                }
            } else if (isNaN(period)) {
                // Single occurrence
                if (t >= from && t < to) {
                    schedule.push([event, t]);
                }
            } else {
                // Repeating occurrence
                for (let i = Math.ceil((from - t) / period);; ++i) {
                    const ti = i * period + t;
                    if (ti >= to) {
                        break;
                    }
                    schedule.push([event, ti]);
                }
            }
        }

        schedule.unshift(...preschedule);
        schedule.sort(
            ([e, a], [f, b]) => a - b || (f.priority ?? 0) - (e.priority ?? 0)
        );
        return schedule;
    }

};

// Helper for the willScheduleEvents() delegate to create event objects with the right shape.
export const at = (f, t, priority = 0) => [{ f, priority }, t];
