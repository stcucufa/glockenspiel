import { Clock } from "./clock.js";

function assoc(xs, f) {
    let m = new Map();
    for (let i = 0, n = xs.length; i < n; ++i) {
        m.set(...f(xs[i], i));
    }
    return m;
}

function dateWithTimezoneOffset() {
    const date = new Date();
    return date.valueOf() - date.getTimezoneOffset() * 60000;
}

const canvas = document.querySelector("canvas");
const W = canvas.clientWidth;
const H = canvas.clientHeight;
const r = 0.75;
const R = r * Math.min(W, H) / 2;

canvas.width = W * devicePixelRatio;
canvas.height = H * devicePixelRatio;

const context = canvas.getContext("2d");

let offset = dateWithTimezoneOffset();
let hours = 0;
let minutes = 0;
let seconds = 0;

const clock = Clock.create({ ontick: draw });
const buttons = assoc(
    document.querySelectorAll("ul.buttons button"),
    button => [button.name, button]
);

let rateExponent = 0;
const MaxRateExponent = 8;

for (let [name, f] of Object.entries({
    play: () => {
        if (clock.rate === 0 && !isNaN(clock.now)) {
            clock.resume(1);
        } else if (isNaN(clock.now)) {
            offset = dateWithTimezoneOffset();
            clock.start();
        }
        clock.rate = 1;
        rateExponent = 0;
    },
    pause: () => {
        clock.rate = 0;
        rateExponent = 0;
    },
    stop: () => {
        clock.stop();
        rateExponent = 0;
    },
    ffwd: () => {
        if (clock.rate < 0) {
            rateExponent = 0;
        }
        rateExponent = (rateExponent + 1) % MaxRateExponent;
        clock.rate = 2 ** rateExponent;
    },
    rwd: () => {
        if (clock.rate > 0) {
            rateExponent = 0;
        }
        rateExponent = (rateExponent + 1) % MaxRateExponent;
        clock.rate = -(2 ** rateExponent);
    },

    step: () => { clock.step(1000); }
})) {
    buttons.get(name).addEventListener("click", () => {
        f();
        updateButtons();
    });
}

clock.every(t => {
    const now = (t + offset) / 1000;
    seconds = now % 60;
    minutes = (now / 60) % 60;
    hours = (now / 3600) % 12;
}, 1000);
clock.start();
updateButtons();

function updateButtons() {
    const isClockStopped = isNaN(clock.now);
    const isClockPaused = clock.rate === 0;
    buttons.get("play").disabled = !isClockStopped && !isClockPaused && clock.rate === 1;
    buttons.get("pause").disabled = isClockStopped || isClockPaused;
    buttons.get("stop").disabled = isClockStopped;
    buttons.get("ffwd").disabled = isClockStopped || isClockPaused;
    buttons.get("rwd").disabled = isClockStopped || isClockPaused;
    buttons.get("step").disabled = isClockStopped || !isClockPaused;
}

function draw() {
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


