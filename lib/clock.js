import { create, nop } from "./util.js";
import { Scheduler, Inclusive } from "./scheduler.js";
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
        rate: 1,
        scheduler: Scheduler.create(),
        tick: Tick.create(),
        onupdate: nop,
    }),

    init() {
        this.state = States.Stopped;
    },

    // Get the current time of this clock from its last update; none if stopped.
    get now() {
        return this.updateTimes?.at(-1)?.[1];
    },

    // Start the clock by skipping to zero.
    start() {
        if (this.state !== States.Stopped) {
            return;
        }

        this.updateTimes = [[this.tick.now, 0, Inclusive]];
        this.state = States.Running;
        this.requestUpdate();
    },

    // Stop the clock.
    stop() {
        if (this.state === States.Stopped) {
            return;
        }

        this.advance();
        if (this.state === States.Paused) {
            this.rate = this.pausedRate;
            delete this.pausedRate;
        }
        this.state = States.Stopped;
    },

    // Pause the clock, which is the same as setting the rate to 0.
    pause() {
        if (this.state === States.Running) {
            this.setRate(0);
        }
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
        const lastUpdateTime = this.updateTimes.at(-1);
        const clockTime = isNaN(d) ?
            this.updateTimes.at(-1)[1] + (now - lastUpdateTime[0]) * this.rate :
            this.now + d;
        if (clockTime !== lastUpdateTime[1]) {
            this.updateTimes.push([now, clockTime]);
            this.requestUpdate();
        }
    },

    // Skip to the time t
    skip(t) {
        if (this.state === States.Stopped) {
            return;
        }

        this.advance();
        this.updateTimes.push([this.tick.now, t, Inclusive]);
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
        const n = updateTimes.length - 1;
        if (this.state === States.Stopped) {
            delete this.updateTimes;
        } else {
            this.updateTimes = [updateTimes[n]];
        }

        for (let i = 0; i < n; ++i) {
            const nextUpdateTime = updateTimes[i + 1];
            if (nextUpdateTime[2] !== Inclusive) {
                this.scheduler.update(
                    updateTimes[i][1],
                    updateTimes[i + 1][1],
                    updateTimes[i][2]
                );
            }
        }

        this.onupdate();
    },

    // Request an update.
    requestUpdate(force = false) {
        this.tick.requestUpdate(this, () => { this.update(); });
    },

    States,

};
