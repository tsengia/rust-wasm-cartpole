#!/bin/bash

echo "Building SIMD version for web..."
# --cfg getrandom_backend="wasm_js" is needed by the getrandom crate
# See: https://docs.rs/getrandom/latest/getrandom/#webassembly-support
# We are setting the --target-dir so that each build type (simd and non-simd) can be cached
mkdir -p ./src/wasm/simd/
# For shared memory: -C target-feature=+simd128,+atomics,+bulk-memory,+mutable-globals
# NOTE: Cannot use shared memory within --target bundler, only no-module works for shared memory.
export RUSTFLAGS='-C embed-bitcode=yes -C target-feature=+simd128 --cfg web_sys_unstable_apis --cfg getrandom_backend="wasm_js"'
echo "Running cargo build for SIMD"
cargo build --target wasm32-unknown-unknown --target-dir target-simd || exit 1
# --target web
# Because we are "import"ing the WASM module into our web worker code, this must be set to bundler
wasm-bindgen --target bundler --typescript --out-dir ./src/wasm/simd/ ./target-simd/wasm32-unknown-unknown/debug/burn_polecart_wasm.wasm

echo "Building Non-SIMD version for web..."
# For shared memory: -C target-feature=+atomics,+bulk-memory,+mutable-globals
# NOTE: Cannot use shared memory within --target bundler, only no-module works for shared memory.
export RUSTFLAGS='-C embed-bitcode=yes --cfg web_sys_unstable_apis --cfg getrandom_backend="wasm_js"'
mkdir -p ./src/wasm/no-simd/
echo "Running cargo build for non-SIMD"
cargo build --target wasm32-unknown-unknown --target-dir target || exit 1
# Because we are "import"ing the WASM module into our web worker code, this must be set to bundler
wasm-bindgen --target bundler --typescript --out-dir ./src/wasm/no-simd/ ./target/wasm32-unknown-unknown/debug/burn_polecart_wasm.wasm


echo Build complete!
