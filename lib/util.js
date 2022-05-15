export function assign(...properties) {
    return Object.assign(Object.create(this), ...properties);
}

export function create(defaults = {}) {
    return function(...properties) {
        const o = assign.call(this, defaults, ...properties);
        if (typeof o.init === "function") {
            o.init();
        }
        return o;
    }
}

// Create a Map from a collection xs by applying a function f to every x.
// f is expected to return a [key, value] pair to be added to the Map.
export function assoc(xs, f) {
    let m = new Map();
    for (let i = 0, n = xs.length; i < n; ++i) {
        m.set(...f(xs[i], i));
    }
    return m;
}

const AsyncFunction = Object.getPrototypeOf(async () => {});
export const isAsync = f => Object.getPrototypeOf(f) === AsyncFunction;

export const isObject = x => typeof x === "object" && x !== null;

export const nop = () => {};

export const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;
