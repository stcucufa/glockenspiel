import { isObject } from "./util.js";

export const show = x => Array.isArray(x) ? showArray(x) :
    x instanceof Map ? showMap(x) :
    isObject(x) ? showObject(x) :
    typeof x === "symbol" ? x.toString() :
    typeof x === "string" ? showString(x) : x;

const quoted = {
    "\n": "n",
    "\t": "t",
    "\\": "\\",
    "\"": "\"",
};

const quote = s => s.replace(/["\\\n\t]/g, c => `\\${quoted[c]}`);

const showArray = xs => `[${xs.map(show).join(", ")}]`;

const showMap = m => `Map {${[...m.entries()].map(kv => kv.map(show).join(" => ")).join(", ")}}`;

// TODO Handle more special objects like Error
const showObject = h => `{${Object.entries(h).map(([k, v]) => [k, show(v)].join(": ")).join(", ")}}`;

const showString = s => `"${quote(s)}"`;
