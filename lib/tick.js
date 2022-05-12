import { assign, nop } from "./util.js";

export const Tick = {

    create() {
        return assign.call(this, {
            targets: new Map()
        });
    },

    get now() {
        return performance.now();
    },

    requestUpdate(target, handler) {
        this.targets.set(target, handler);
        if (!this.request) {
            this.request = requestAnimationFrame(() => { this.update(); });
        }
    },

    update() {
        const handlers = [...this.targets.values()];
        this.targets.clear();
        delete this.request;

        const updateTime = this.now;
        for (const handler of handlers) {
            handler(updateTime);
        }
    },

    tick: nop

};

export const ManualTick = {

    create() {
        return assign.call(this, {
            currentTime: 0,
            targets: new Map()
        });
    },

    get now() {
        return this.currentTime;
    },

    tick(d) {
        this.currentTime += d;
        Tick.update.call(this);
    },

    requestUpdate(target, handler) {
        targets.set(target, handler);
    }

};
