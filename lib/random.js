import { create, nop } from "./util.js";

// https://en.wikipedia.org/wiki/Xorshift
function xorshift32(x) {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return x >>> 0;
}

export let RNG = {
    create(seed) {
        return Object.create(this).seed(
            isNaN(seed) || seed === 0 ? Date.now() : seed
        );
    },

    seed(x) {
        let state = x >>> 0;
        if (state === 0) {
            throw new Error("Seed must be a 32 bit unsigned !== 0");
        }
        this.state = state;
        return this;
    },

    coinToss(p = 0.5) {
        return this.random() < p;
    },

    forward() {
        this.state = xorshift32(this.state);
    },

    random() {
        this.forward();
        return this.state / 0xffffffff;
    },

    randomId(prefix = "id_") {
        return prefix + this.random().toString(36).substr(2);
    },

    randomInt(min, max) {
        if (isNaN(min)) {
            this.forward();
            return this.state;
        }

        if (isNaN(max)) {
            max = min;
            min = 0;
        }
        return min + Math.floor(this.random() * (max + 1 - min));
    },

    randomNumber(min, max) {
        if (isNaN(min)) {
            return this.random();
        }

        if (isNaN(max)) {
            max = min;
            min = 0;
        }
        return min + this.random() * (max - min);
    },

    randomItem(items) {
        return items[this.randomInt(0, items.length - 1)];
    },

    shuffle(items) {
        let shuffled = items.slice();
        for (let i = items.length - 1; i > 0; --i) {
            let j = this.randomInt(0, i);
            let shuffled_i = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = shuffled_i;
        }
        return shuffled;
    }
};

export let DefaultRNG = Object.assign(Object.create(RNG), {
    create: create(),
    seed: nop,
    random: () => Math.random(),
    forward() {
        this.state = Math.random() >>> 0;
    }
});

export let Urn = {
    create(items, rng, allowDuplicates = false) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("Items must be an array with at least on element");
        }
        return Object.assign(Object.create(this), {
            items,
            rng: rng ?? DefaultRNG.create(),
            allowDuplicates
        }).refill();
    },

    refill() {
        this.remainingItems = this.items.slice();
        return this;
    },

    pick() {
        if (this.remainingItems.length === 0) {
            this.refill();
        }

        while (true) {
            let i = this.rng.randomInt(0, this.remainingItems.length - 1);
            if (this.allowDuplicates ||
                this.remainingItems[i] !== this.lastPick ||
                this.remainingItems.length === 1) {
                this.lastPick = this.remainingItems.splice(i, 1)[0];
                return this.lastPick;
            }
        }
    }
};
