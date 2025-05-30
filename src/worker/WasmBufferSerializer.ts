
export class SharedWasmBuffer {
    readonly offset: number;
    readonly length: number;

    constructor(offset: number, length: number) {
        this.offset = offset;
        this.length = length;
    }
}

export class SerializedSharedWasmObject {
    buffers: Map<string, SharedWasmBuffer>

    constructor(buffers: Map<string, SharedWasmBuffer>) {

    }


}



export default SharedWasmObject;
