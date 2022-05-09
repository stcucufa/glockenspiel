import { Clock } from "../lib/clock.js";

const clock = Clock.create();
console.assert(clock.state === Clock.States.Stopped);

const happeningAt = t => clock.scheduler.at(now => {
    console.assert(
        now === t,
        `Happening at time ${now} vs. expected ${t}`
    );
    console.log(`Happening at time ${now} (clock time: ${clock.now})`);
}, t);

happeningAt(0);
happeningAt(43);
happeningAt(17);
happeningAt(19);
happeningAt(57);

clock.start();
console.assert(clock.state === Clock.States.Running);
console.assert(clock.now >= 0);
setTimeout(() => {
    clock.stop();
    console.log(`Stopped at ${clock.now}`);
    console.assert(clock.state === Clock.States.Stopped);
}, 100)
