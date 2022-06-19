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

export const extend = (object, ...properties) => assign.call(object, ...properties);

// Create a Map from a collection xs by applying a function f to every x.
// f is expected to return a [key, value] pair to be added to the Map.
export function assoc(xs, f = I) {
    const m = new Map();
    for (let i = 0, n = xs.length; i < n; ++i) {
        m.set(...f(xs[i], i));
    }
    return m;
}

export const clamp = (x, min, max) => Math.min(Math.max(min, x), max);

// Fold using the first x as the initial accumulator value.
export function fold1(xs, f, that) {
    const n = xs.length;
    if (n === 0) {
        return;
    }

    let z = xs[0];
    for (let i = 1; i < n; ++i) {
        z = f.call(that, z, xs[i]);
    }
    return z;
}

// Identity
export const I = x => x;

// Promise of a loaded image element given its URL.
export const imagePromise = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.src = url;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image with URL "${url}"`));
});

const AsyncFunction = Object.getPrototypeOf(async () => {});
export const isAsync = f => Object.getPrototypeOf(f) === AsyncFunction;

export const isEmpty = x => typeof x === "string" || Array.isArray(x) ? x.length === 0 :
    x instanceof Set || x instanceof Map ? x.keys().next().done :
    isObject(x) ? Object.keys(x).length === 0 : false;

export const isNumber = x => typeof x === "number" && !isNaN(x);
export const isObject = x => typeof x === "object" && x !== null;

// See floored division in https://en.wikipedia.org/wiki/Modulo_operation#Variants_of_the_definition
export const mod = (a, n) => a - n * Math.floor(a / n);

export const nop = () => {};

export function remove(xs, x) {
    const index = xs.indexOf(x);
    console.assert(index >= 0);
    xs.splice(index, 1);
    return x;
}

// Create an array with all numbers between from and to, with a given step.
export function range(from, to, step = 1) {
    const range = [];
    const s = sign(step);
    if (s !== 0 && s * from <= s * to) {
        for (let i = 0; s * (from + i) <= s * to; i += step) {
            range.push(from + i);
        }
    }
    return range;
}

export const sign = x => x < 0 ? -1 : x > 0 ? 1 : 0;

// Finer-grained typeof
export const typeOf = x => typeof x !== "object" ? typeof x :
    x === null ? "null" :
    Array.isArray(x) ? "array" :
    x instanceof Map ? "map" :
    x instanceof Set ? "set" : "object";
