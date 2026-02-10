# Blind Auction on Arcium

A privacy-preserving sealed-bid auction system built on Solana using Arcium's MPC network.

## Overview

Traditional onchain auctions expose all bid amounts, enabling:
- **Front-running**: Watching pending bids and outbidding them
- **Bid sniping**: Last-second bids based on known highest bid
- **Collusion**: Bidders coordinating based on visible bids
- **Market manipulation**: Revealing trading intent

**This blind auction solves these problems** by keeping all bids encrypted until the auction closes. Only the winning bid and winner are revealed - all other bids remain permanently private.

## Features

### Sealed-Bid Auction
- 🔒 **Encrypted Bids**: Bid amounts are never visible onchain
- 🤝 **Fair Competition**: No one can see or react to other bids
- ✅ **Verifiable**: MPC computation is cryptographically verified
- 🏆 **Single Reveal**: Only winner + winning amount revealed at close

### Vickrey Auction (Second-Price)
- Winner pays the **second-highest** bid
- Encourages truthful bidding
- Used by Google, eBay, and other major platforms

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Bidder    │     │   Arcium     │     │   Solana    │
│  (Client)   │────▶│  MPC Nodes   │────▶│  Program    │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                    │
       │  1. Encrypt bid    │                    │
       │─────────────────▶  │                    │
       │                    │  2. Compare with   │
       │                    │     highest bid    │
       │                    │  (all encrypted)   │
       │                    │                    │
       │  3. Return result  │                    │
       │◀─────────────────  │                    │
       │  (am I winning?)   │                    │
       │                    │  4. Store updated  │
       │                    │     encrypted state│
       │                    │─────────────────▶  │
```

## Privacy Guarantees

| Data | Before Close | After Close |
|------|--------------|-------------|
| Your bid amount | 🔒 Private | 🔒 Private (unless you won) |
| Whether you bid | 📢 Public | 📢 Public |
| If you're winning | 🔒 Only you know | 🔒 Only you know |
| Highest bid | 🔒 Private | 📢 Public (winner only) |
| Number of bids | 📢 Public | 📢 Public |

## Project Structure

```
blind-auction/
├── encrypted-ixs/           # Arcium MPC computations
│   └── src/
│       └── lib.rs           # Encrypted bid comparison logic
├── programs/
│   └── blind-auction/
│       └── src/
│           └── lib.rs       # Solana program
├── tests/
│   └── blind-auction.ts     # Integration tests
├── Arcium.toml              # Arcium configuration
└── Anchor.toml              # Anchor configuration
```

## Encrypted Instructions

### `init_auction`
Creates a new auction with zero state.

### `place_bid(current_state, new_bid)`
Compares the encrypted bid with the current highest:
- If higher → Updates state (all encrypted)
- Returns only "is_winning" to bidder

### `close_auction(state, reveal_key)`
Reveals the winner and winning amount only.

### `place_vickrey_bid` / `close_vickrey_auction`
Vickrey variant that tracks both first and second highest bids.

## Building

### Prerequisites
- Rust
- Solana CLI v2.3.0
- Anchor 0.32.1
- Arcium CLI

### Installation

```bash
# Install Arcium (Mac/Linux)
curl --proto '=https' --tlsv1.2 -sSfL https://install.arcium.com/ | bash

# Initialize project
cd blind-auction
arcium build
```

### Testing

```bash
# Run local tests
arcium test

# Test on devnet
arcium test --cluster devnet
```

## Usage

### Create an Auction

```typescript
const auctionId = randomBytes(32);
const endTime = Date.now() / 1000 + 3600; // 1 hour
const minBid = 1_000_000_000; // 1 SOL

await program.methods
  .createAuction(computationOffset, auctionId, endTime, minBid, publicKey, nonce)
  .accounts({ /* ... */ })
  .rpc();
```

### Place a Bid

```typescript
// Encrypt bid locally
const bid = { bidder_id: hash(wallet.publicKey), amount: 5_000_000_000 };
const encrypted = cipher.encrypt(bid, nonce);

await program.methods
  .placeBid(computationOffset, auctionId, encrypted.bidder_id, encrypted.amount, publicKey, nonce)
  .accounts({ /* ... */ })
  .rpc();
```

### Close Auction

```typescript
await program.methods
  .closeAuction(computationOffset, auctionId, publicKey, nonce)
  .accounts({ /* ... */ })
  .rpc();

// Winner and amount now revealed in event
```

## Use Cases

1. **NFT Auctions** - Fair price discovery without sniping
2. **Token Sales** - Private bidding for allocations
3. **Real Estate** - Sealed-bid property sales
4. **Procurement** - Government/enterprise bidding
5. **Domain Auctions** - ENS/SNS name sales

## Security

- **MPC Security**: Bids computed across multiple nodes - no single party sees plaintext
- **Verifiable**: Every computation is cryptographically verifiable onchain
- **Trustless**: No trusted auctioneer required
- **Slashing**: Malicious nodes lose staked collateral

## Author

**giwaov** - Arcium RTG Submission

## License

MIT

## Links

- [Arcium Documentation](https://docs.arcium.com/)
- [Arcium RTG Program](https://rtg.arcium.com/rtg)
- [Solana Anchor](https://www.anchor-lang.com/)
