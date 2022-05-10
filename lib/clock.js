import { Scheduler } from "./scheduler.js";

export const Clock = {

    States: {
        Running: Symbol.for("running"),
        Stopped: Symbol.for("stopped"),
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
        if (rate === this.rate || rate === 0) {
            //  TODO zero rate = pause
            return;
        }

        const now = performance.now();
        const lastUpdateTime = (now - this.referenceTime) * this.rate;
        this.scheduler.update(this.lastUpdateTime, lastUpdateTime);
        this.lastUpdateTime = lastUpdateTime;

        this.referenceTime = now - lastUpdateTime / rate;
        this.rate = rate;
    },

    // Get the current time of this clock from the actual reported time.
    get now() {
        return (performance.now() - this.referenceTime) * this.rate;
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
