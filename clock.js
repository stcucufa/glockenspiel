const nop = () => {};
const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;

const ε = 2e-52;

export const Clock = {

    // Create a new clock
    create(properties = {}) {
        return Object.assign(Object.create(this), properties, {
            // Schedule items:
            //   * [f, d] for single occurrences
            //   * [f, d, t] for repeating occurrences
            // TODO use heap for schedule for faster querying
            schedule: new Set(),

            // NaN when the clock is not running
            now: NaN,
        });
    },

    // Default rate
    // TODO setRate()
    rate: 1,

    // Called when the clock ticks after all the updates have been made
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
        // TODO locked
        if (d === 0) {
            console.warn("Ignoring every with zero interval");
            return;
        }

        // TODO begin/end
        this.schedule.add([f, d * phase, d]);
    },

    // Step by a given amount of time (only when paused)
    step(d) {
        if (this.rate !== 0 || !this.updateState?.request) {
            console.warn("Stepping is only for paused clocks");
            return;
        }

        this.updateState = this.ready();
        this.tick(d);
    },

    // Create a new update state or return the current one if available.
    ready() {
        return this.updateState ?? {
            referenceTime: performance.now(),
            lastTime: -ε,
            lastRate: this.rate,

            resume(now) {
                this.referenceTime += now - this.pauseTime;
                delete this.pauseTime;
            }
        };
    },

    // Tick
    tick(d) {
        const now = performance.now();
        const { lastRate, lastTime, pauseTime, request } = this.updateState;

        this.requestUpdate();

        // Handle rate change (since last tick), and zero rate (paused)
        if (this.rate !== lastRate) {
            if (this.rate === 0) {
                if (isNaN(pauseTime)) {
                    console.info(`Rate set to zero, pausing`);
                    this.updateState.pauseTime = now;
                }
                if (!isNaN(d)) {
                    // Stepping—move everything forward by d
                    this.updateState.referenceTime += d;
                    this.updateState.pauseTime += d;
                    this.now = lastTime + d;
                    this.since(lastTime);
                    this.updateState.lastTime = this.now;
                }
                if (request) {
                    this.ontick();
                }
                return;
            }
            if (!isNaN(pauseTime)) {
                console.info(`Resuming from zero rate with new rate`);
                this.updateState.resume(now);
            }
            this.updateState.referenceTime = now +
                (lastRate / this.rate) * (this.updateState.referenceTime - now);
            console.info(`Rate change, new reference time: ${this.updateState.referenceTime}`);
            this.updateState.lastRate = this.rate;
        } else if (!isNaN(pauseTime)) {
            console.info(`Resuming from zero rate`);
            this.updateState.resume(now);
        }

        this.now = (now - this.updateState.referenceTime) * this.rate;
        this.since(lastTime);
        this.updateState.lastTime = this.now;
        if (request) {
            this.ontick();
        }
    },

    requestUpdate() {
        this.updateState.request = requestAnimationFrame(() => this.tick());
    },

    // Start running the clock
    start() {
        if (this.updateState) {
            return;
        }

        this.updateState = this.ready();
        this.requestUpdate();
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
        this.now = NaN;
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
