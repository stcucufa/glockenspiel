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
        this.updateTimes.push([this.tick.now, this.now]);
        this.requestUpdate();
    },

    // Stop the clock when it is running, always making one last update.
    stop() {
        if (!this.running) {
            return;
        }

        this.running = false;
        this.markNow();
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
                this.updateTimes.push([this.tick.now, this.updateTimes.at(-1)[1]]);
                this.requestUpdate();
            } else {
                this.markNow();
            }
        }

        this.rate = rate;
    },

    // Advance time by d, always making an update (the rate may be zero).
    advance(d) {
        if (d === 0) {
            return;
        }

        this.updateTimes.push([this.tick.now, this.now + d]);
        this.requestUpdate();
    },

    // Skip time by d; events in the interval will not happen. If the rate is
    // zero, no update occurs.
    skip(d) {
        if (d === 0) {
            return;
        }

        this.markNow();
        const [tickTime, clockTime] = this.updateTimes.at(-1);
        this.updateTimes.push([tickTime, clockTime + d, Inclusive]);
    },


    // Mark the current time in the list of update times.
    markNow() {
        const tickTime = this.tick.now;
        const [lastTickTime, lastClockTime] = this.updateTimes.at(-1);
        this.updateTimes.push([
            tickTime,
            (tickTime - lastTickTime) * this.rate + lastClockTime
        ]);
    },

    // Request an update.
    requestUpdate() {
        this.tick.requestUpdate(this, () => { this.update(); });
    },

    // Advance and run all the schedule updates in the intervals since the last
    // update took place
    update() {
        this.markNow();

        const updateTimes = this.updateTimes;
        const n = updateTimes.length - 1;

        for (let i = 0; i < n; ++i) {
            // FIXME check if stopped, but keep all events at stop time
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

        this.updateTimes = [updateTimes[n]];
        if (this.running && this.rate !== 0) {
            this.requestUpdate();
        }

        this.onupdate();
    },

};
