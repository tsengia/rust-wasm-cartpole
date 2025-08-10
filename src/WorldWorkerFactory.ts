import * as Comlink from 'comlink';
import { simd } from "wasm-feature-detect";

import WorldWorkerProxy from './WorldWorkerProxy';
import WorkerInterface from './worker/WorkerInterface';

const simdSupported = await simd();
let workerURL: URL;
if (simdSupported) {
    console.debug("SIMD is supported");
    workerURL = new URL("./worker/WasmWorkerSIMD.ts", import.meta.url);
} else {
    console.debug("SIMD is not supported");
    workerURL = new URL("./worker/WasmWorker.ts", import.meta.url);
}

console.log("Worker Url to request " + workerURL);

export class WorldWorkerFactory {
  _worker: Worker | null;
  _comlink: Comlink.Remote<WorkerInterface> | null;

  // These are the resolve and reject functions for the Promise that is returned by init()
  _initPromiseResolve: ((result: WorldWorkerProxy) => void ) | null;
  _initPromiseReject: ((reason: string) => void ) | null;

  constructor() {
    this._worker = null;
    this._comlink = null;
    this._initPromiseResolve = null;
    this._initPromiseReject = null;

    // Bind event handlers used during the initialization sequence
    this._createFinishedCallback = this._createFinishedCallback.bind(this);
  }

  _initReject(reason: string) {
    console.error("Worker init failed!");
    if (this._initPromiseReject != null) {
      this._initPromiseReject(reason);
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

    if (ev.data.loading_status == "READY") {

      this._comlink = Comlink.wrap(this._worker);
      console.log("World constructed!");
      this._worker.removeEventListener("message", this._createFinishedCallback);
      
      this._initPromiseResolve(new WorldWorkerProxy(this._worker, this._comlink));
    }
    else {
      console.log("Worker reports status: " + ev.data.loading_status);
    }
  }

  init(): Promise<WorldWorkerProxy> {
    console.log("Attempting to spawn a new worker!");
    // NOTE: Switch type: back to "classic" when building for real
    this._worker = new Worker(
      workerURL, 
      {name: "WasmWorker", type:"module"}
    );
    this._worker.addEventListener("message", this._createFinishedCallback);

    const promise = new Promise<WorldWorkerProxy>((resolve, reject) => {
      this._initPromiseResolve = resolve;
      this._initPromiseReject = reject;
    });
    return promise;
  }
}

export default WorldWorkerFactory;

