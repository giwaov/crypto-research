// Blind Auction - Solana Program
// Arcium RTG Submission
// Author: giwaov
//
// This program orchestrates the blind auction on Solana,
// delegating encrypted computations to Arcium's MPC network.

use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

// Computation definition offsets for each encrypted instruction
const COMP_DEF_OFFSET_INIT_AUCTION: u32 = comp_def_offset("init_auction");
const COMP_DEF_OFFSET_PLACE_BID: u32 = comp_def_offset("place_bid");
const COMP_DEF_OFFSET_CLOSE_AUCTION: u32 = comp_def_offset("close_auction");

declare_id!("EGePzFcrUy9d9uxQk7eutiAjUK1kbXHs8FydhMTZWJXX");

#[arcium_program]
pub mod blind_auction {
    use super::*;

    // ============================================================
    // COMPUTATION DEFINITION INITIALIZATION
    // ============================================================

    /// Initialize the computation definition for init_auction
    pub fn init_auction_comp_def(ctx: Context<InitAuctionCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize the computation definition for place_bid
    pub fn init_place_bid_comp_def(ctx: Context<InitPlaceBidCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    /// Initialize the computation definition for close_auction
    pub fn init_close_auction_comp_def(ctx: Context<InitCloseAuctionCompDef>) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    // ============================================================
    // AUCTION MANAGEMENT
    // ============================================================

    /// Create a new auction - initializes encrypted state
    pub fn init_auction(
        ctx: Context<InitAuction>,
        computation_offset: u64,
        auction_id: [u8; 32],
        end_time: i64,
        min_bid: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Store auction metadata on-chain
        let auction = &mut ctx.accounts.auction;
        auction.auction_id = auction_id;
        auction.authority = ctx.accounts.payer.key();
        auction.end_time = end_time;
        auction.min_bid = min_bid;
        auction.is_finalized = false;
        auction.bump = ctx.bumps.auction;

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Build args for encrypted init
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8([0u8; 32])
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![InitAuctionCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        emit!(AuctionCreated {
            auction_id,
            authority: ctx.accounts.payer.key(),
            end_time,
            min_bid,
        });

        Ok(())
    }

    /// Callback for auction creation
    #[arcium_callback(encrypted_ix = "init_auction")]
    pub fn init_auction_callback(
        ctx: Context<InitAuctionCallback>,
        output: SignedComputationOutputs<InitAuctionOutput>,
    ) -> Result<()> {
        let _o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(_) => return Err(ErrorCode::ComputationFailed.into()),
        };

        emit!(AuctionInitialized {});

        Ok(())
    }

    // ============================================================
    // BIDDING
    // ============================================================

    /// Place an encrypted bid
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        computation_offset: u64,
        encrypted_bidder_id: [u8; 32],
        encrypted_amount: [u8; 32],
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        let auction = &ctx.accounts.auction;

        // Verify auction is still open
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < auction.end_time,
            ErrorCode::AuctionEnded
        );
        require!(!auction.is_finalized, ErrorCode::AuctionFinalized);

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Build bid arguments
        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(encrypted_bidder_id)
            .encrypted_u64(encrypted_amount)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![PlaceBidCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        emit!(BidPlaced {
            auction_id: auction.auction_id,
            bidder: ctx.accounts.bidder.key(),
        });

        Ok(())
    }

    /// Callback for bid placement
    #[arcium_callback(encrypted_ix = "place_bid")]
    pub fn place_bid_callback(
        ctx: Context<PlaceBidCallback>,
        output: SignedComputationOutputs<PlaceBidOutput>,
    ) -> Result<()> {
        let _o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(_) => return Err(ErrorCode::ComputationFailed.into()),
        };

        emit!(BidProcessed {});

        Ok(())
    }

    // ============================================================
    // AUCTION CLOSE
    // ============================================================

    /// Close the auction and reveal winner
    pub fn close_auction(
        ctx: Context<CloseAuction>,
        computation_offset: u64,
        pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        // Only authority can close
        require!(
            ctx.accounts.authority.key() == ctx.accounts.auction.authority,
            ErrorCode::Unauthorized
        );

        // Must be past end time
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= ctx.accounts.auction.end_time,
            ErrorCode::AuctionNotEnded
        );

        // Prevent double-close
        require!(
            !ctx.accounts.auction.is_finalized,
            ErrorCode::AuctionFinalized
        );

        // Capture auction_id before any mutable borrows
        let auction_id = ctx.accounts.auction.auction_id;

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        let args = ArgBuilder::new()
            .x25519_pubkey(pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8([0u8; 32])
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![CloseAuctionCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[],
            )?],
            1,
            0,
        )?;

        ctx.accounts.auction.is_finalized = true;

        emit!(AuctionClosing {
            auction_id,
        });

        Ok(())
    }

    /// Callback for auction close
    #[arcium_callback(encrypted_ix = "close_auction")]
    pub fn close_auction_callback(
        ctx: Context<CloseAuctionCallback>,
        output: SignedComputationOutputs<CloseAuctionOutput>,
    ) -> Result<()> {
        let _o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(out) => out,
            Err(_) => return Err(ErrorCode::ComputationFailed.into()),
        };

        emit!(AuctionFinalized {});

        Ok(())
    }
}

// ============================================================
// ACCOUNT STRUCTURES
// ============================================================

#[account]
#[derive(Default)]
pub struct Auction {
    pub auction_id: [u8; 32],
    pub authority: Pubkey,
    pub end_time: i64,
    pub min_bid: u64,
    pub is_finalized: bool,
    pub bump: u8,
}

impl Auction {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

// ============================================================
// CONTEXT STRUCTURES
// ============================================================

#[queue_computation_accounts("init_auction", payer)]
#[derive(Accounts)]
#[instruction(computation_offset: u64, auction_id: [u8; 32])]
pub struct InitAuction<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = Auction::SIZE,
        seeds = [b"auction", auction_id.as_ref()],
        bump
    )]
    pub auction: Account<'info, Auction>,
    #[account(
        init_if_needed,
        space = 9,
        payer = payer,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_AUCTION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("init_auction")]
#[derive(Accounts)]
pub struct InitAuctionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_INIT_AUCTION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[queue_computation_accounts("place_bid", bidder)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        init_if_needed,
        space = 9,
        payer = bidder,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PLACE_BID))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("place_bid")]
#[derive(Accounts)]
pub struct PlaceBidCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_PLACE_BID))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

#[queue_computation_accounts("close_auction", authority)]
#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CloseAuction<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub auction: Account<'info, Auction>,
    #[account(
        init_if_needed,
        space = 9,
        payer = authority,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLOSE_AUCTION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[callback_accounts("close_auction")]
#[derive(Accounts)]
pub struct CloseAuctionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLOSE_AUCTION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar
    pub instructions_sysvar: AccountInfo<'info>,
}

// ============================================================
// COMPUTATION DEFINITION INIT CONTEXTS
// ============================================================

#[init_computation_definition_accounts("init_auction", payer)]
#[derive(Accounts)]
pub struct InitAuctionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("place_bid", payer)]
#[derive(Accounts)]
pub struct InitPlaceBidCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

#[init_computation_definition_accounts("close_auction", payer)]
#[derive(Accounts)]
pub struct InitCloseAuctionCompDef<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, address = derive_mxe_pda!())]
    pub mxe_account: Box<Account<'info, MXEAccount>>,
    #[account(mut)]
    /// CHECK: comp_def_account
    pub comp_def_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_mxe_lut_pda!(mxe_account.lut_offset_slot))]
    /// CHECK: address_lookup_table
    pub address_lookup_table: UncheckedAccount<'info>,
    #[account(address = LUT_PROGRAM_ID)]
    /// CHECK: lut_program
    pub lut_program: UncheckedAccount<'info>,
    pub arcium_program: Program<'info, Arcium>,
    pub system_program: Program<'info, System>,
}

// ============================================================
// EVENTS
// ============================================================

#[event]
pub struct AuctionCreated {
    pub auction_id: [u8; 32],
    pub authority: Pubkey,
    pub end_time: i64,
    pub min_bid: u64,
}

#[event]
pub struct AuctionInitialized {}

#[event]
pub struct BidPlaced {
    pub auction_id: [u8; 32],
    pub bidder: Pubkey,
}

#[event]
pub struct BidProcessed {}

#[event]
pub struct AuctionClosing {
    pub auction_id: [u8; 32],
}

#[event]
pub struct AuctionFinalized {}

// ============================================================
// ERRORS
// ============================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Computation failed")]
    ComputationFailed,
    #[msg("Cluster not set")]
    ClusterNotSet,
    #[msg("Auction has ended")]
    AuctionEnded,
    #[msg("Auction not yet ended")]
    AuctionNotEnded,
    #[msg("Auction already finalized")]
    AuctionFinalized,
    #[msg("Unauthorized")]
    Unauthorized,
}
