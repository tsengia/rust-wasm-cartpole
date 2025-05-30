import * as Comlink from 'comlink';

import * as wasm from '../wasm/no-simd/burn_polecart_wasm.js';
import WorkerInterface from './WorkerInterface.js';

let memory: WebAssembly.Memory | null = null;

globalThis.postMessage({"loading_status":"LOADING"});

function initModuleListener(ev: MessageEvent) {
    if (ev.data == undefined || ev.data.module == undefined || ev.data.loading_status == undefined) {
        console.warn("Got web worker message that didn't match format for WASM Worker initialization!");
        console.warn(ev);
        return;
    }

    if (ev.data.loading_status != "INIT_MODULE") {
        console.warn("Got a web worker message with loading_status set to " + ev.data.loading_status + " but expected INIT_MODULE!");
        console.warn(ev);
        return;
    }
        
    const initOutput: wasm.InitOutput = wasm.initSync({module: ev.data.module});
    
    memory = initOutput.memory;
    initOutput.start();

    // Remove the event listener
    globalThis.removeEventListener("message", initModuleListener);

    // Add a event listener for the next stage of startup
    globalThis.addEventListener("message", constructWorldListener);

    globalThis.postMessage({"loading_status":"INITIALIZED", "memory": memory});
}

function constructWorldListener(ev: MessageEvent) {
    if (ev.data == undefined || ev.data.loading_status == undefined) {
        console.warn("Got web worker message that didn't match format for WASM Worker initialization!");
        console.warn(ev);
        return;
    }

    if (ev.data.loading_status != "CREATE_WORLD") {
        console.warn("Got a web worker message with loading_status set to " + ev.data.loading_status + " but expected CREATE_WORLD!");
        console.warn(ev);
        return;
    }
    
    const world = new WorkerInterface();
    console.debug("Constructed new WorkerInterface");
    
    Comlink.expose(world);
    globalThis.removeEventListener("message", constructWorldListener);
    globalThis.postMessage({"loading_status":"READY", "world": world});
}

globalThis.addEventListener("message", initModuleListener);
