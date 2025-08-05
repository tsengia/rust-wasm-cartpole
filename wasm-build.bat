@echo off

echo "Building SIMD version for web..."
@REM --cfg getrandom_backend="wasm_js" is needed by the getrandom crate
@REM See: https://docs.rs/getrandom/latest/getrandom/#webassembly-support
@REM We are setting the --target-dir so that each build type (simd and non-simd) can be cached
mkdir .\src\wasm\simd\
@REM -C target-feature=+simd128,+atomics,+bulk-memory,+mutable-globals
set RUSTFLAGS=-C embed-bitcode=yes -C target-feature=+simd128 --cfg web_sys_unstable_apis --cfg getrandom_backend="wasm_js"
echo "Running cargo build for SIMD"
cargo build --target wasm32-unknown-unknown --target-dir target-simd || exit 1
@REM --target web
wasm-bindgen.exe --target bundler --typescript --out-dir .\src\wasm\simd\ .\target-simd\wasm32-unknown-unknown\debug\burn_polecart_wasm.wasm

@REM wasm-pack build --dev --out-dir burn-polecart-wasm-simd -- --target-dir target-simd || exit 1

@REM Re-link the package for yarn
@REM type nul > burn-polecart-wasm-simd\yarn.lock
@REM Because the 'yarn' command is also implemented as a 
@REM Windows batch file, we must use the 'call' command in
@REM  order for the script to continue executing.
@REM See: https://github.com/npm/npm/issues/2938#issuecomment-11337463
@REM Wild stuff...
@REM call yarn link burn-polecart-wasm-simd

echo "Building Non-SIMD version for web..."
@REM -C target-feature=+atomics,+bulk-memory,+mutable-globals
set RUSTFLAGS=-C embed-bitcode=yes  --cfg web_sys_unstable_apis --cfg getrandom_backend="wasm_js"
mkdir .\src\wasm\no-simd\
echo "Running cargo build for non-SIMD"
cargo build --target wasm32-unknown-unknown --target-dir target || exit 1
@REM --target web
wasm-bindgen.exe --target bundler --typescript --out-dir .\src\wasm\no-simd\ .\target\wasm32-unknown-unknown\debug\burn_polecart_wasm.wasm
@REM wasm-pack build --dev --out-dir burn-polecart-wasm -- --target-dir target || exit 1
@REM copy burn-polecart-wasm\burn_polecart_wasm_bg.wasm public\
@REM type nul > burn-polecart-wasm\yarn.lock
@REM call yarn link burn-polecart-wasm

echo Build complete!
