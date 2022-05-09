import { Scheduler } from "./scheduler.js";

export const Clock = {

    States: {
        Running: Symbol.for("running"),
        Stopped: Symbol.for("stopped"),
    },

    create(properties = {}) {
        return Object.assign(Object.create(this), {
            scheduler: Scheduler.create(),
            state: this.States.Stopped
        });
    },

    start() {
        this.startTime = performance.now();
        this.now = -1e-15;
        this.requestUpdate();
        this.state = this.States.Running;
    },

    stop() {
        cancelAnimationFrame(this.request);
        delete this.request;
        this.state = this.States.Stopped;
    },

    update() {
        this.requestUpdate();
        const now = performance.now() - this.startTime;
        this.scheduler.update(this.now, now);
        this.now = now;
    },

    requestUpdate() {
        this.request = requestAnimationFrame(() => { this.update(); });
    },
}
