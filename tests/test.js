import { isAsync } from "../lib/util.js";

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

async function run() {
    for (const [title, test] of tests) {
        try {
            if (isAsync(test)) {
                await test();
            } else {
                const promise = test();
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
            console.log(`Success: "${title}"`);
            successes += 1;
        } catch (error) {
            if (error.timeout) {
                console.log(`Timeout: "${title}"`);
                timeouts += 1;
            } else {
                console.log(`Failure: "${title}"`, error);
                failures += 1;
            }
        }
    }

    console.info(`Successes: ${successes}, failures: ${failures}, timeouts: ${timeouts}`);
}
