export const Palette = {
    Pico8: [
        0x000000, // black
        0x1d2b53, // dark blue
        0x7e2553, // maroon
        0x008751, // dark green
        0xab5236, // brown
        0x5f574f, // dark gray
        0xc2c3c7, // light gray
        0xfff1e8, // white
        0xff004d, // red
        0xffa300, // orange
        0xffec27, // yellow
        0x00e436, // green
        0x29adff, // blue
        0x83769c, // mauve
        0xff77a8, // pink
        0xffccaa, // flesh
        0x291814, // secret black
        0x111d35, // secret dark blue
        0x422136, // secret dark brown
        0x125359, // secret dark green
        0x742f29, // secret brown
        0x49333b, // secret dark gray
        0xa28879, // secret light gray
        0xf3ef7d, // secret yellow
        0xbe1250, // secret maroon
        0xff6c24, // secret orange
        0xa8e72e, // secret light green
        0x00b542, // secret green
        0x065ab5, // secret blue
        0x745665, // secret purple
        0xff6e59, // secret pink
        0xff9d81, // secret flesh
    ]
};

export const hexToRGB = x => [x >> 16, (x >> 8) & 0xff, x & 0xff];
export const hexToString = x => "#" + x.toString(16).padStart(6, "0");
export const RGBToHex = ([r, g, b]) => (r << 16) | (g << 8) | b;
export const RGBToString = rgb => `rgb(${rgb.map(c => c.toString()).join(", ")})`;
