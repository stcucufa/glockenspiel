import { isEmpty, isObject } from "./util.js";

export const show = (x, shown) => Array.isArray(x) ? showArray(x, shown ?? new Set()) :
    x instanceof Map ? showMap(x, shown ?? new Set()) :
    x instanceof Set ? showSet(x, shown ?? new Set()) :
    isObject(x) ? showObject(x, shown ?? new Set()) :
    typeof x === "string" ? showString(x) :
    x === null ? "null" :
    x === void x ? "undefined" : x.toString();

const quoted = {
    "\n": "n",
    "\t": "t",
    "\\": "\\",
    "\"": "\"",
};

function showOnce(x, shown, f) {
    if (shown.has(x)) {
        return "...";
    }
    shown.add(x);
    return f();
}

const showArray = (xs, shown) => showOnce(xs, shown, () => `[${xs.map(x => show(x, shown)).join(", ")}]`);

const showMap = (m, shown) => showOnce(m, shown, () => `Map {${isEmpty(m) ? "" : ` ${[...m.entries()].map(
    kv => kv.map(x => show(x, shown)).join(" => ")
).join(", ")} `}}`);

const showObject = (h, shown) => showOnce(h, shown, () => `{${isEmpty(h) ? "" : ` ${Object.entries(h).map(
    ([k, v]) => [k, show(v, shown)].join(": ")
).join(", ")} `}}`);

const showSet = (s, shown) => showOnce(s, shown, () => `Set {${isEmpty(s) ? "" : ` ${[...s.values()].map(
    v => show(v, shown)
).join(", ")} `}}`);

const showString = s => `"${quote(s)}"`;

const quote = s => s.replace(/["\\\n\t]/g, c => `\\${quoted[c]}`);
