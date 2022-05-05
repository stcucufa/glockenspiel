import { Clock } from "./clock.js";

const canvas = document.querySelector("canvas");
const W = canvas.clientWidth;
const H = canvas.clientHeight;
const r = 0.75;
const R = r * Math.min(W, H) / 2;

canvas.width = W * devicePixelRatio;
canvas.height = H * devicePixelRatio;

const context = canvas.getContext("2d");

const date = new Date();
const offset = date.valueOf() - date.getTimezoneOffset() * 60000;
let hours = 0;
let minutes = 0;
let seconds = 0;

const clock = Clock.create({ ontick: draw });

const rateRange = document.querySelector("input[name=rate]");
const rateSpan = document.querySelector("label[for=rate] > span");
const rateValue = () => {
    let rate = Math.round(parseFloat(rateRange.value));
    rateSpan.textContent = rate.toString();
    return rate;
};

rateRange.addEventListener("input", () => { clock.rate = rateValue(); });
clock.rate = rateValue();

clock.every(t => {
    const now = (t + offset) / 1000;
    seconds = now % 60;
    minutes = (now / 60) % 60;
    hours = (now / 3600) % 12;
}, 1000);
clock.start();

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


