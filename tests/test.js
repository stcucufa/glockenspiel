import { create, isAsync } from "../lib/util.js";

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

const Test = {
    create: create({
        failures: []
    }),

    expect(p, message) {
        if (!p) {
            this.failures.push(message);
        }
    },

    above(value, expected) {
        this.expect(
            value > expected,
            `expected ${value} to be above (>) ${expected}`
        );
    },

    atLeast(value, expected) {
        this.expect(
            value >= expected,
            `expected ${value} to be at least (>=) ${expected}`
        );
    },

    equal(value, expected) {
        this.expect(
            value === expected,
            `expected ${value} to be equal to (===) ${expected}`
        );
    }
};

async function run() {
    for (const [title, test] of tests) {
        try {
            const t = Test.create();
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
