import { create, isAsync } from "../lib/util.js";
import { show } from "../lib/show.js";

const TestTimeoutMS = 3000;

let successes = 0;
let failures = 0;
let timeouts = 0;
const tests = [];

export function test(title, f) {
    if (!f) {
        f = title;
        title = "";
    }

    if (tests.length === 0) {
        setTimeout(run);
    }

    tests.push([title, f]);
}

const message = (msg, context) => () => (context ? `${context}: ` : "") + msg;

const Test = {
    create: create(),

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
    }
};

async function run() {
    for (const [title, test] of tests) {
        try {
            const t = Test.create({ for: title });
            if (isAsync(test)) {
                await test(t);
            } else {
                const promise = test(t);
                if (typeof promise?.then === "function") {
                    await Promise.race([
                        promise,
                        new Promise((_, reject) => {
                            window.setTimeout(() => {
                                reject({ message: "Timeout", timeout: true });
                            }, TestTimeoutMS);
                        })
                    ]);
                }
            }
            if (t.failures.length > 0) {
                for (const failure of t.failures) {
                    console.log(`Failure: "${title}" (${failure})`);
                }
                failures += 1;
            } else {
                console.log(`Success: "${title}"`);
                successes += 1;
            }
        } catch (error) {
            if (error.timeout) {
                console.error(`Timeout: "${title}"`);
                timeouts += 1;
            } else {
                console.error(`Failure: "${title}"`, error);
                failures += 1;
            }
        }
    }

    console.info(`Successes: ${successes}, failures: ${failures}, timeouts: ${timeouts}`);
}
