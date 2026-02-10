// Blind Auction - Encrypted Instructions
// Arcium RTG Submission
// Author: giwaov
//
// This module contains the encrypted computation logic for a sealed-bid auction.
// Bids are submitted encrypted and only the winner is revealed at auction close.

use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Encrypted bid data
    pub struct EncryptedBid {
        /// Bidder's unique identifier (hash of pubkey)
        pub bidder_id: u64,
        /// Bid amount in lamports
        pub amount: u64,
    }

    /// Auction state (encrypted)
    pub struct AuctionState {
        /// Current highest bid amount
        pub highest_bid: u64,
        /// Current highest bidder ID
        pub highest_bidder: u64,
        /// Number of bids received
        pub bid_count: u32,
        /// Whether auction is still open
        pub is_open: u8,
    }

    /// Result of placing a bid
    pub struct BidResult {
        /// Whether this bid is currently winning
        pub is_winning: u8,
        /// Total bids so far
        pub total_bids: u32,
    }

    /// Final auction result (revealed at close)
    pub struct AuctionResult {
        /// Winning bidder ID
        pub winner_id: u64,
        /// Winning bid amount
        pub winning_amount: u64,
        /// Total number of bids
        pub total_bids: u32,
    }

    /// Initialize a new auction
    /// Returns initial encrypted auction state
    #[instruction]
    pub fn init_auction(
        _input: Enc<Shared, u8>, // dummy input to establish encryption
    ) -> Enc<Mxe, AuctionState> {
        // Initialize auction with zero state
        let initial_state = AuctionState {
            highest_bid: 0,
            highest_bidder: 0,
            bid_count: 0,
            is_open: 1, // 1 = open
        };
        
        Enc::<Mxe, AuctionState>::from_arcis(initial_state)
    }

    /// Place an encrypted bid
    /// Compares with current highest and updates state if higher
    /// All computation happens on encrypted data - no bid amounts revealed
    #[instruction]
    pub fn place_bid(
        current_state: Enc<Mxe, AuctionState>,
        new_bid: Enc<Shared, EncryptedBid>,
    ) -> (Enc<Mxe, AuctionState>, Enc<Shared, BidResult>) {
        let state = current_state.to_arcis();
        let bid = new_bid.to_arcis();
        
        // Check if auction is open (1 = open, 0 = closed)
        // In MPC we evaluate both branches
        let auction_open = state.is_open == 1;
        
        // Compare bid with current highest
        let is_higher = bid.amount > state.highest_bid;
        
        // Update state if bid is higher AND auction is open
        let new_highest_bid = if auction_open && is_higher {
            bid.amount
        } else {
            state.highest_bid
        };
        
        let new_highest_bidder = if auction_open && is_higher {
            bid.bidder_id
        } else {
            state.highest_bidder
        };
        
        // Increment bid count if auction is open
        let new_bid_count = if auction_open {
            state.bid_count + 1
        } else {
            state.bid_count
        };
        
        // Create updated state
        let updated_state = AuctionState {
            highest_bid: new_highest_bid,
            highest_bidder: new_highest_bidder,
            bid_count: new_bid_count,
            is_open: state.is_open,
        };
        
        // Return result to bidder (encrypted with their key)
        // They only learn if they're currently winning, not the actual values
        let result = BidResult {
            is_winning: if auction_open && is_higher { 1 } else { 0 },
            total_bids: new_bid_count,
        };
        
        (
            Enc::<Mxe, AuctionState>::from_arcis(updated_state),
            new_bid.owner.from_arcis(result)
        )
    }

    /// Close the auction and reveal winner
    /// Only the winning bid and bidder are revealed - all other bids stay private
    #[instruction]
    pub fn close_auction(
        current_state: Enc<Mxe, AuctionState>,
        _reveal_key: Enc<Shared, u8>, // Auctioneer's key for decryption
    ) -> Enc<Shared, AuctionResult> {
        let state = current_state.to_arcis();
        
        // Mark auction as closed
        // (In production, you'd update state and return it too)
        
        // Reveal only the final result
        let result = AuctionResult {
            winner_id: state.highest_bidder,
            winning_amount: state.highest_bid,
            total_bids: state.bid_count,
        };
        
        _reveal_key.owner.from_arcis(result)
    }

    /// Vickrey auction variant - winner pays second-highest price
    /// Requires tracking both first and second highest bids
    pub struct VickreyState {
        pub highest_bid: u64,
        pub highest_bidder: u64,
        pub second_bid: u64,
        pub bid_count: u32,
        pub is_open: u8,
    }

    pub struct VickreyResult {
        pub winner_id: u64,
        pub price_to_pay: u64, // Second highest bid
        pub total_bids: u32,
    }

    /// Place bid in Vickrey auction
    #[instruction]
    pub fn place_vickrey_bid(
        current_state: Enc<Mxe, VickreyState>,
        new_bid: Enc<Shared, EncryptedBid>,
    ) -> (Enc<Mxe, VickreyState>, Enc<Shared, BidResult>) {
        let state = current_state.to_arcis();
        let bid = new_bid.to_arcis();
        
        let auction_open = state.is_open == 1;
        let is_highest = bid.amount > state.highest_bid;
        let is_second = !is_highest && bid.amount > state.second_bid;
        
        // Update first place
        let new_highest_bid = if auction_open && is_highest {
            bid.amount
        } else {
            state.highest_bid
        };
        
        let new_highest_bidder = if auction_open && is_highest {
            bid.bidder_id
        } else {
            state.highest_bidder
        };
        
        // Update second place
        // If new bid is highest, previous highest becomes second
        // If new bid is only second, it becomes second
        let new_second_bid = if auction_open && is_highest {
            state.highest_bid // Previous highest is now second
        } else if auction_open && is_second {
            bid.amount
        } else {
            state.second_bid
        };
        
        let new_bid_count = if auction_open {
            state.bid_count + 1
        } else {
            state.bid_count
        };
        
        let updated_state = VickreyState {
            highest_bid: new_highest_bid,
            highest_bidder: new_highest_bidder,
            second_bid: new_second_bid,
            bid_count: new_bid_count,
            is_open: state.is_open,
        };
        
        let result = BidResult {
            is_winning: if auction_open && is_highest { 1 } else { 0 },
            total_bids: new_bid_count,
        };
        
        (
            Enc::<Mxe, VickreyState>::from_arcis(updated_state),
            new_bid.owner.from_arcis(result)
        )
    }

    /// Close Vickrey auction - winner pays second-highest price
    #[instruction]
    pub fn close_vickrey_auction(
        current_state: Enc<Mxe, VickreyState>,
        _reveal_key: Enc<Shared, u8>,
    ) -> Enc<Shared, VickreyResult> {
        let state = current_state.to_arcis();
        
        let result = VickreyResult {
            winner_id: state.highest_bidder,
            price_to_pay: state.second_bid, // Winner pays second-highest!
            total_bids: state.bid_count,
        };
        
        _reveal_key.owner.from_arcis(result)
    }
}
