import { Clock } from "./clock.js";

const clock = Clock.create();
const happeningAt = t => clock.at(clock => {
    console.assert(
        clock.now === t,
        `Happening at time ${clock.now} vs. expected ${t}`
    );
    console.log(`Happening at time ${clock.now}`);
}, t);

const step = (d, t) => {
    clock.tick(d);
    console.assert(
        clock.now === t,
        `Stepped by ${d}, at time ${clock.now} vs. expected ${t}`
    );
    console.log(`Now: ${clock.now}`);
};

happeningAt(0);
happeningAt(23);
happeningAt(17);
clock.at(clock => {
    console.assert(
        clock.now === 30,
        `Happening at time ${clock.now} vs. expected 30`
    );
    console.log(`Happening at time ${clock.now} -> also at 7, 30 (past), 31 (near future) and 51 (future)`);
    happeningAt(7);
    happeningAt(31);
    happeningAt(51);
}, 30);

step(19, 19);
step(13, 32);
step(11, 43);
step(17, 60);
