import { Scheduler } from "./scheduler.js";

export const Clock = {

    States: {
        Running: Symbol.for("running"),
        Stopped: Symbol.for("stopped"),
        Paused: Symbol.for("paused"),
    },

    // Create a new clock with a default rate and scheduler.
    create(properties = {}) {
        return Object.assign(Object.create(this), {
            rate: 1,
            scheduler: Scheduler.create(),
        }, properties, {
            state: this.States.Stopped
        });
    },

    // Set a new rate
    setRate(rate) {
        if (rate === this.rate) {
            return;
        }

        const now = performance.now();
        const lastUpdateTime = (now - this.referenceTime) * this.rate;

        if (this.rate === 0) {
            // Resume from pause
            this.requestUpdate();
            this.state = this.States.Running;
            this.referenceTime = now - this.pauseTime / rate;
            delete this.pauseTime;
        } else {
            // Issue updates up to now before the new rate takes effect.
            this.scheduler.update(this.lastUpdateTime, lastUpdateTime);
            this.lastUpdateTime = lastUpdateTime;
        }

        if (rate === 0) {
            // Pause
            this.stop();
            this.state = this.States.Paused;
            this.pauseTime = this.now;
        } else if (this.rate !== 0) {
            // Keep going
            this.referenceTime = now - lastUpdateTime / rate;
        }

        this.rate = rate;
    },

    // Get the current time of this clock from the actual reported time.
    get now() {
        return this.rate === 0 ?
            this.pauseTime :
            (performance.now() - this.referenceTime) * this.rate;
    },

    // Start the clock just before zero.
    start() {
        this.referenceTime = performance.now();
        this.lastUpdateTime = -1e-15;
        this.requestUpdate();
        this.state = this.States.Running;
    },

    // Stop the clock
    stop() {
        cancelAnimationFrame(this.request);
        delete this.request;
        this.state = this.States.Stopped;
    },

    // Pause the clock
    pause() {
        if (this.rate === 0) {
            return;
        }

        this.pausedRate = this.rate;
        this.setRate(0);
    },

    // Resume the clock
    resume() {
        if (isNaN(this.pausedRate)) {
            return;
        }

        this.setRate(this.pausedRate);
        delete this.pausedRate;
    },

    // Advance by d (unaffected by rate)
    advance(d) {
        this.referenceTime -= d;
    },

    // Run all scheduled updates between last time and now.
    update() {
        this.requestUpdate();
        const updateTime = this.now;
        this.scheduler.update(this.lastUpdateTime, updateTime);
        this.lastUpdateTime = updateTime;
    },

    requestUpdate() {
        this.request = requestAnimationFrame(() => { this.update(); });
    },

};
