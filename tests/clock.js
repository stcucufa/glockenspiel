import { Clock } from "../lib/clock.js";

const clock = Clock.create();
console.assert(clock.state === Clock.States.Stopped);

const happeningAt = t => clock.scheduler.at((now, [from, to]) => {
    console.assert(
        now === t,
        `Happening at time ${now} vs. expected ${t}`
    );
    console.log(`Happening at time ${now} in ]${from}, ${to}] (clock time: ${clock.now})`);
}, t);

happeningAt(0);
happeningAt(43);
happeningAt(17);
happeningAt(19);
happeningAt(57);

clock.scheduler.at((now, [from, to]) => {
    console.log(`Happening repeatedly at time ${now} in ]${from}, ${to}] (clock time: ${clock.now})`);
}, 0, 50);

clock.start();
console.assert(clock.state === Clock.States.Running);
console.assert(clock.now >= 0);
console.log(`Starting at ${clock.now} (${clock.referenceTime})`);

setTimeout(() => {
    clock.setRate(0);
    console.log(`Pausing at ${clock.now} (${clock.referenceTime})`);
    console.assert(clock.state === Clock.States.Paused);
}, 100);
setTimeout(() => {
    clock.setRate(-0.5);
    console.log(`Going back at ${clock.now} (${clock.referenceTime})`);
    console.assert(clock.state === Clock.States.Running);
}, 300);
setTimeout(() => {
    clock.stop();
    console.log(`Stopped at ${clock.now}`);
    console.assert(clock.state === Clock.States.Stopped);
}, 500);
