export function assign(...properties) {
    return Object.assign(Object.create(this), ...properties);
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

export function nop() {
}

export const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;
