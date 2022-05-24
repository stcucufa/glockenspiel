import { create } from "./util.js";
import { notify } from "./events.js";

const FfwdSteps = 8;

function setRateFromState() {
    const [dir, exponent] = this.state.split("_");
    const rate = 2 ** parseInt(rate, 10) * (dir === "forward" ? 1 : -1);
    notify(this, "setRate", { rate });
}

const step = amount => function() {
    notify(this, "advance", { amount });
};

const stop = ["stopped", function() {
    notify(this, "stop");
}];
const play = ["forward_0", setRateFromState];
const pause = ["paused", function() {
    notify(this, "pause");
}];

const States = {
    stopped: {
        play: ["forward_0", function() {
            notify(this, "start");
        }],
        fastForward: ["forward_1", setRateFromState],
        rewind: ["rewind_0", setRateFromState]
    },

    paused: {
        stop,
        play,
        fastForward: ["forward_1", setRateFromState],
        rewind: ["rewind_0", setRateFromState],
        step: ["paused", step(1)]
    },

    desuap: {
        stop,
        play,
        fastForward: ["forward_1", setRateFromState],
        rewind: ["rewind_0", setRateFromState],
        step: ["desuap", step(-1)]
    },

    forward_0: {
        stop,
        pause,
        fastForward: ["forward_1", setRateFromState],
        rewind: ["rewind_0", setRateFromState],
        step: ["forward_0", step(-1)]
    },

    rewind_0: {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play: ["forward_0", setRateFromState],
        fastForward: ["forward_1", setRateFromState],
        rewind: ["rewind_1", setRateFromState],
        step: ["rewind_0", step(-1)]
    },

};

for (let i = 1; i < FfwdSteps; ++i) {
    const f = `forward_${i}`;
    const r = `rewind_${i}`;
    const amount = 2 ** i;
    States[f] = {
        stop,
        pause,
        play,
        step: [f, step(amount)],
        fastForward: [`forward_${Math.max(1, (i + 1) % FfwdSteps)}`, setRateFromState],
        rewind: ["rewind_0", setRateFromState]
    };
    States[r] = {
        stop,
        pause: ["desuap", function() {
            notify(this, "pause");
        }],
        play,
        step: [r, step(-amount)],
        fastForward: ["forward_1", setRateFromState],
        rewind: [`rewind_${(i + 1) % FfwdSteps}`, setRateFromState]
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
