import { Scheduler } from "../lib/scheduler.js";

const scheduler = Scheduler.create();
const happeningAt = t => scheduler.at(scheduler => {
    console.assert(
        scheduler.now === t,
        `Happening at time ${scheduler.now} vs. expected ${t}`
    );
    console.log(`Happening at time ${scheduler.now}`);
}, t);

const step = (d, t) => {
    scheduler.tick(d);
    console.assert(
        scheduler.now === t,
        `Stepped by ${d}, at time ${scheduler.now} vs. expected ${t}`
    );
    console.log(`Now: ${scheduler.now}`);
};

happeningAt(0);
happeningAt(43);
happeningAt(17);

step(19, 19);
step(19, 38);
step(19, 57);
step(-19, 38);
step(-19, 19);
step(-19, 0);
