# WASM Web Worker
All code in this folder runs in a Web Worker that is launched by the main thread code.

The main thread communicates with the Web Worker via the `WorkerInterface`, which is "exposed" via `Comlink`.

Depending upon the browser, either the `WasmWorker` or the `WasmWorkerSIMD` is loaded. Regardless, both `WasmWorker` and `WasmWorkerSIMD` expose the same `WorkerInterface` to the main thread, so the main thread knows no difference.