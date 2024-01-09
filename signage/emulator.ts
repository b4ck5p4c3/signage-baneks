export interface Font {
    widths: number[];
    charData: boolean[][][];
}

export type Image = boolean[][];

export function getStringWidth(string: Uint8Array, font: Font): number {
    return string.length * 2 - 2 + string.map(item => font.widths[item]).reduce((p, v) => p + v, 0);
}

export class Emulator {
    private readonly buffer: number[];

    constructor(private readonly font: Font, private readonly zones: number) {
        this.buffer = [...Array(zones * 8)].map(() => 0);
    }

    getBuffer(): Uint8Array {
        return Uint8Array.from(this.buffer);
    }

    clear(fill: boolean) {
        this.buffer.fill(fill ? 255 : 0);
    }

    setPixel(x: number, y: number, fill: boolean): void {
        if (x < 0 || x >= this.zones * 8) {
            return;
        }
        if (y < 0 || y >= 8) {
            return;
        }
        if (fill) {
            this.buffer[y * this.zones + Math.floor(x / 8)] |= 1 << (x % 8);
        } else {
            this.buffer[y * this.zones + Math.floor(x / 8)] &= (~(1 << (x % 8))) & 0xFF;
        }
    }

    drawChar(char: number, x: number, y: number, inverse: boolean): number {
        for (let xChar = 0; xChar < this.font.widths[char]; xChar++) {
            for (let yChar = 0; yChar < 8; yChar++) {
                this.setPixel(x + xChar, y + yChar, inverse ?
                    !this.font.charData[char][xChar][yChar] : this.font.charData[char][xChar][yChar]);
            }
        }
        return this.font.widths[char] + 2;
    }

    drawText(data: Uint8Array, x: number, y: number, inverse: boolean): number {
        for (const byte of data) {
            x += this.drawChar(byte, x, y, inverse);
        }
        return x;
    }

    drawImage(image: Image, x: number, y: number, inverse: boolean): void {
        if (image.length === 0) {
            return;
        }
        for (let xImage = 0; xImage < image[0].length; xImage++) {
            for (let yImage = 0; yImage < image.length; yImage++) {
                this.setPixel(x + xImage, y + yImage, inverse ? image[x][y] : !image[x][y]);
            }
        }
    }

    getWidth(): number {
        return this.zones * 8;
    }
}