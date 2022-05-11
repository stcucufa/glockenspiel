import { assoc } from "../lib/util.js";
import { Clock } from "../lib/clock.js";

const canvas = document.querySelector("canvas");
const W = canvas.clientWidth;
const H = canvas.clientHeight;
const r = 0.75;
const R = r * Math.min(W, H) / 2;

canvas.width = W * devicePixelRatio;
canvas.height = H * devicePixelRatio;

const context = canvas.getContext("2d");

let offset = 0;
let hours = 0;
let minutes = 0;
let seconds = 0;

const clock = Clock.create({ onupdate });

const buttons = assoc(
    document.querySelectorAll("ul.buttons button"),
    button => {
        button.addEventListener("click", () => {
            setState(states[state][button.name]);
        });
        return [button.name, button];
    }
);

function coldStart() {
    const date = new Date();
    offset = date.valueOf() - date.getTimezoneOffset() * 60000;
    clock.setRate(1);
    clock.start();
}

function setRateFromState() {
    const [dir, rate] = state.split("_");
    clock.setRate(2 ** parseInt(rate, 10) * (dir === "forward" ? 1 : -1));
    console.log(`Set clock rate: ${clock.rate}`);
}

const stop = ["stopped", () => { clock.stop(); }];
const play = ["forward_0", setRateFromState];
const pause = ["paused", () => { clock.pause(); }];

const states = {
    stopped: {
        play: ["forward_0", coldStart],
        ffwd: ["forward_1", () => {
            coldStart();
            setRateFromState();
        }],
        rwd: ["rewind_0", () => {
            coldStart();
            setRateFromState();
        }],
    },

    paused: {
        stop,
        play,
        ffwd: ["forward_1", setRateFromState],
        rwd: ["rewind_0", setRateFromState],
        step: ["paused", () => { clock.step(1000); }]
    },

    desuap: {
        stop,
        play,
        ffwd: ["forward_1", setRateFromState],
        rwd: ["rewind_0", setRateFromState],
        step: ["desuap", () => { clock.step(-1000); }]
    },

    forward_0: {
        stop,
        pause,
        ffwd: ["forward_1", setRateFromState],
        rwd: ["rewind_0", setRateFromState]
    },

    rewind_0: {
        stop,
        pause: ["desuap", () => { clock.pause(); }],
        play: ["forward_0", setRateFromState],
        ffwd: ["forward_1", setRateFromState],
        rwd: ["rewind_1", setRateFromState]
    },
};

const FfwdSteps = 8;
for (let i = 1; i < FfwdSteps; ++i) {
    states[`forward_${i}`] = {
        stop,
        pause,
        play,
        ffwd: [`forward_${Math.max(1, (i + 1) % FfwdSteps)}`, setRateFromState],
        rwd: ["rewind_0", setRateFromState]
    };
    states[`rewind_${i}`] = {
        stop,
        pause: ["desuap", () => { clock.pause(); }],
        play,
        ffwd: ["forward_1", setRateFromState],
        rwd: [`rewind_${(i + 1) % FfwdSteps}`, setRateFromState]
    };
}

function setState(q) {
    if (!q) {
        return;
    }

    const [nextState, f] = q;
    state = nextState;
    f();
    for (const [name, button] of buttons.entries()) {
        button.disabled = !(name in states[state]);
    }
}

clock.scheduler.at(t => {
    const now = Math.round((t + offset) / 1000);
    seconds = now % 60;
    minutes = (now / 60) % 60;
    hours = (now / 3600) % 12;
}, 0, 1000);

let state = "stopped";
setState(states[state].play);

function onupdate() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(devicePixelRatio, devicePixelRatio);
    context.translate(W / 2, H / 2);
    context.globalAlpha = clock.rate === 0 ? 0.5 : 1;

    const h = (hours - 3) / 6 * Math.PI;
    const m = (minutes - 15) / 30 * Math.PI;
    const s = (seconds - 15) / 30 * Math.PI;

    context.beginPath();
    context.strokeStyle = "#222";
    context.arc(0, 0, R, 0, 2 * Math.PI);
    for (let i = 0; i < 12; ++i) {
        const t = i / 6 * Math.PI;
        context.moveTo(R * 0.9 * Math.cos(t), R * 0.9 * Math.sin(t));
        context.lineTo(R * Math.cos(t), R * Math.sin(t));
    }
    for (let i = 0; i < 60; ++i) {
        if (i % 5 === 0) {
            continue;
        }
        const t = i / 30 * Math.PI;
        context.moveTo(R * 0.95 * Math.cos(t), R * 0.95 * Math.sin(t));
        context.lineTo(R * Math.cos(t), R * Math.sin(t));
    }

    context.moveTo(0, 0);
    context.lineTo(R * 0.5 * Math.cos(h), R * 0.5 * Math.sin(h));
    context.moveTo(0, 0);
    context.lineTo(R * 0.8 * Math.cos(m), R * 0.8 * Math.sin(m));
    context.stroke();

    context.beginPath();
    context.strokeStyle = "#ff4040";
    context.moveTo(0, 0);
    context.lineTo(R * Math.cos(s), R * Math.sin(s));
    context.stroke();

    context.restore();
}
