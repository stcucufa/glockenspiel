import { create } from "./util.js";
import { notify } from "./events.js";

const FfwdSteps = 8;

const setRateFromState = (exponent, sign = 1) => function() {
    notify(this, "setRate", { rate: sign * (2 ** exponent) })
};

const step = amount => function() {
    notify(this, "advance", { amount });
};

const stop = ["stopped", function() {
    notify(this, "stop");
}];
const play = ["forward_0", setRateFromState(0)];
const pause = ["paused", function() {
    notify(this, "pause");
}];

const States = {
    stopped: {
        play: ["forward_0", function() {
            notify(this, "start");
        }],
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: ["rewind_0", setRateFromState(0, -1)]
    },

    paused: {
        stop,
        play,
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: ["rewind_0", setRateFromState(0, -1)],
        step: ["paused", step(1)]
    },

    desuap: {
        stop,
        play,
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: ["rewind_0", setRateFromState(0, -1)],
        step: ["desuap", step(-1)]
    },

    forward_0: {
        stop,
        pause,
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: ["rewind_0", setRateFromState(0, -1)],
        step: ["forward_0", step(-1)]
    },

    rewind_0: {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play: ["forward_0", setRateFromState(0)],
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: ["rewind_1", setRateFromState(1, -1)],
        step: ["rewind_0", step(-1)]
    },

};

for (let i = 1; i < FfwdSteps; ++i) {
    const f = `forward_${i}`;
    const r = `rewind_${i}`;
    const exponent = Math.max(1, (i + 1) % FfwdSteps);
    const amount = 2 ** i;
    States[f] = {
        stop,
        pause,
        play,
        step: [f, step(amount)],
        fastForward: [`forward_${exponent}`, setRateFromState(exponent)],
        rewind: ["rewind_0", setRateFromState(0, -1)]
    };
    States[r] = {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play,
        step: [r, step(-amount)],
        fastForward: ["forward_1", setRateFromState(1)],
        rewind: [`rewind_${exponent}`, setRateFromState(exponent, -1)]
    };
}

export const Transport = {

    // Create a new transport
    create: create(),
    init() {
        this.state = States.stopped;
    },

    setState(q) {
        if (!q) {
            return;
        }

        const [nextState, f] = q;
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
