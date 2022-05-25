import { create } from "./util.js";
import { notify } from "./events.js";

const Rates = 8;

const setRate = rate => function() {
    notify(this, "setRate", { rate });
};

const step = amount => function() {
    notify(this, "advance", { amount });
};

const stop = ["stopped", function() {
    notify(this, "stop");
}];
const play = ["forward_0", setRate(1)];
const pause = ["paused", function() {
    notify(this, "pause");
}];

const States = {
    stopped_0: {
        play: ["forward_0", function() {
            notify(this, "setRate", { rate: 1 });
            notify(this, "start");
        }],
        fastForward: ["forward_1", function() {
            notify(this, "setRate", { rate: 2 });
            notify(this, "start");
        }],
        rewind: ["rewind_0", function() {
            notify(this, "setRate", { rate: -1 });
            notify(this, "start");
        }]
    },

    stopped: {
        stop: ["stopped_0", function() {
            notify(this, "reset");
        }],
        play: ["forward_0", function() {
            notify(this, "setRate", { rate: 1 });
            notify(this, "start");
        }],
        fastForward: ["forward_1", function() {
            notify(this, "setRate", { rate: 2 });
            notify(this, "start");
        }],
        rewind: ["rewind_0", function() {
            notify(this, "setRate", { rate: -1 });
            notify(this, "start");
        }]
    },

    paused: {
        stop,
        play,
        fastForward: ["forward_1", setRate(2)],
        rewind: ["rewind_0", setRate(-1)],
        step: ["paused", step(1)]
    },

    desuap: {
        stop,
        play,
        fastForward: ["forward_1", setRate(2)],
        rewind: ["rewind_0", setRate(-1)],
        step: ["desuap", step(-1)]
    },

    forward_0: {
        stop,
        pause,
        fastForward: ["forward_1", setRate(2)],
        rewind: ["rewind_0", setRate(-1)],
        step: ["forward_0", step(1)]
    },

    rewind_0: {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play: ["forward_0", setRate(1)],
        fastForward: ["forward_1", setRate(2)],
        rewind: ["rewind_1", setRate(-2)],
        step: ["rewind_0", step(-1)]
    },

};

for (let i = 1; i < Rates; ++i) {
    const f = `forward_${i}`;
    const r = `rewind_${i}`;
    const exponent = Math.max(1, (i + 1) % Rates);
    const amount = 2 ** i;
    States[f] = {
        stop,
        pause,
        play,
        step: [f, step(amount)],
        fastForward: [`forward_${exponent}`, setRate(2 ** exponent)],
        rewind: ["rewind_0", setRate(-1)]
    };
    States[r] = {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play,
        step: [r, step(-amount)],
        fastForward: ["forward_1", setRate(2)],
        rewind: [`rewind_${exponent}`, setRate((-2) ** exponent)]
    };
}

export const Transport = {

    // Create a new transport
    create: create(),
    init() {
        this.state = States.stopped_0;
    },

    setState(q) {
        if (!q) {
            return;
        }

        const [nextState, f] = q;
        console.log(`>>> Next state: ${nextState}`);
        this.state = States[nextState];
        f.call(this);
    },

    States
};

for (const action of ["fastForward", "pause", "play", "rewind", "step", "stop"]) {
    Transport[action] = function() {
        this.setState(this.state[action]);
    }
};
