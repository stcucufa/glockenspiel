import { create, range } from "../../lib/util.js";
import { Palette, hexToString } from "../../lib/color.js";
import { RNG } from "../../lib/random.js";
import { Clock } from "../../lib/clock.js";
import { on } from "../../lib/events.js";

const palette = Palette.Pico8.map(hexToString);
const rng = RNG.create(parseInt(new URLSearchParams(window.location.search).get("seed")));

const Stars = {
    create: create({
        count: 700,
        palette: range(3, 7).map(i => palette[i]),
        rng
    }),

    init() {
        this.dots = range(1, this.count).map(() => ({
            x: this.rng.randomNumber(-1, 1),
            y: this.rng.randomNumber(-1, 1),
            r: this.rng.randomNumber(0.002, 0.0075),
            color: this.rng.randomInt(this.palette.length)
        }));
    },

    draw(context) {
        context.save();
        for (const dot of this.dots) {
            context.beginPath();
            context.fillStyle = this.palette[dot.color];
            context.arc(dot.x, dot.y, dot.r, 0, 2 * Math.PI);
            context.fill();
        }
        context.restore();
    }
};

const Ship = {
    create: create({
        shape: [[-0.75, -0.625], [-0.5, 0], [-0.75, 0.625], [0.75, 0]],
        palette: range(11, 8, -1).map(i => palette[i])
    }),

    init() {
        this.color = 0;
        this.x = 0;
        this.y = 0;
        this.r = 0.05;
        this.heading = 0;
    },

    draw(context) {
        context.save();
        context.beginPath();
        context.strokeStyle = this.palette[this.color];
        context.rotate(this.heading);
        context.moveTo(this.shape[0][0] * this.r, this.shape[0][1] * this.r);
        for (let i = 1; i < this.shape.length; ++i) {
            context.lineTo(this.shape[i][0] * this.r, this.shape[i][1] * this.r);
        }
        context.closePath();
        context.stroke();
        context.restore();
    }
};

const canvas = document.querySelector("canvas");
const stars = Stars.create();
const ship = Ship.create();

function draw() {
    const width = canvas.clientWidth * devicePixelRatio;
    const height = canvas.clientHeight * devicePixelRatio;
    canvas.width = width;
    canvas.height = height;

    console.assert(width === height, { width, height, message: "canvas should be square" });

    const context = canvas.getContext("2d");
    const r = width / 2;

    context.save();
    if (!clock.running) {
        context.globalAlpha = 0.5;
    }
    context.translate(r, r);
    context.lineJoin = "round";
    context.lineWidth = 8 / r;
    context.scale(r, r);
    stars.draw(context);
    ship.draw(context)
    context.restore();
}

const clock = Clock.create();
clock.start();

const KnownKeys = new Set(["p", "ArrowLeft", "ArrowRight"]);

let keys = {};
window.addEventListener("keydown", event => {
    if (KnownKeys.has(event.key)) {
        keys[event.key] = [clock.now];
    }
});

window.addEventListener("keyup", event => {
    if (event.key === "p" && !clock.running) {
        clock.start();
        delete keys.p;
    }
    keys[event.key]?.push(clock.now);
});

clock.scheduler.every(t => {
    if (keys.p && keys.p.length === 2) {
        clock.stop();
        keys = {};
    }

    if (keys.ArrowLeft) {
        if (keys.ArrowLeft[0] < t) {
            ship.heading -= 0.1;
            keys.ArrowLeft[0] += 50;
        }
        if (keys.ArrowLeft.length === 2) {
            delete keys.ArrowLeft;
        }
    }

    if (keys.ArrowRight) {
        if (keys.ArrowRight[0] < t) {
            ship.heading += 0.1;
            keys.ArrowRight[0] += 50;
        }
        if (keys.ArrowRight.length === 2) {
            delete keys.ArrowRight;
        }
    }
}, 10);

on(clock, "update", draw);
