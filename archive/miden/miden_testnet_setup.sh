#!/bin/bash
set -euo pipefail

# =============================================================================
# Miden Testnet Automation Script
# =============================================================================
# Automates:
#   1. Install miden-client CLI
#   2. Initialize client for testnet
#   3. Create two wallets (Account A & Account B)
#   4. Request testnet tokens from faucet
#   5. Private P2P transfer (A -> B)  [like Dome]
#   6. Swap transaction                [like ZoroSwap]
#
# Manual steps (browser-only, cannot be scripted):
#   - Register a Miden Name:        https://miden.name
#   - Playground tutorial:           https://playground.miden.xyz
# =============================================================================

WORKDIR="$HOME/miden-testnet"
FAUCET_URL="https://faucet.testnet.miden.io"
TRANSFER_AMOUNT=50
SWAP_OFFERED_AMOUNT=10
SWAP_REQUESTED_AMOUNT=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# -----------------------------------------------------------------------------
# Step 0: Check prerequisites
# -----------------------------------------------------------------------------
check_prerequisites() {
    log "Checking prerequisites..."

    if ! command -v rustc &>/dev/null; then
        err "Rust is not installed. Install it from https://www.rust-lang.org/tools/install (min v1.88)"
    fi

    RUST_VER=$(rustc --version | grep -oP '\d+\.\d+' | head -1)
    info "Rust version: $RUST_VER"

    if ! command -v cargo &>/dev/null; then
        err "Cargo not found. Ensure Rust is properly installed."
    fi

    log "Prerequisites OK."
}

# -----------------------------------------------------------------------------
# Step 1: Install miden-client
# -----------------------------------------------------------------------------
install_client() {
    if command -v miden-client &>/dev/null; then
        local ver
        ver=$(miden-client --version 2>/dev/null || echo "unknown")
        warn "miden-client already installed: $ver"
        read -rp "Reinstall? (y/N): " choice
        if [[ "$choice" != "y" && "$choice" != "Y" ]]; then
            log "Skipping install."
            return
        fi
    fi

    log "Installing miden-client CLI (this may take a few minutes)..."
    cargo install miden-client-cli --locked
    log "Installed: $(miden-client --version)"
}

# -----------------------------------------------------------------------------
# Step 2: Initialize client for testnet
# -----------------------------------------------------------------------------
init_client() {
    log "Setting up workspace at $WORKDIR"
    mkdir -p "$WORKDIR"
    cd "$WORKDIR"

    if [[ -f "miden-client.toml" ]]; then
        warn "miden-client.toml already exists in $WORKDIR"
        read -rp "Reinitialize? This will overwrite the config. (y/N): " choice
        if [[ "$choice" != "y" && "$choice" != "Y" ]]; then
            log "Using existing config."
            return
        fi
    fi

    log "Initializing miden-client for testnet..."
    miden-client init --network testnet
    log "Client initialized. Config: $WORKDIR/miden-client.toml"
}

# -----------------------------------------------------------------------------
# Step 3: Create wallets
# -----------------------------------------------------------------------------
create_wallets() {
    cd "$WORKDIR"

    log "Creating Account A (mutable wallet)..."
    ACCOUNT_A_OUTPUT=$(miden-client new-wallet --mutable 2>&1)
    echo "$ACCOUNT_A_OUTPUT"

    log "Creating Account B (mutable wallet)..."
    ACCOUNT_B_OUTPUT=$(miden-client new-wallet --mutable 2>&1)
    echo "$ACCOUNT_B_OUTPUT"

    log "Listing all accounts..."
    miden-client account -l

    # Extract account IDs
    ACCOUNT_A=$(miden-client account -l 2>&1 | grep -oP '0x[0-9a-fA-F]+' | head -1)
    ACCOUNT_B=$(miden-client account -l 2>&1 | grep -oP '0x[0-9a-fA-F]+' | head -2 | tail -1)

    if [[ -z "$ACCOUNT_A" || -z "$ACCOUNT_B" ]]; then
        err "Failed to extract account IDs. Check 'miden-client account -l' output."
    fi

    log "Account A: $ACCOUNT_A"
    log "Account B: $ACCOUNT_B"

    # Save for later use
    echo "$ACCOUNT_A" > "$WORKDIR/.account_a"
    echo "$ACCOUNT_B" > "$WORKDIR/.account_b"
}

# -----------------------------------------------------------------------------
# Step 4: Request testnet tokens from faucet
# -----------------------------------------------------------------------------
request_faucet_tokens() {
    cd "$WORKDIR"
    ACCOUNT_A=$(cat "$WORKDIR/.account_a" 2>/dev/null || true)

    if [[ -z "$ACCOUNT_A" ]]; then
        err "No Account A found. Run create_wallets first."
    fi

    echo ""
    warn "=== MANUAL STEP REQUIRED ==="
    info "The faucet requires a browser. Please do the following:"
    echo ""
    info "  1. Open: $FAUCET_URL"
    info "  2. Paste your Account A ID: $ACCOUNT_A"
    info "  3. Click 'Send Public Note' (easier - no file import needed)"
    info "     OR click 'Send Private Note' and save the note.mno file"
    echo ""

    read -rp "Did you use 'Send Public Note'? (y/n): " public_note

    if [[ "$public_note" == "n" || "$public_note" == "N" ]]; then
        read -rp "Enter path to downloaded note.mno file: " note_path
        if [[ ! -f "$note_path" ]]; then
            err "File not found: $note_path"
        fi
        log "Importing private note..."
        miden-client import "$note_path"
    fi

    log "Syncing with network..."
    miden-client sync

    log "Checking notes..."
    miden-client notes --list

    info "If the note shows as 'Committed', consume it now."
    log "Consuming all available notes for Account A..."
    miden-client consume-notes --account "$ACCOUNT_A" --force

    log "Syncing after consumption..."
    miden-client sync

    log "Account A balance:"
    miden-client account --show "$ACCOUNT_A"
}

# -----------------------------------------------------------------------------
# Step 5: Private P2P Transfer (A -> B) — like Dome
# -----------------------------------------------------------------------------
private_transfer() {
    cd "$WORKDIR"
    ACCOUNT_A=$(cat "$WORKDIR/.account_a" 2>/dev/null || true)
    ACCOUNT_B=$(cat "$WORKDIR/.account_b" 2>/dev/null || true)

    if [[ -z "$ACCOUNT_A" || -z "$ACCOUNT_B" ]]; then
        err "Account IDs not found. Run create_wallets first."
    fi

    # Get faucet ID from account A's vault
    log "Looking up faucet ID from Account A's assets..."
    FAUCET_ID=$(miden-client account --show "$ACCOUNT_A" 2>&1 | grep -oP '0x[0-9a-fA-F]{16}' | tail -1)

    if [[ -z "$FAUCET_ID" ]]; then
        warn "Could not auto-detect faucet ID."
        read -rp "Enter the faucet account ID (from https://faucet.testnet.miden.io): " FAUCET_ID
    fi

    info "Faucet ID: $FAUCET_ID"
    log "Sending $TRANSFER_AMOUNT tokens: Account A -> Account B (private note)..."

    miden-client send \
        --sender "$ACCOUNT_A" \
        --target "$ACCOUNT_B" \
        --asset "${TRANSFER_AMOUNT}::${FAUCET_ID}" \
        --note-type private \
        --force

    log "Syncing..."
    miden-client sync

    log "Consuming note on Account B..."
    miden-client consume-notes --account "$ACCOUNT_B" --force

    log "Syncing after consumption..."
    miden-client sync

    log "Account A balance:"
    miden-client account --show "$ACCOUNT_A"

    log "Account B balance:"
    miden-client account --show "$ACCOUNT_B"

    log "Private transfer complete!"
}

# -----------------------------------------------------------------------------
# Step 6: Swap Transaction — like ZoroSwap
# -----------------------------------------------------------------------------
swap_transaction() {
    cd "$WORKDIR"
    ACCOUNT_A=$(cat "$WORKDIR/.account_a" 2>/dev/null || true)
    ACCOUNT_B=$(cat "$WORKDIR/.account_b" 2>/dev/null || true)

    if [[ -z "$ACCOUNT_A" || -z "$ACCOUNT_B" ]]; then
        err "Account IDs not found. Run create_wallets first."
    fi

    warn "=== SWAP TRANSACTION ==="
    info "A swap requires two different faucet tokens."
    info "You need tokens from two different faucets for a real swap."
    info "If you only have one token type, this step will create the SWAP note"
    info "but the counterparty won't be able to fill it without the requested asset."
    echo ""

    read -rp "Enter the OFFERED faucet ID (token you want to sell): " OFFERED_FAUCET
    read -rp "Enter the REQUESTED faucet ID (token you want to buy): " REQUESTED_FAUCET

    if [[ -z "$OFFERED_FAUCET" || -z "$REQUESTED_FAUCET" ]]; then
        err "Both faucet IDs are required for a swap."
    fi

    log "Creating SWAP note from Account A..."
    log "  Offering: ${SWAP_OFFERED_AMOUNT}::${OFFERED_FAUCET}"
    log "  Requesting: ${SWAP_REQUESTED_AMOUNT}::${REQUESTED_FAUCET}"

    miden-client swap \
        --source "$ACCOUNT_A" \
        --offered-asset "${SWAP_OFFERED_AMOUNT}::${OFFERED_FAUCET}" \
        --requested-asset "${SWAP_REQUESTED_AMOUNT}::${REQUESTED_FAUCET}" \
        --note-type public \
        --force

    log "Syncing..."
    miden-client sync

    log "Swap note created! Another account can now fill this order."
    log "To fill from Account B (if it has the requested tokens):"
    info "  miden-client consume-notes --account $ACCOUNT_B <swap-note-id> --force"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
print_summary() {
    ACCOUNT_A=$(cat "$WORKDIR/.account_a" 2>/dev/null || echo "N/A")
    ACCOUNT_B=$(cat "$WORKDIR/.account_b" 2>/dev/null || echo "N/A")

    echo ""
    echo "=============================================="
    echo "  MIDEN TESTNET SETUP COMPLETE"
    echo "=============================================="
    echo ""
    echo "  Workspace:   $WORKDIR"
    echo "  Account A:   $ACCOUNT_A"
    echo "  Account B:   $ACCOUNT_B"
    echo ""
    echo "  Remaining manual steps:"
    echo "    - Register Miden Name:  https://miden.name"
    echo "    - Playground tutorial:  https://playground.miden.xyz"
    echo ""
    echo "  Useful commands:"
    echo "    miden-client sync"
    echo "    miden-client account -l"
    echo "    miden-client notes --list"
    echo "    miden-client account --show <ID>"
    echo "=============================================="
}

# -----------------------------------------------------------------------------
# Main menu
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo "========================================="
    echo "  Miden Testnet Automation Script"
    echo "========================================="
    echo ""
    echo "  1) Full setup (all steps)"
    echo "  2) Install miden-client only"
    echo "  3) Initialize testnet config"
    echo "  4) Create wallets"
    echo "  5) Request faucet tokens"
    echo "  6) Private transfer (A -> B)"
    echo "  7) Swap transaction"
    echo "  0) Exit"
    echo ""
    read -rp "Choose an option [1]: " option
    option=${option:-1}

    case $option in
        1)
            check_prerequisites
            install_client
            init_client
            create_wallets
            request_faucet_tokens
            private_transfer
            swap_transaction
            print_summary
            ;;
        2) check_prerequisites; install_client ;;
        3) init_client ;;
        4) create_wallets ;;
        5) request_faucet_tokens ;;
        6) private_transfer ;;
        7) swap_transaction ;;
        0) log "Bye!"; exit 0 ;;
        *) err "Invalid option: $option" ;;
    esac
}

main "$@"
