import { create, mod, range } from "../../lib/util.js";
import { Palette, hexToString } from "../../lib/color.js";
import { RNG } from "../../lib/random.js";
import { Clock } from "../../lib/clock.js";
import { on } from "../../lib/events.js";
import { Keys, key } from "../../lib/keys.js";

const palette = Palette.Pico8.map(hexToString);
const rng = RNG.create(parseInt(new URLSearchParams(window.location.search).get("seed")));

const wrap = x => mod(x + 1, 2) - 1;

const Stars = {
    create: create({
        count: 700,
        palette: range(3, 7).map(i => palette[i])
    }),

    init() {
        this.dots = range(1, this.count).map(() => ({
            x: rng.randomNumber(-1, 1),
            y: rng.randomNumber(-1, 1),
            r: rng.randomNumber(0.002, 0.0075),
            color: rng.randomInt(this.palette.length)
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

const Asteroid = {
    create: create({
        color: palette[4],
    }),

    init() {
        this.shape = range(1, this.sectors).map(i => {
            const a = i * 2 * Math.PI / this.sectors;
            const d = rng.randomNumber(0.75, 1.25);
            return [Math.cos(a) * d, Math.sin(a) * d]
        });
        this.th = rng.randomNumber(0, 2 * Math.PI);
        this.heading = rng.randomNumber(0, 2 * Math.PI);
        this.vth = rng.randomNumber(0.005, 0.015);
        this.v = rng.randomNumber(0.001, 0.005);
        const d = rng.randomNumber(0.5, 1);
        this.x = wrap(d * Math.cos(this.heading));
        this.y = wrap(d * Math.sin(this.heading));
    },

    large() {
        return this.create({ r: 0.1, sectors: 19 });
    },

    medium() {
        return this.create({ r: 0.075, sectors: 12 });
    },

    small() {
        return this.create({ r: 0.05, sectors: 7 });
    },

    update() {
        this.th += this.vth;
        move.call(this);
    }
};

const Ship = {
    create: create({
        shape: [[-0.75, -0.625], [-0.5, 0], [-0.75, 0.625], [0.75, 0]],
        x: 0,
        y: 0,
        r: 0.05,
        th: 0
    }),

    init() {
        this.palette =  range(11, 8, -1).map(i => palette[i])
        this.color = this.palette[0];
    },

    update() {
        if (key("ArrowLeft")) {
            this.th -= 0.025;
        }
        if (key("ArrowRight")) {
            this.th += 0.025;
        }
        this.heading = this.th;
        this.v = key("ArrowUp") ? 0.01 : 0;
        move.call(this);
    }
};

const canvas = document.querySelector("canvas");
const stars = Stars.create();
const ship = Ship.create();
const asteroids = range(1, 4).map(() => Asteroid.large());

function move() {
    this.x = wrap(this.x + this.v * Math.cos(this.heading));
    this.y = wrap(this.y + this.v * Math.sin(this.heading));
}

function drawShapeInContext(context) {
    context.save();
    context.beginPath();
    context.strokeStyle = this.color;
    context.translate(this.x, this.y);
    context.rotate(this.th);
    context.moveTo(this.shape[0][0] * this.r, this.shape[0][1] * this.r);
    for (let i = 1; i < this.shape.length; ++i) {
        context.lineTo(this.shape[i][0] * this.r, this.shape[i][1] * this.r);
    }
    context.closePath();
    context.stroke();
    context.restore();
}

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
    drawShapeInContext.call(ship, context);
    for (const asteroid of asteroids) {
        drawShapeInContext.call(asteroid, context);
    }
    context.restore();
}

const clock = Clock.create();
clock.start();

on(Keys, "keypress", ({ key }) => {
    if (key === "p") {
        if (clock.running) {
            clock.stop();
        } else {
            clock.start();
        }
    }
});

clock.scheduler.every(t => {
    for (const asteroid of asteroids) {
        asteroid.update(t);
    }
    ship.update(t);
}, 10);

on(clock, "update", draw);
