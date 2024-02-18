"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BufferReader {
    buffer;
    index = 0;
    constructor(data) {
        this.buffer = data;
    }
    readUint8() {
        const vaue = this.buffer.readUint8(this.index);
        this.index = vaue + 1;
        return vaue;
    }
    isComplete() {
        return this.buffer.length === this.index;
    }
}
exports.default = BufferReader;
