const sources = new Map();

// Set up a listener for events from a source of a given type.
export function on(source, type, listener) {
    if (!sources.has(source)) {
        sources.set(source, {});
    }
    const listeners = sources.get(source);
    if (!listeners.hasOwnProperty(type)) {
        listeners[type] = new Set();
    }
    listeners[type].add(listener);
}

// Set up a listener for the next event from a source of a given type.
export function once(source, type, listener) {
    on(source, type, function f(e) {
        off(source, type, f);
        listener(e);
    });
}

// Stop listening to events from a source of a given type.
export const off = (source, type, listener) => {
    sources.get(source)?.[type]?.delete(listener);
};

// Send a synchronous notification
export function notify(source, type, args = {}) {
    dispatch(source, type, args, (listeners, args) => {
        for (const listener of listeners.values()) {
            listener(args);
        }
    });
}

// Send an asynchronous notification
export function notifyAsync(source, type, args = {}) {
    const promises = [];
    args = { source, type, ...args };
    const listeners = sources.get(source)?.[type];
    if (listeners) {
        for (const listener of listeners.values()) {
            promises.push(new Promise(resolve => { resolve(listener(args)); }));
        }
    }
    return Promise.all(promises);
}

function dispatch(source, type, args, f) {
    const listeners = sources.get(source)?.[type];
    if (listeners) {
        return f(listeners, { source, type, ...args });
    }
}
