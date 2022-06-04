import { clamp, create, mod, range, remove } from "../../lib/util.js";
import { Palette, hexToString } from "../../lib/color.js";
import { RNG } from "../../lib/random.js";
import { Clock } from "../../lib/clock.js";
import { on } from "../../lib/events.js";
import { Keys, key } from "../../lib/keys.js";

const palette = Palette.Pico8.map(hexToString);
const rng = RNG.create(parseInt(new URLSearchParams(window.location.search).get("seed")));

let Debug = false;
const DebugColor = palette[23];
const CollidedColor = palette[25];

const distance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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

const Bullet = {
    create: create({
        r: 0.005,
        v: 0.02,
        color: palette[7]
    }),

    update() {
        move.call(this);
    }

};

const Ship = {
    create: create({
        shape: [[-0.75, -0.625], [-0.5, 0], [-0.75, 0.625], [0.75, 0]],
        x: 0,
        y: 0,
        r: 0.05,
        a: 0,
        v: 0,
        th: 0
    }),

    init() {
        this.bullets = [];
        this.palette =  range(11, 8, -1).map(i => palette[i])
        this.color = this.palette[0];
        this.collidedColor = palette[24];
    },

    update(t) {
        if (key("ArrowLeft")) {
            this.th -= 0.025;
        }
        if (key("ArrowRight")) {
            this.th += 0.025;
        }
        this.a = key("ArrowUp") ? 0.001 : 0;

        this.heading = this.th;
        this.v = clamp(this.v + this.a - 0.00015, 0, 0.015);

        this.collided = false;
        move.call(this);

        if (key("z") && !this.justFired) {
            const bullet = Bullet.create({
                heading: this.heading,
                x: this.x + this.r * Math.cos(this.heading),
                y: this.y + this.r * Math.sin(this.heading)
            });
            this.bullets.push(bullet);
            this.justFired = true;
            clock.scheduler.at(t => { delete this.justFired; }, t + 150);
            clock.scheduler.at(() => { const b = remove(bullet, this.bullets); }, t + 1000);
        }
    },
};

const canvas = document.querySelector("canvas");
const stars = Stars.create();
const ship = Ship.create();
const asteroids = range(1, 4).map(() => Asteroid.large());

function move() {
    this.x = wrap(this.x + this.v * Math.cos(this.heading));
    this.y = wrap(this.y + this.v * Math.sin(this.heading));
}

function collide(a, bs, grace = 1) {
    const r = a.r * grace;
    a.collided = bs.some(b => distance(a.x, a.y, b.x, b.y) < r + b.r);
}

function drawShapeInContext(context) {
    context.save();
    context.beginPath();
    context.translate(this.x, this.y);
    if (this.shape) {
        context.strokeStyle = this.color;
        context.rotate(this.th);
        context.moveTo(this.shape[0][0] * this.r, this.shape[0][1] * this.r);
        for (let i = 1; i < this.shape.length; ++i) {
            context.lineTo(this.shape[i][0] * this.r, this.shape[i][1] * this.r);
        }
        context.closePath();
        context.stroke();
    } else {
        context.fillStyle = this.color;
        context.arc(0, 0, this.r, 0, 2 * Math.PI);
        context.fill();
    }
    context.restore();

    if (Debug) {
        context.save();
        context.lineWidth /= 2;
        context.strokeStyle = this.collided ? CollidedColor : DebugColor;
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        context.stroke();
        context.restore();
    }
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
    for (const bullet of ship.bullets) {
        drawShapeInContext.call(bullet, context);
    }
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
        delete Keys.p;
    }

    if (key === "d") {
        Debug = !Debug;
        delete Keys.d;
    }
});

clock.scheduler.every(t => {
    for (const asteroid of asteroids) {
        asteroid.update(t);
    }
    ship.update(t);
    for (const bullet of ship.bullets) {
        bullet.update(t);
    }
    collide(ship, asteroids, 0.5);
}, 10);

on(clock, "update", draw);
