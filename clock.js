const nop = () => {};
const ε = 2e-52;

const Clock = {

    // Create a new clock
    create(properties = {}) {
        return Object.assign(Object.create(this), properties, {
            schedule: new Set(),
            now: 0,
        });
    },

    // Default rate
    // TODO set rate at runtime
    rate: 1,

    // Called when the clock ticks
    ontick: nop,

    // Schedule an event at time t (in ms)
    at(f, t) {
        if (this.locked) {
            // TODO scheduling in the past (should be OK)
            // TODO scheduling in the future (should be OK)
            // TODO scheduling in the same update interval
            // TODO scheduling at the exact same time (can lead to a loop)
            console.warn("Ignoring at() during update");
            return;
        }

        this.schedule.add([f, t]);
    },

    // Schedule an event every d ms, with an optional phase (0-1)
    every(f, d, phase = 0) {
        if (d === 0) {
            console.warn("Ignoring every with zero interval");
            return;
        }

        this.schedule.add([f, this.now + d * (1 + phase), d]);
    },

    // Start running the clock
    start() {
        if (this.request) {
            return;
        }

        const startTime = performance.now();
        let lastTime = -ε;
        const tick = () => {
            this.request = requestAnimationFrame(tick);
            this.now = (performance.now() - startTime) * this.rate;
            this.since(lastTime);
            lastTime = this.now;
            if (this.request) {
                this.ontick();
            }
        };

        this.request = requestAnimationFrame(tick);
    },

    // Stop the clock, resetting the time
    stop() {
        if (!this.request) {
            return;
        }

        if (this.locked) {
            this.stopped = true;
            return;
        }

        cancelAnimationFrame(this.request);
        delete this.request;
        this.now = 0;
    },

    // Sort and call all the callbacks for the interval since the last time
    since(lastTime) {
        // TODO negative rate
        const now = this.now;
        let scheduled = [];
        for (const item of this.schedule.values()) {
            const [f, t, d] = item;
            if (isNaN(d)) {
                // Single occurrence
                if (t > lastTime && t <= now) {
                    scheduled.push(item);
                }
            } else {
                // Repeating occurrence
                let iMin = Math.ceil((lastTime - t) / d);
                if ((t + iMin * d) === lastTime) {
                    iMin += 1;
                }
                const iMax = Math.floor((now - t) / d);
                for (let i = iMin; i <= iMax; ++i) {
                    scheduled.push([f, t + i * d]);
                }
            }
        }

        if (scheduled.length === 0) {
            return;
        }

        this.locked = true;
        scheduled.sort(([_, a], [__, b]) => a - b);
        for (const [f, t] of scheduled) {
            if (!this.stopped) {
                f(t);
            }
        }
        delete this.locked;

        if (this.stopped) {
            delete this.stopped;
            this.stop();
        }
    }

};

const clock = Clock.create({
    rate: 5,
    ontick() {
        console.log(`... clock time: ${clock.now.toFixed(1)} (reported: ${Math.round(performance.now())})`);
    }
});

const f = t => console.log(`!!! At ${t.toFixed(1)}`);
clock.at(f, 0);
clock.at(f, 2);
clock.at(f, 4);
clock.at(f, 6);
clock.at(f, 100);
clock.at(f, 201);

clock.at(() => { clock.at(f, 50); }, 50);

clock.at(t => {
    console.log(`!!! Stopping the clock at ${t.toFixed(1)} (clock time: ${clock.now.toFixed(1)})`);
    clock.stop();
}, 200);

clock.every(t => console.log(`*** At ${t.toFixed(1)}`), 10, 0.5);  // TODO 15, 25, 35, ...
clock.every(t => console.log(`### At ${t.toFixed(1)}`), 44, 0);  // TODO 15, 25, 35, ...

clock.start();
