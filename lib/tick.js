import { create, nop } from "./util.js";

export const Tick = {

    // Create a new tick.
    create: create(),

    init() {
        this.targets = new Map()
    },

    // Return the current time.
    get now() {
        return performance.now();
    },

    // Register the target/handler for an update next time time advances.
    requestUpdate(target, handler) {
        this.targets.set(target, handler);
        if (!this.request) {
            this.request = requestAnimationFrame(() => { this.update(); });
        }
    },

    // Call the handlers of each target with the update time.
    update() {
        const handlers = [...this.targets.values()];
        this.targets.clear();
        delete this.request;

        const updateTime = this.now;
        for (const handler of handlers) {
            handler(updateTime);
        }
    },

};

export const ManualTick = {

    // Create a new manual tick.
    create: create({
        currentTime: 0,
    }),

    init() {
        this.targets = new Map();
    },

    // Return the current time.
    get now() {
        return this.currentTime;
    },

    // Skip by d units, with no update.
    skip(d) {
        this.currentTime += d;
    },

    // Advance by d units and update (synchronously).
    advance(d) {
        this.skip(d);
        Tick.update.call(this);
    },

    // Register the target/handler for an update next time time advances.
    requestUpdate(target, handler) {
        this.targets.set(target, handler);
        this.request = true;
    }

};
