const nop = () => {};

export const Clock = {

    // Create a new clock
    create(properties = {}) {
        return Object.assign(Object.create(this), properties, {
            // Schedule items:
            //   * [f, d] for single occurrences
            schedule: new Set(),

            // Default rate
            rate: 1,
        });
    },

    // Schedule an event at time t
    at(f, t) {
        const item = [f, t];
        this.schedule.add(item);

        // When the events are being processed, we may have added an event in
        // the (remaining) interval.
        if (this.scheduled && t > this.now && t <= this.scheduled.at(-1)?.[1]) {
            let i = this.scheduled.length - 1;
            while (i >= 0 && t < this.scheduled[i][1]) {
                --i;
            }
            this.scheduled.splice(i, 0, item);
        }
    },

    // Advance time by d
    tick(d) {
        const lastTime = this.now ?? (-2) ** -1073;
        const now = lastTime + this.rate * d;
        this.between(lastTime, now);
    },

    // Process all events between the last time (excluded) and now
    between(lastTime, now) {
        this.scheduled = [[nop, now]];
        for (const item of this.schedule.values()) {
            const [f, t] = item;
            if (t > lastTime && t <= now) {
                this.scheduled.push(item);
            }
        }
        this.scheduled.sort(([_, a], [__, b]) => a - b);

        while (this.scheduled.length > 0) {
            const [f, t] = this.scheduled.shift();
            this.now = t;
            f(this);
        }
        delete this.scheduled;
    }
}
