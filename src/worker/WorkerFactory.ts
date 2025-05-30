import * as Comlink from 'comlink';
import { simd } from "wasm-feature-detect";

import * as wasm from "../wasm/no-simd/burn_polecart_wasm";
import CartPoleWorldProxy from './WasmWorkerProxy';

const simdSupported = await simd();
let wasmURL: URL;
if (simdSupported) {
    console.debug("SIMD is supported");
    wasmURL = new URL("./wasm/simd/burn_polecart_wasm_bg.wasm", import.meta.url);
} else {
    console.debug("SIMD is not supported");
    wasmURL = new URL("./wasm/no-simd/burn_polecart_wasm_bg.wasm", import.meta.url);
}

console.log("WASM Url to request " + wasmURL);

let wasmModule: WebAssembly.Module | null = null;

fetch(wasmURL).then((response: Response) => {
  WebAssembly.compileStreaming(response).then((module) => {
    // Module is compiled 
    wasmModule = module;
  }).catch((error) => {
    console.error("Failed to compile WASM module!");
    console.error(error);
  });
}).catch((error) => {
  console.error("Failed to fetch WASM module!");
  console.error(error);
});

export class CartPoleWorldWorkerFactory {
  _worker: Worker | null;
  _comlink: Comlink.Remote<wasm.CartPoleWorld> | null;
  _memory: WebAssembly.Memory | null;

  // These are the resolve and reject functions for the Promise that is returned by init()
  _initPromiseResolve: ((result: CartPoleWorldProxy) => void ) | null;
  _initPromiseReject: ((reason: string) => void ) | null;

  constructor() {
    this._worker = null;
    this._comlink = null;
    this._memory = null;
    this._initPromiseResolve = null;
    this._initPromiseReject = null;

    // Bind event handlers used during the initialization sequence
    this._initFinishedCallback = this._initFinishedCallback.bind(this);
    this._createFinishedCallback = this._createFinishedCallback.bind(this);
  }

  _initReject(reason: string) {
    console.error("Worker init failed!");
    if (this._initPromiseReject != null) {
      this._initPromiseReject(reason);
    }
  }

  _initFinishedCallback(ev: MessageEvent) {
    if(this._worker == null) {
      console.error("_worker set to null somehow!");
      this._initReject("_worker set to null somehow!");
      return;
    }
    if (ev.data == undefined || ev.data.loading_status == undefined) {
      console.warn("Got message from web worker that does match loading message format!");
      console.warn(ev);
      return;
    }

    if (ev.data.loading_status == "INITIALIZED") {
      if (ev.data.memory == undefined) {
        this._initReject("Got load_status: READY from web worker, but missing memory field!");
        console.error(ev);
        return;
      }
      
      this._memory = ev.data.memory;
      this._worker.removeEventListener("message", this._initFinishedCallback);
      this._worker.addEventListener("message", this._createFinishedCallback);
      this._worker.postMessage({"loading_status":"CREATE_WORLD"});
    }
  }

  _createFinishedCallback(ev: MessageEvent) {
    if(this._worker == null) {
      this._initReject("_worker set to null somehow!");
      return;
    }
    if (this._initPromiseResolve == null) {
      this._initReject("_initPromiseResolve set to null somehow!");
      return;
    }
    if (ev.data == undefined || ev.data.loading_status == undefined) {
      console.warn("Got message from web worker that does match loading message format!");
      return;
    }
    this._comlink = Comlink.wrap(this._worker);
    console.log("World constructed!");
    this._worker.removeEventListener("message", this._createFinishedCallback);
    
    if (this._memory == null) {
      this._initReject("Got load_status: READY from web worker, but memory field is null!");
      console.error(ev);
      return;
    }
    this._initPromiseResolve(new CartPoleWorldProxy(this._worker, this._memory, this._comlink));
  }

  init(): Promise<CartPoleWorldProxy> {
    console.log("Attempting to spawn a new worker!");
    // NOTE: Switch type: back to "classic" when building for real
    this._worker = new Worker(
      new URL("WasmWorker.ts", import.meta.url), 
      {name: "WasmWorker", type:"module"}
    );
    this._worker.addEventListener("message", this._initFinishedCallback);
    this._worker.postMessage({"module": wasmModule, "loading_status":"INIT_MODULE"});

    const promise = new Promise<CartPoleWorldProxy>((resolve, reject) => {
      this._initPromiseResolve = resolve;
      this._initPromiseReject = reject;
    });
    return promise;
  }
}

export default CartPoleWorldWorkerFactory;

