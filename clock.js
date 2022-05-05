const nop = () => {};
const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;

const ε = 2e-52;

export const Clock = {

    // Create a new clock
    create(properties = {}) {
        return Object.assign(Object.create(this), properties, {
            schedule: new Set(),
            now: 0,
        });
    },

    // Default rate
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
    // TODO handle zero rate
    start() {
        if (this.request) {
            return;
        }

        let referenceTime = performance.now();
        let lastTime = -ε;
        let lastRate = this.rate;
        const tick = () => {
            this.request = requestAnimationFrame(tick);
            const now = performance.now();
            if (this.rate !== lastRate) {
                referenceTime = now + (lastRate / this.rate) * (referenceTime - now);
                console.log(`~~~ Rate change, new reference time: ${referenceTime}`);
                lastRate = this.rate;
            }
            this.now = (now - referenceTime) * this.rate;
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
        // TODO handle changing rate (lock rate?)
        const now = this.now;
        const direction = sign(now - lastTime);
        if (direction === 0) {
            return;
        }
        let scheduled = [];

        if (direction === 1) {
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
        } else {
            for (const item of this.schedule.values()) {
                const [f, t, d] = item;
                if (isNaN(d)) {
                    // Single occurrence
                    if (t >= now && t < lastTime) {
                        scheduled.push(item);
                    }
                } else {
                    // Repeating occurrence
                    const iMin = Math.ceil((now - t) / d);
                    let iMax = Math.floor((lastTime - t) / d);
                    if ((t + iMax * d) === lastTime) {
                        iMax -= 1;
                    }
                    for (let i = iMin; i <= iMax; ++i) {
                        scheduled.push([f, t + i * d]);
                    }
                }
            }
        }

        if (scheduled.length === 0) {
            return;
        }

        this.locked = true;
        scheduled.sort(([_, a], [__, b]) => direction * (a - b));
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
