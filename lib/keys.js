import { notify } from "./events.js";

export const Keys = {};

export const Down = Symbol("down");
export const Repeat = Symbol("repeat");
export const Up = Symbol("up");

window.addEventListener("keydown", event => {
    Keys[event.key] = {
        down: true,
        repeat: event.repeat
    };
});
window.addEventListener("keyup", event => {
    if (Keys[event.key]) {
        Keys[event.key].up = true;
        notify(Keys, "keypress", { key: event.key });
    }
});

export function key(k) {
    const state = Keys[k];
    if (state?.up) {
        delete Keys[k];
    }
    return state;
}
