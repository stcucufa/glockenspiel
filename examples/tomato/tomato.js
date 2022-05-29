import { assoc, imagePromise, mod, range } from "../../lib/util.js";
import { Clock } from "../../lib/clock.js";

play(Promise.all(
    range(1, 18).map(i => imagePromise(`img/tomato${i.toString().padStart(2, "0")}.png`))
));

async function play(imagesPromise) {

    const canvas = document.querySelector("canvas");
    const context = canvas.getContext("2d");
    const clock = Clock.create();
    const fps = 9;

    let loop = "idle";
    let nextLoop = [];
    let loopOffset = 0;

    const images = await imagesPromise;
    const loops = {
        idle: images.slice(0, 4),
        blink: images.slice(5, 9),
        speak: images.slice(9),
    };

    function draw(image) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);
    }

    draw(images[0]);

    clock.scheduler.every(frame => {
        const i = mod(frame - loopOffset, loops[loop].length);
        if (nextLoop.length > 0 || loop !== "idle") {
            if (i === 0) {
                loop = nextLoop.shift() ?? "idle";
                loopOffset = frame;
            }
        }
        draw(loops[loop][i]);
    }, [fps, 1000]);

    const buttons = assoc(
        document.querySelectorAll("button"),
        button => {
            button.addEventListener("click", () => { pushed(button.name, button); });
            return [button.name, button];
        }
    );

    function pushed(name, button) {
        ({
            pause: () => {
                clock.stop();
                nextLoop = [];
                button.hidden = true;
                buttons.get("play").hidden = false;
            },
            play: () => {
                clock.start();
                button.hidden = true;
                buttons.get("pause").hidden = false;
            },
            blink: () => { nextLoop.push("blink"); },
            speak: () => { nextLoop.push("speak"); },
        })[name]();
    }

}
