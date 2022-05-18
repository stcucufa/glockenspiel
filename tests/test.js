import { create, isAsync } from "../lib/util.js";
import { show } from "../lib/show.js";

// Lazy-evaluated message with optional context
const message = (msg, context) => () => (context ? `${context}: ` : "") + msg;

const TestCase = {
    create: create({ timeoutMs: 300 }),

    init() {
        this.failures = [];
    },

    expect(p, msg) {
        if (!p) {
            this.failures.push(msg());
        }
    },

    above(value, expected, context) {
        this.expect(
            value > expected,
            message(`expected ${show(value)} to be above (>) ${show(expected)}`, context)
        );
    },

    atLeast(value, expected, context) {
        this.expect(
            value >= expected,
            message(`expected ${show(value)} to be at least (>=) ${show(expected)}`, context)
        );
    },

    equal(value, expected, context) {
        this.expect(
            value === expected,
            message(`expected ${show(value)} to be equal to (===) ${show(expected)}`, context)
        );
    },

    typeof(value, expected, context) {
        this.expect(
            typeof value === expected,
            message(`expected ${show(value)} to be of type (typeof) ${show(expected)}`, context)
        );

    },

    ok(value, context) {
        this.expect(
            !!value,
            message(`expected ${show(value)} to be ok (!!)`, context)
        );
    }
};

function postMessage(target, type, data = {}) {
    target.postMessage(JSON.stringify(Object.assign(data, { type })), "*");
}

function initFrame(tests) {
    const iframe = document.body.appendChild(document.createElement("iframe"));

    let currentLi;
    function run(li) {
        currentLi = li;
        iframe.src = li.textContent;
    }

    if (tests.length > 0) {
        run(tests.shift());
    }

    return {
        ready(e, data) {
            console.log(">>> Running tests");
            currentLi.innerHTML = `<a href="${data.url.href}">${data.title}</a>`;
            postMessage(e.source, "run");
        },

        started(e, data) {
            currentLi.innerHTML += ` 🌀 ${data.title ?? data.i}`;
        },

        success(e, data) {
            if (/🌀/.test(currentLi.innerHTML)) {
                currentLi.innerHTML = currentLi.innerHTML.replace(/🌀/, "✅");
            } else {
                currentLi.innerHTML += ` ✅ ${data.title ?? data.i}`;
            }
            this.successes += 1;
            console.log(`+++ Success, #successes: ${this.successes}`);
            postMessage(e.source, "run");
        },

        failure(e, data) {
            if (/🌀/.test(currentLi.innerHTML)) {
                currentLi.innerHTML = currentLi.innerHTML.replace(/🌀/, "❌");
            } else {
                currentLi.innerHTML += ` ❌ ${data.title ?? data.i}`;
            }
            this.failures += 1;
            console.log(`--- Failure: ${data.error}, #failures: ${this.failures}`);
            postMessage(e.source, "run");
        },

        timeout(e, data) {
            currentLi.innerHTML = currentLi.innerHTML.replace(/🌀/, "💤");
            this.timeouts += 1;
            console.log(`@@@ Timeout: ${data.error}, #timeouts: ${this.timeouts}`);
            postMessage(e.source, "run");
        },

        skipped(e, data) {
            currentLi.innerHTML += ` 💬 ${data.title ?? data.i}`;
            this.skips += 1;
            console.log(`... Skipped, #skips: ${this.skips}`);
            postMessage(e.source, "run");
        },

        done(e) {
            console.log(`<<< Done, #successes: ${this.successes}, #failures: ${this.failures}, #timeouts: ${this.timeouts}, #skips: ${this.skips}`);
            if (tests.length > 0) {
                run(tests.shift());
            }
        },

        successes: 0,
        failures: 0,
        timeouts: 0,
        skips: 0
    };

}

function initTest() {
    if (window.parent !== window) {
        console.log(`!!! New tests: ${document.title} (${window.location})`, testCases);
        postMessage(window.parent, "ready", {
            title: document.title,
            url: window.location
        });
    }

    return {
        async run(e, data) {
            if (this.tests.length > 0) {
                const [title, test] = this.tests.shift();
                const i = this.testCount - this.tests.length;
                const data = { title, i };
                console.log(`... Running test #${i}${title ? (": \"" + title + "\"") : ""}`);
                const testCase = TestCase.create({ for: title });
                try {
                    if (!test) {
                        postMessage(e.source, "skipped", data);
                    } else {
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
                    postMessage(
                        e.source,
                        error.timeout ? "timeout" : "failure",
                        Object.assign(data, { error: error.message })
                    );
                }
            } else {
                postMessage(e.source, "done");
            }
        },

        tests: testCases,
        testCount: testCases.length
    };
}

const testCases = [];

export function test(title, f) {
    if (!f) {
        f = title;
        title = "";
    }
    testCases.push([title, f]);
}

export function skip(title) {
    testCases.push([title]);
}

(function () {
    const tests = [...document.querySelectorAll("ul.tests")].flatMap(
        ul => [...ul.querySelectorAll("li")]
    );
    const handler = tests.length > 0 ? initFrame(tests) : initTest(testCases);
    window.addEventListener("message", e => {
        const data = JSON.parse(e.data);
        handler[data.type](e, data);
    });
})();
