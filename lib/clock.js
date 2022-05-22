import { create, nop } from "./util.js";
import { Scheduler, Inclusive } from "./scheduler.js";
import { Tick } from "./tick.js";

export const Clock = {

    // Create a new clock with a default rate.
    create: create({
        rate: 1,
        // TODO event notification; could be a tick thing instead?
        onupdate: nop
    }),

    init() {
        if (!this.tick) {
            this.tick = Tick.create();
        }
        this.scheduler = Scheduler.create();
        this.running = false;
        this.updateTimes = [[null, 0, Inclusive]];
    },

    // Get the current time of this clock from its last update.
    get now() {
        return this.updateTimes.at(-1)[1];
    },

    // Start the clock at zero when it is not running.
    start() {
        if (this.running) {
            return;
        }

        this.running = true;
        this.updateTimes.at(-1)[0] = this.tick.now;
        this.requestUpdate();
    },

    // Stop the clock when it is running, always making one last update.
    stop() {
        if (!this.running) {
            return;
        }

        this.running = false;
        this.addUpdateTime();
        this.requestUpdate();
    },

    // Set a new rate. This has no other effect when stopped, but when running
    // we may need to request a new update (when moving from zero to non-zero).
    setRate(rate) {
        if (rate === this.rate) {
            return;
        }

        if (this.running) {
            if (this.rate === 0) {
                const tickTime = this.this.now;
                this.addUpdateTime(this.tick.now, this.updateTimes.at(-1)[1]);
                this.requestUpdate();
            } else {
                this.addUpdateTime();
            }
        }

        this.rate = rate;
    },

    // Advance time by d, always making an update (the rate may be zero).
    // Do nothing if stopped or advancing by zero.
    advance(d) {
        if (!this.running || d === 0) {
            return;
        }

        this.addUpdateTime(this.tick.now, this.now + d);
        this.requestUpdate();
    },

    // Skip time by d, skipping over events when the clock is running or simply
    // resetting the updates when it is not.
    skip(d) {
        if (d === 0) {
            return;
        }

        if (!this.running) {
            this.updateTimes = [];
        }
        this.updateTimes.push([this.tick.now, this.now + d, Inclusive]);
    },

    // Internal methods

    // Advance and run all the schedule updates in the intervals since the last
    // update took place
    update() {
        this.addUpdateTime();

        const updateTimes = this.updateTimes;
        const n = updateTimes.length - 1;
        this.updateTimes = [this.updateTimes.at(-1)];

        for (let i = 0; i < n; ++i) {
            const nextUpdateTime = updateTimes[i + 1];
            if (nextUpdateTime[2] !== Inclusive) {
                const from = updateTimes[i][1];
                const to = nextUpdateTime[1];
                const schedule = this.scheduler.schedule(from, to, updateTimes[i][2]);
                const m = schedule.length;
                for (let j = 0; j < m; ++j) {
                    const [f, t] = schedule[j];
                    f(t, [from, to]);
                }
            }
        }

        if (this.running && this.rate !== 0) {
            this.requestUpdate();
        }

        this.onupdate();
    },

    // Add a new update time, using the times passed as argument or computing
    // the new times from the current tick and rate values.
    addUpdateTime(newTickTime, newClockTime) {
        const [lastTickTime, lastClockTime] = this.updateTimes.at(-1);
        const tickTime = newTickTime ?? this.tick.now;
        const clockTime = newClockTime ??
            lastClockTime + (tickTime - lastTickTime) * this.rate;
        if (clockTime === tickTime) {
            this.updateTimes.at(-1)[0] = tickTime;
        } else {
            this.updateTimes.push([tickTime, lastClockTime + elapsed]);
        }
    },

    // Request an update.
    requestUpdate() {
        this.tick.requestUpdate(this, () => { this.update(); });
    },

};
