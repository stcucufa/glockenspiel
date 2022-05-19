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
        onupdate: nop,
    }),

    init() {
        if (!this.scheduler) {
            this.scheduler = Scheduler.create();
        }
        if (!this.tick) {
            this.tick = Tick.create();
        }
        this.state = States.Stopped;
    },

    // Get the current time of this clock from its last update; none if stopped.
    get now() {
        return this.updateTimes?.at(-1)?.[1];
    },

    // Start the clock when it is stopped.
    start() {
        if (this.state !== States.Stopped) {
            return;
        }

        this.updateTimes = [[this.tick.now, 0, Inclusive]];
        if (this.rate === 0) {
            this.state = States.Paused;
        } else {
            this.state = States.Running;
            this.requestUpdate();
        }
    },

    // Stop the clock when it is running or paused.
    // Note that there will be an update in every case.
    stop() {
        if (this.state === States.Stopped) {
            return;
        }

        this.markNow();
        this.requestUpdate();
        this.state = States.Stopped;
        this.resume();
    },

    // Pause the clock, saving the rate so that it can be restored with resume().
    pause() {
        if (this.state === States.Running) {
            this.pausedRate = this.rate;
            this.setRate(0);
        }
    },

    // Resume the paused clock at the previous rate.
    resume() {
        if (isNaN(this.pausedRate)) {
            return;
        }

        this.setRate(this.pausedRate);
        delete this.pausedRate;
    },

    // Set a new rate; pausing or resuming the clock if the new rate is, or the
    // old rate was, zero.
    setRate(rate) {
        if (rate === this.rate) {
            return;
        }

        if (this.state !== States.Stopped) {
            if (this.rate === 0) {
                this.state = States.Running;
                this.requestUpdate();
                this.updateTimes.push([this.tick.now, this.updateTimes.at(-1)[1]]);
                delete this.pausedRate;
            } else {
                this.markNow();
            }

            if (rate === 0) {
                this.state = States.Paused;
            }
        }

        this.rate = rate;
    },

    // Advance time by d when running or paused, requesting an update so that
    // an update happens even when paused.
    advance(d) {
        if (this.state === States.Stopped) {
            return;
        }

        this.updateTimes.push([this.tick.now, this.now + d]);
        this.requestUpdate();
    },

    // Skip time by d; events in the interval will not happen.
    skip(d) {
        if (this.state === States.Stopped) {
            return;
        }

        this.markNow();
        const [tickTime, clockTime] = this.updateTimes.at(-1);
        this.updateTimes.push([tickTime, clockTime + d, Inclusive]);
    },


    // Mark the current time in the list of update times.
    markNow() {
        const now = this.tick.now;
        const lastUpdateTime = this.updateTimes.at(-1);
        this.updateTimes.push([
            now,
            lastUpdateTime[1] + (now - lastUpdateTime[0]) * this.rate
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
        // FIXME this could be wrong if pausing during the update
        this.updateTimes = [updateTimes[n]];

        for (let i = 0; this.state === States.Running && i < n; ++i) {
            const nextUpdateTime = updateTimes[i + 1];
            if (nextUpdateTime[2] !== Inclusive) {
                const from = updateTimes[i][1];
                const to = nextUpdateTime[1];
                const schedule = this.scheduler.schedule(from, to, updateTimes[i][2]);
                const m = schedule.length;
                for (let j = 0; this.state === States.Running && j < m; ++j) {
                    const [f, t] = schedule[j];
                    f(t, [from, to]);
                }
            }
        }

        if (this.state === States.Running) {
            this.requestUpdate();
        } else if (this.state === States.Stopped) {
            delete this.updateTimes;
        }

        this.onupdate();
    },

    States,

};
