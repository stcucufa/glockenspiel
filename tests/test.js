import { create, isEmpty, isObject, nop, typeOf } from "../lib/util.js";
import { notify } from "../lib/events.js";
import { show } from "../lib/show.js";

const DefaultTimeoutMs = 300;

// Lazy-evaluated message with optional context
const message = (msg, context) => () => (context ? `${context}: ` : "") + msg();

// Deep equality test
const equal = (x, y) => (x === y) || (
    typeof x !== typeof y ? false :
    isObject(x) ? equal_object(x, y) :
    typeof x === "number" ? equal_number(x, y) :
        false
);

// Compare objects, checking for specific types; otherwise they must have the same keys and equal values
function equal_object(x, y) {
    if (Array.isArray(x)) {
        return Array.isArray(y) && equal_array(x, y);
    }
    if (x instanceof Map) {
        return y instanceof Map && equal_map(x, y);
    }

    const keys = Object.keys(x);
    return keys.length === Object.keys(y).length &&
        keys.every(key => key in y && equal(x[key], y[key]));
}

const equal_array = (x, y) => x.length === y.length && x.every((xi, i) => equal(xi, y[i]));

// Compare Maps
function equal_map(x, y) {
    const keys = [...x.keys()];
    return keys.length === [...y.keys()].length &&
        keys.every(key => y.has(key) && equal(x.get(key), y.get(key)));
}

// Compare numbers, allowing NaN === NaN
const equal_number = (x, y) => typeof y === "number" && (x === y || isNaN(x) && isNaN(y));

export function diff(x, y) {
    const tx = typeOf(x);
    const ty = typeOf(y);

    const helpers = {
        object: function(x, y) {
            const dx = {};
            const dy = {};
            for (let [k, v] of Object.entries(x)) {
                if (!(k in y)) {
                    dx[k] = v;
                } else if (!equal(v, y[k])) {
                    dx[k] = v;
                    dy[k] = y[k];
                }
            }
            for (let [k, v] of Object.entries(y)) {
                if (!(k in x)) {
                    dy[k] = v;
                }
            }
            return isEmpty(dx) && isEmpty(dy) ? [] : [dx, dy];
        }
    };

    return tx !== ty ? [tx, ty] : tx in helpers ? helpers[tx](x, y) : x !== y ? [x, y] : [];
}

const TestCase = {
    create: create({ timeoutMs: DefaultTimeoutMs }),

    init() {
        this.failures = [];
    },

    expect(p, [message, context]) {
        if (!p) {
            this.failures.push((context ? `${context}: ` : "") + message());
        }
    },

    above(value, expected, context) {
        this.expect(
            value > expected,
            [() => `expected ${show(value)} to be above (>) ${show(expected)}`, context]
        );
    },

    atLeast(value, expected, context) {
        this.expect(
            value >= expected,
            [() => `expected ${show(value)} to be at least (>=) ${show(expected)}`, context]
        );
    },

    atMost(value, expected, context) {
        this.expect(
            value <= expected,
            [() => `expected ${show(value)} to be at most (<=) ${show(expected)}`, context]
        );
    },

    below(value, expected, context) {
        this.expect(
            value < expected,
            [() => `expected ${show(value)} to be below (<) ${show(expected)}`, context]
        );
    },

    empty(value, context) {
        this.expect(
            isEmpty(value),
            [() => `expected ${show(value)} to be empty`, context]
        );
    },

    equal(value, expected, context) {
        this.expect(
            equal(value, expected),
            [() => `expected ${show(value)} to be equal to ${show(expected)}; diff: ${show(diff(value, expected))}`, context]
        );
    },

    fail(message = "failed") {
        this.failures.push(message);
    },

    instanceof(value, expected, context) {
        this.expect(
            value instanceof expected,
            [() => `expected ${show(value)} to be an instance of ${show(expected)}`, context]
        );
    },

    ok(value, context) {
        this.expect(
            !!value,
            [() => `expected ${show(value)} to be ok (!!)`, context]
        );
    },

    same(value, expected, context) {
        this.expect(
            value === expected,
            [() => `expected ${show(value)} to be the same (===) as ${show(expected)}`, context]
        );
    },

    skip() {
        const error = new Error("Skip");
        error.name = "SkipError";
        throw error;
    },

    throws(f, context) {
        try {
            f();
            this.failures.push((context ? `${context}: ` : "") + "expected an exception to be thrown");
        } catch (_) {
        }
    },

    typeof(value, expected, context) {
        this.expect(
            typeof value === expected,
            [() => `expected ${show(value)} to be of type (typeof) ${show(expected)}`, context]
        );
    },

    undefined(value, context) {
        this.expect(
            value === void 0,
            [() => `expected ${show(value)} to be undefined`, context]
        );
    }
};

const icon = (function() {
    const script = Array.prototype.find.call(
        document.querySelectorAll("script"),
        script => /\/test\.js\b/.test(script.src)
    );
    const prefix = script?.src.replace(/\/test\.js\b.*/, "/");
    return id => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="icon">
    <use xlink:href="${prefix}icons.svg#${id}"/>
</svg>`;
})();

function postMessage(target, type, data = {}) {
    target.postMessage(JSON.stringify(Object.assign(data, { type })), "*");
}

function initFrame(tests) {
    const iframe = document.createElement("iframe");
    const status = document.querySelector("p.status");

    function nextTest() {
        iframe.remove();
        if (tests.length > 0) {
            run(tests.shift());
        } else {
            console.info("### Ran all tests.");
        }
    }

    let currentLi;
    let startTimeout;
    let missing = 0;

    function updateIcon(name, data) {
        if (/#running/.test(currentLi.innerHTML)) {
            currentLi.innerHTML = currentLi.innerHTML.replace(/#running/, `#${name}`);
        } else {
            currentLi.innerHTML += ` ${icon(name)} ${data.title ?? data.i}`;
        }
    }

    function run(li) {
        currentLi = li;
        if (status) {
            status.innerHTML = `${icon("running")} Running ${currentLi.innerHTML}`;
        }
        startTimeout = setTimeout(() => {
            console.log(`??? No tests for ${iframe.src}`);
            currentLi.innerHTML = `<a href="${iframe.src}" class="notests">${currentLi.textContent}</a>`;
            missing += 1;
            handler.done();
        }, DefaultTimeoutMs);
        document.body.appendChild(iframe);
        iframe.src = li.textContent;
    }
    nextTest();

    const handler = {
        ready(e, data) {
            console.log(">>> Running tests");
            clearTimeout(startTimeout);
            currentLi.innerHTML = `<a href="${data.url.href}">${data.title}</a>`;
            postMessage(e.source, "run");
        },

        started(e, data) {
            currentLi.innerHTML += ` ${icon("running")} ${data.title ?? data.i}`;
        },

        success(e, data) {
            updateIcon("pass", data);
            this.successes += 1;
            console.log(`+++ Success, #successes: ${this.successes}`);
            postMessage(e.source, "run");
        },

        failure(e, data) {
            updateIcon("fail", data);
            this.failures += 1;
            console.log(`--- Failure: ${data.error}, #failures: ${this.failures}`);
            postMessage(e.source, "run");
        },

        timeout(e, data) {
            currentLi.innerHTML = currentLi.innerHTML.replace(/#running/, "#timeout");
            this.timeouts += 1;
            console.log(`@@@ Timeout: ${data.error}, #timeouts: ${this.timeouts}`);
            postMessage(e.source, "run");
        },

        skipped(e, data) {
            updateIcon("skip", data);
            this.skips += 1;
            console.log(`~~~ Skipped, #skips: ${this.skips}`);
            postMessage(e.source, "run");
        },

        done() {
            console.log(`<<< Done, #successes: ${this.successes}, #failures: ${this.failures}, #timeouts: ${this.timeouts}, #skips: ${this.skips}, #missing: ${missing}`);
            if (status) {
                const reports = [
                    ["successes", this.successes],
                    ["failures", this.failures],
                    ["timeouts", this.timeouts],
                    ["skips", this.skips],
                    ["missing", missing]
                ].filter(([_, n]) => n > 0).map(xs => xs.join(": "));
                const failure = this.failures > 0 || this.timeouts > 0 || missing > 0;
                status.innerHTML = `${icon(failure ? "fail" : "pass")} Done, ${reports.join(", ")}.`;
            }
            nextTest();
        },

        successes: 0,
        failures: 0,
        timeouts: 0,
        skips: 0
    };

    return handler;
}

function initTest() {
    console.log(`!!! New tests: ${document.title} (${window.location})`);
    postMessage(parent, "ready", {
        title: document.title,
        url: window.location
    });

    const runner = {
        async run(e, data) {
            const n = this.tests.length;
            if (n > 0) {
                if (isNaN(this.testCount)) {
                    this.testCount = n;
                }

                const [title, test] = this.tests.shift();
                const i = this.testCount - n;
                const data = { title, i };

                console.log(`... Running test #${i + 1}${title ? (": \"" + title + "\"") : ""}`);
                const testCase = TestCase.create({ for: title });
                try {
                    const promise = test(testCase);
                    if (typeof promise?.then === "function") {
                        postMessage(e.source, "started", data);
                        await Promise.race([
                            promise,
                            new Promise((_, reject) => {
                                window.setTimeout(() => {
                                    reject({ message: "Timeout", timeout: true });
                                }, testCase.timeoutMs);
                            })
                        ]);
                    }
                    if (testCase.failures.length > 0) {
                        postMessage(
                            e.source,
                            "failure",
                            Object.assign(data, { error: testCase.failures.join("; ") })
                        );
                    } else {
                        postMessage(e.source, "success", data);
                    }
                } catch (error) {
                    if (error.name === "SkipError") {
                        postMessage(e.source, "skipped", data);
                    } else {
                        postMessage(
                            e.source,
                            error.timeout ? "timeout" : "failure",
                            Object.assign(data, { error: error.message })
                        );
                    }
                }
            } else {
                postMessage(e.source, "done");
            }
        },

        tests: [],
    };

    return parent !== window ? runner : Object.assign(runner, {
        ready(e, data) {
            console.log(`>>> Running tests: ${data.title}`);
            postMessage(e.source, "run");
        },

        started: nop,

        success(e) {
            this.successes += 1;
            console.log(`+++ Success, #successes: ${this.successes}`);
            postMessage(e.source, "run");
        },

        failure(e, data) {
            this.failures += 1;
            console.log(`--- Failure: ${data.error}, #failures: ${this.failures}`);
            postMessage(e.source, "run");
        },

        timeout(e, data) {
            this.timeouts += 1;
            console.log(`@@@ Timeout: ${data.error}, #timeouts: ${this.timeouts}`);
            postMessage(e.source, "run");
        },

        skipped(e, data) {
            this.skips += 1;
            console.log(`~~~ Skipped, #skips: ${this.skips}`);
            postMessage(e.source, "run");
        },

        done(e) {
            console.log(`<<< Done, #successes: ${this.successes}, #failures: ${this.failures}, #timeouts: ${this.timeouts}, #skips: ${this.skips}`);
            notify(window, "tests:done", { handler: this });
        },

        successes: 0,
        failures: 0,
        timeouts: 0,
        skips: 0
    });
}

const handler = (function () {
    const tests = [...document.querySelectorAll("ul.tests")].flatMap(
        ul => [...ul.querySelectorAll("li")]
    );
    const handler = tests.length > 0 ? initFrame(tests) : initTest();
    window.addEventListener("message", e => {
        const data = JSON.parse(e.data);
        handler[data.type](e, data);
    });
    return handler;
})();

export function test(title, f) {
    if (!f) {
        f = title;
        title = "";
    }
    handler.tests.push([title, f]);
}
