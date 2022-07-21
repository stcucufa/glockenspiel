import { create, escapeMarkup, isEmpty, isObject, nop } from "../lib/util.js";
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

const TestCase = {
    create: create({ timeoutMs: DefaultTimeoutMs }),

    init() {
        this.failures = [];
        this.expectations = [];
        this.assert = console.assert;
        console.assert = (p, ...rest) => {
            this.assert.call(console, p, ...rest);
            this.expect(p, [() => "assertion failed"], true);
        };
    },

    done(...args) {
        console.assert = this.assert;
        postMessage(...args);
    },

    expect(p, [message, context], failureOnly = false) {
        if (!(p && failureOnly)) {
            this.expectations.push(
                [p ? (context ?? "") : ((context ? `${context}: ` : "") + message()), p]
            );
        }
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
            [() => `expected ${show(value)} to be equal to ${show(expected)}`, context]
        );
    },

    fail(message = "failed") {
        this.expectations.push([message, false]);
        this.failures.push(message);
    },

    instanceof(value, expected, context) {
        this.expect(
            value instanceof expected,
            [() => `expected ${show(value)} to be an instance of ${show(expected)}`, context]
        );
    },

    match(value, regex, context) {
        this.expect(
            regex.test(value),
            [() => `expected ${show(value)} to match ${show(regex)}`, context]
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
            const message = (context ? `${context}: ` : "") + "expected an exception to be thrown";
            this.expectations.push([message, false]);
            this.failures.push(message);
        } catch (_) {
            this.expectations.push([context ?? "", true]);
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
    const prefix = Array.prototype.find.call(
        document.querySelectorAll("script"),
        script => /\/test\.js\b/.test(script.src)
    )?.src.replace(/\/test\.\b.*/, "/") ?? Array.prototype.find.call(
        document.querySelectorAll("link[rel=stylesheet]"),
        link => /\/test\.css\b/.test(link.href)
    )?.href.replace(/\/test\.css.*/, "/");
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
        }
    }

    let currentLi;
    let currentURL;
    let startTimeout;
    let missing = 0;

    function updateIcon(name, data) {
        if (/#running/.test(currentLi.innerHTML)) {
            currentLi.innerHTML = currentLi.innerHTML.replace(/#running/, `#${name}`);
        } else {
            currentLi.innerHTML += ` <a href="${currentURL}#${data.i}">${icon(name)}</a> ${escapeMarkup(data.title ?? data.i)}`;
        }
    }

    function run(li) {
        currentLi = li;
        if (status) {
            status.innerHTML = `${icon("running")} Running ${currentLi.innerHTML}`;
        }
        startTimeout = setTimeout(() => {
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
            clearTimeout(startTimeout);
            currentLi.innerHTML = `<a href="${data.url.href}">${escapeMarkup(data.title)}</a>`;
            currentURL = data.url.href;
            postMessage(e.source, "run");
        },

        started(e, data) {
            currentLi.innerHTML += ` <a href="#${data.i}">${icon("running")}</a> ${escapeMarkup(data.title ?? data.i)}`;
        },

        success(e, data) {
            updateIcon("pass", data);
            this.successes += 1;
            postMessage(e.source, "run");
        },

        failure(e, data) {
            updateIcon("fail", data);
            this.failures += 1;
            postMessage(e.source, "run");
        },

        timeout(e, data) {
            currentLi.innerHTML = currentLi.innerHTML.replace(/#running/, "#timeout");
            this.timeouts += 1;
            postMessage(e.source, "run");
        },

        skipped(e, data) {
            updateIcon("skip", data);
            this.skips += 1;
            postMessage(e.source, "run");
        },

        done() {
            if (status) {
                const reports = [
                    ["successes", this.successes],
                    ["failures", this.failures],
                    ["timeouts", this.timeouts],
                    ["skips", this.skips],
                    ["missing", missing]
                ].filter(([_, n]) => n > 0).map(xs => xs.join(": "));
                const failure = this.failures > 0 || this.timeouts > 0 || missing > 0;
                status.innerHTML = `${icon(failure ? "fail" : "pass")} Done, ${escapeMarkup(reports.join(", "))}.`;
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
    postMessage(parent, "ready", {
        title: document.title,
        url: window.location
    });

    function updateIcon(name, data) {
        const li = document.querySelector(`ul.tests li:nth-child(${data.i + 1})`);
        if (/#running/.test(li.innerHTML)) {
            li.innerHTML = li.innerHTML.replace(/#running/, `#${name}`);
        } else {
            li.innerHTML += ` ${icon(name)}`;
        }
    }

    function showExpectations(data) {
        const li = document.querySelector(`ul.tests li:nth-child(${data.i + 1})`);
        li.innerHTML += data.error ? ` ${icon("fail")} ${escapeMarkup(data.error)}` : data.expectations.map(
            ([message, pass]) => ` ${icon(pass ? "pass" : "fail")} ${escapeMarkup(message)}`
        ).join("");
    }

    function updateStatus(name, message) {
        const status = document.querySelector("p.status");
        if (status) {
            status.innerHTML = `${icon(name)} ${escapeMarkup(message)}`;
        }
    }

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

                updateStatus("running", title ?? i);
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
                        testCase.done(
                            e.source,
                            "failure",
                            Object.assign(data, { expectations: testCase.expectations })
                        );
                    } else {
                        testCase.done(
                            e.source,
                            "success",
                            Object.assign(data, { expectations: testCase.expectations })
                        );
                    }
                } catch (error) {
                    if (error.name === "SkipError") {
                        testCase.done(e.source, "skipped", data);
                    } else {
                        testCase.done(
                            e.source,
                            error.timeout ? "timeout" : "failure",
                            Object.assign(data, { error: error.message ?? error })
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
            const h1 = document.body.appendChild(document.createElement("h1"));
            h1.textContent = data.title;
            const status = document.body.appendChild(document.createElement("p"));
            status.classList = "status";
            const ul = document.body.appendChild(document.createElement("ul"));
            ul.classList = "tests";

            const i = parseInt(location.hash.substr(1));
            if (i >= 0 && i < this.tests.length) {
                const li = ul.appendChild(document.createElement("li"));
                li.innerHTML = `<a href="#">${escapeMarkup(this.tests[i][0])}</a>`;
                this.tests = [this.tests[i]];
            } else {
                this.tests.forEach(function([title], i) {
                    const li = ul.appendChild(document.createElement("li"));
                    li.innerHTML = `<a href="#${i}">${escapeMarkup(title)}</a>`;
                });
            }
            window.onhashchange = () => { location.reload(); };
            postMessage(e.source, "run");
        },

        success(e, data) {
            showExpectations(data);
            this.successes += 1;
            postMessage(e.source, "run");
        },

        failure(e, data) {
            showExpectations(data);
            this.failures += 1;
            postMessage(e.source, "run");
        },

        timeout(e, data) {
            updateIcon("timeout", data);
            this.timeouts += 1;
            postMessage(e.source, "run");
        },

        skipped(e, data) {
            updateIcon("skip", data);
            this.skips += 1;
            postMessage(e.source, "run");
        },

        done(e) {
            const reports = [
                ["successes", this.successes],
                ["failures", this.failures],
                ["timeouts", this.timeouts],
                ["skips", this.skips],
            ].filter(([_, n]) => n > 0).map(xs => xs.join(": "));
            const failure = this.failures > 0 || this.timeouts > 0;
            updateStatus(failure ? "fail" : "pass", `Done, ${reports.join(", ")}.`);
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
