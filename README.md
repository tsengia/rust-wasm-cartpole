# Reinforcement Learning Cart Pole in Rust WASM
Train a Neural Network model using various Reinforcement Learning algorithms in your browser.

Written in Rust and compiled to WASM.

Uses WASM 128 bit SIMD extension to speed up execution.

Uses multiple web-workers to parallelize episode roll outs.

```bash
# Install the WASM32 target for rust
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Install wasm-bindgen CLI tool
cargo install wasm-bindgen-cli

# Install/enable yarn
corepack enable

# Setup SDKs for VSCode
yarn dlx @yarnpkg/sdks vscode
```

## Building
Currently, I only have build instructions for my local development environment, which uses Yarn and Windows (PowerShell).

Typical Linux build instructions to come.
```
# First, compile the Rust code to WASM modules:
.\wasm-build.bat

# Next, compile the frontend code:
yarn run build
```

## Dependencies
- WASM Bindgen (Compiles Rust to WASM)
- Comlink (useful for Web Workers)
- Burn (Rust ML/tensor library)
- React (UI)
- Radix UI (Component Library)
