import { Clock } from "../lib/clock.js";

const clock = Clock.create();

const happeningAt = t => clock.scheduler.at(now => {
    console.assert(
        now === t,
        `Happening at time ${now} vs. expected ${t}`
    );
    console.log(`Happening at time ${now}`);
}, t);

happeningAt(0);
happeningAt(43);
happeningAt(17);
happeningAt(57);

clock.start();
console.assert(clock.state === Clock.States.Running);
setTimeout(() => {
    clock.stop();
    console.assert(clock.state === Clock.States.Stopped);
}, 100)
