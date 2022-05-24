import { create, nop } from "./util.js";
import { Scheduler, Inclusive } from "./scheduler.js";
import { Tick } from "./tick.js";
import { notify } from "./events.js";

export const Clock = {

    // Create a new clock with a default rate.
    create: create({
        rate: 1
    }),

    init() {
        if (!this.tick) {
            this.tick = Tick.create();
        }
        this.scheduler = Scheduler.create();
        // Include the start time in the first update.
        this.clockTimes = [null, 0];
    },

    // The clock is running if and only if it has recorded a tick time.
    get running() {
        return !isNaN(this.tickTime);
    },

    // The current time of this clock is its most recent clock time.
    get now() {
        return this.clockTimes.at(-1);
    },

    // Start the clock when it is not running. The clock time does not change.
    start() {
        if (this.running) {
            return;
        }

        this.tickTime = this.tick.now;
        this.requestUpdate();
    },

    // Stop the clock when it is running, always making one last update.
    stop() {
        if (!this.running) {
            return;
        }

        this.addClockTime();
        delete this.tickTime;
        this.requestUpdate();
    },

    // Set a new rate. This has no side effect when stopped, but when running
    // we may need to request a new update (when moving from zero to non-zero).
    setRate(rate) {
        if (rate === this.rate) {
            return;
        }

        if (this.running) {
            if (this.rate === 0) {
                this.tickTime = this.tick.now;
                this.requestUpdate();
            } else {
                this.addClockTime();
            }
        }

        this.rate = rate;
    },

    // Advance time by d, always making an update (the rate may be zero).
    // Same as skipped if the clock is stopped.
    advance(d) {
        if (!this.running) {
            this.skip(d);
            return;
        }

        this.tickTime = this.tick.now;
        this.clockTimes.push(this.now + d);
        this.requestUpdate();
    },

    // Skip time by d, skipping over events when the clock is running or simply
    // resetting the updates when it is not.
    skip(d) {
        if (d === 0) {
            return;
        }

        const clockTime = this.now + d;
        if (this.running) {
            this.tickTime = this.tick.now;
        } else {
            this.clockTimes = [];
        }
        // Adding a null clock time to signify a break in the list of clock times.
        this.clockTimes.push(null);
        this.clockTimes.push(clockTime);
    },

    // Internal methods

    // Advance and run all the schedule updates in the intervals since the last
    // update took place
    update() {
        if (!this.running) {
            this.clockTimes = [this.now];
            return;
        }

        this.addClockTime();
        const clockTimes = this.clockTimes.slice();
        this.clockTimes = [this.now];
        const n = clockTimes.length - 1;

        for (let i = 0; i < n; ++i) {
            const from = clockTimes[i];
            if (from === null) {
                continue;
            }
            const to = clockTimes[i + 1];
            if (to === null) {
                continue;
            }
            const inclusive = clockTimes[i - 1] === null ? Inclusive : null;
            const schedule = this.scheduler.schedule(from, to, inclusive);
            for (const [f, t] of schedule) {
                f(t, [from, to]);
            }
        }

        if (this.running && this.rate !== 0) {
            this.requestUpdate();
        }

        notify(this, "update");
    },

    // Add a new clock time, updating the tick time as well.
    addClockTime() {
        const now = this.tick.now;
        this.clockTimes.push(
            this.now + (now - this.tickTime) * this.rate
        );
        this.tickTime = now;
    },

    // Request an update.
    requestUpdate() {
        this.tick.requestUpdate(this, () => { this.update(); });
    },

};
