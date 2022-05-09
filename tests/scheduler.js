import { Scheduler } from "../lib/scheduler.js";

const scheduler = Scheduler.create();
const happeningAt = t => scheduler.at(now => {
    console.assert(
        now === t,
        `Happening at time ${now} vs. expected ${t}`
    );
    console.log(`Happening at time ${now}`);
}, t);

let now = -1e-15;
const step = t => {
    scheduler.update(now, t);
    now = t;
    console.log(`Now: ${now}`);
};

happeningAt(0);
happeningAt(43);
happeningAt(17);
happeningAt(57);

step(19);
step(38);
step(57);
step(38);
step(19);
step(0);
