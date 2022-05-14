import { create, nop } from "./util.js";
import { Scheduler } from "./scheduler.js";
import { Tick } from "./tick.js";

const Force = true;

const States = {
    Running: Symbol.for("running"),
    Stopped: Symbol.for("stopped"),
    Paused: Symbol.for("paused"),
};

export const Clock = {

    // Create a new clock with a default rate, tick and scheduler.
    create: create({
        state: States.Stopped
    }, {
        rate: 1,
        scheduler: Scheduler.create(),
        tick: Tick.create(),
        onupdate: nop,
    }),

    // Get the current time of this clock from its last update; none if stopped.
    get now() {
        return this.updateTimes?.at(-1)?.[1];
    },

    // Start the clock right before zero.
    start() {
        this.updateTimes = [[this.tick.now, -1e-15]];
        this.state = States.Running;
        this.requestUpdate();
    },

    // Stop the clock.
    stop() {
        this.advance();
        this.state = States.Stopped;
    },

    // Pause the clock, which is the same as setting the rate to 0.
    pause() {
        this.setRate(0);
    },

    // Resume the paused at the previous rate.
    resume() {
        if (isNaN(this.pausedRate)) {
            return;
        }

        this.setRate(this.pausedRate);
    },

    // Advance by d, or by the elapsed time since last update by default.
    // A stopped clocked does not advance.
    advance(d) {
        if (this.state === States.Stopped) {
            return;
        }

        const now = this.tick.now;
        const clockTime = isNaN(d) ?
            this.updateTimes.at(-1)[1] + (now - this.updateTimes.at(-1)[0]) * this.rate :
            this.now + d;
        this.updateTimes.push([now, clockTime]);
        this.requestUpdate();
    },

    // Set a new rate.
    setRate(rate) {
        if (rate === this.rate) {
            return;
        }

        if (this.state !== States.Stopped) {
            if (this.rate === 0) {
                // Resume from pause
                this.state = States.Running;
                this.requestUpdate();
                this.updateTimes.push([this.tick.now, this.updateTimes.at(-1)[1]]);
                delete this.pausedRate;
            } else {
                // Advance at the current rate before setting the new rate
                this.advance();
            }

            if (rate === 0) {
                // Pause
                this.state = States.Paused;
                this.pausedRate = this.rate;
            }
        }

        this.rate = rate;
    },

    // Advance and run all the schedule updates in the intervals since the last
    // update took place
    update() {
        this.advance();

        const updateTimes = this.updateTimes;
        const n = updateTimes.length;
        if (this.state === States.Stopped) {
            delete this.updateTimes;
        } else {
            this.updateTimes = [updateTimes[n - 1]];
        }

        for (let i = 1; i < n; ++i) {
            this.scheduler.update(updateTimes[i - 1][1], updateTimes[i][1]);
        }

        this.onupdate();
    },

    // Request an update.
    requestUpdate(force = false) {
        this.tick.requestUpdate(this, () => { this.update(); });
    },

    States,

};
