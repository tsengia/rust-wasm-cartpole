import * as Comlink from 'comlink';

import * as wasm from '../wasm/simd/burn_polecart_wasm.js';
import WorkerInterface from './WorkerInterface.js';

globalThis.postMessage({"loading_status":"LOADING"});

console.log("Loading WASM")
wasm.start();

const workerInterface = new WorkerInterface();
console.debug("Constructed new WorkerInterface");

Comlink.expose(workerInterface);
globalThis.postMessage({"loading_status":"READY"});
