module nft_checkin::memory_marketplace;

use nft_checkin::memory_nft::{ MemoryNFT};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::event;
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::transfer_policy::{Self, TransferPolicy};
use sui::package;
use sui::clock::{Self, Clock};
use sui::tx_context::sender;
use sui::table::{Self, Table};

/// 🏪 Memory Marketplace Registry
public struct MemoryMarketplaceRegistry has key {
    id: UID,
    deployer: address,
    total_listings: u64,
    royalty_bps: u64, // Creator royalty (basis points)
    user_kiosks: Table<address, ID>, // Track 1 kiosk per user
}

/// 🎫 One-time witness
public struct MEMORY_MARKETPLACE has drop {}

/// 🛒 Memory Listing
public struct MemoryListing has key, store {
    id: UID,
    seller: address,
    memory_id: ID,
    price: u64,
    listed_at: u64,
}

/// 📢 Events
public struct MemoryListed has copy, drop {
    listing_id: address,
    seller: address,
    memory_id: ID,
    price: u64,
}

public struct MemorySold has copy, drop {
    listing_id: address,
    seller: address,
    buyer: address,
    memory_id: ID,
    price: u64,
    royalty_paid: u64,
}

public struct MemoryDelisted has copy, drop {
    listing_id: address,
    seller: address,
    memory_id: ID,
}

/// ⚙️ Init
#[allow(lint(share_owned))]
fun init(otw: MEMORY_MARKETPLACE, ctx: &mut tx_context::TxContext) {
    let deployer = sender(ctx);
    
    // 📦 Create Publisher
    let publisher = package::claim(otw, ctx);
    
    // 🔐 Create Transfer Policy
    let (policy, policy_cap) = transfer_policy::new<MemoryNFT>(&publisher, ctx);
    
    // 🏪 Create Registry
    let registry = MemoryMarketplaceRegistry {
        id: object::new(ctx),
        deployer,
        total_listings: 0,
        royalty_bps: 250, // 2.5% royalty cho creator
        user_kiosks: table::new<address, ID>(ctx),
    };
    
    // 📤 Transfer objects
    transfer::public_transfer(publisher, deployer);
    transfer::public_share_object(policy);
    transfer::public_transfer(policy_cap, deployer);
    transfer::share_object(registry);
}

/// 🆕 Helper function to create a new Kiosk
/// Creates and transfers Kiosk + KioskOwnerCap to sender
/// Giới hạn: User chỉ có thể tạo 1 kiosk duy nhất
public fun create_kiosk(
    registry: &mut MemoryMarketplaceRegistry,
    ctx: &mut TxContext
) {
    let user = sender(ctx);
    
    // Check: User đã có kiosk chưa?
    assert!(!table::contains(&registry.user_kiosks, user), 1001); // Error: Already has a kiosk
    
    // Create kiosk
    let (kiosk, cap) = kiosk::new(ctx);
    let kiosk_id = object::id(&kiosk);
    
    // Track user's kiosk in registry
    table::add(&mut registry.user_kiosks, user, kiosk_id);
    
    // Transfer cap to user
    transfer::public_transfer(cap, user);
    
    // Share kiosk
    transfer::public_share_object(kiosk);
}

/// 📤 List Memory NFT để bán
entry fun list_memory(
    registry: &mut MemoryMarketplaceRegistry,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    memory: MemoryNFT,
    price: u64,
    clock: &Clock,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    // 🔒 Verify kiosk ownership
    assert!(kiosk::has_access(kiosk, cap), 3);
    
    let memory_id = object::id(&memory);
    
    // 🛒 Place vào Kiosk và list
    kiosk::place(kiosk, cap, memory);
    kiosk::list<MemoryNFT>(kiosk, cap, memory_id, price);
    
    // 📝 Tạo listing record
    let listing = MemoryListing {
        id: object::new(ctx),
        seller: sender_addr,
        memory_id,
        price,
        listed_at: clock::timestamp_ms(clock),
    };
    
    let listing_addr = object::uid_to_address(&listing.id);
    
    registry.total_listings = registry.total_listings + 1;
    
    // 📢 Emit event
    event::emit(MemoryListed {
        listing_id: listing_addr,
        seller: sender_addr,
        memory_id,
        price,
    });
    
    transfer::share_object(listing);
}

/// 💰 Mua Memory NFT
entry fun buy_memory(
    registry: &MemoryMarketplaceRegistry,
    listing: MemoryListing,
    seller_kiosk: &mut Kiosk,
    buyer_kiosk: &mut Kiosk,
    buyer_cap: &KioskOwnerCap,
    policy: &TransferPolicy<MemoryNFT>,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let buyer_addr = sender(ctx);
    
    let MemoryListing { 
        id, 
        seller, 
        memory_id,
        price, 
        listed_at: _,
    } = listing;
    let listing_addr = object::uid_to_address(&id);
    object::delete(id);
    
    // 💸 Verify payment
    let paid_amount = coin::value(&payment);
    assert!(paid_amount >= price, 2);
    
    // 🛒 Purchase từ seller's kiosk
    let (memory, request) = kiosk::purchase<MemoryNFT>(
        seller_kiosk,
        memory_id,
        payment
    );
    
    // ✅ Confirm transfer policy
    let (_item, _paid, _from) = transfer_policy::confirm_request(policy, request);
    
    // 💎 Calculate royalty
    let royalty_amount = (price * registry.royalty_bps) / 10000;
    
    // 🎁 Place vào buyer's kiosk (hoặc transfer trực tiếp)
    // Option 1: Place vào kiosk của buyer
    kiosk::place(buyer_kiosk, buyer_cap, memory);
    
    // Option 2: Nếu muốn transfer trực tiếp, uncomment dòng dưới và comment dòng trên
    // transfer::public_transfer(memory, buyer_addr);
    
    // 📢 Emit event
    event::emit(MemorySold {
        listing_id: listing_addr,
        seller,
        buyer: buyer_addr,
        memory_id,
        price,
        royalty_paid: royalty_amount,
    });
}

/// 💰 Mua Memory NFT và transfer trực tiếp (không vào kiosk)
entry fun buy_memory_direct(
    registry: &MemoryMarketplaceRegistry,
    listing: MemoryListing,
    seller_kiosk: &mut Kiosk,
    policy: &TransferPolicy<MemoryNFT>,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let buyer_addr = sender(ctx);
    
    let MemoryListing { 
        id, 
        seller, 
        memory_id,
        price, 
        listed_at: _,
    } = listing;
    let listing_addr = object::uid_to_address(&id);
    object::delete(id);
    
    // 💸 Verify payment
    let paid_amount = coin::value(&payment);
    assert!(paid_amount >= price, 2);
    
    // 🛒 Purchase
    let (memory, request) = kiosk::purchase<MemoryNFT>(
        seller_kiosk,
        memory_id,
        payment
    );
    
    // ✅ Confirm
    let (_item, _paid, _from) = transfer_policy::confirm_request(policy, request);
    
    let royalty_amount = (price * registry.royalty_bps) / 10000;
    
    // 🎁 Transfer trực tiếp cho buyer
    transfer::public_transfer(memory, buyer_addr);
    
    // 📢 Emit event
    event::emit(MemorySold {
        listing_id: listing_addr,
        seller,
        buyer: buyer_addr,
        memory_id,
        price,
        royalty_paid: royalty_amount,
    });
}

/// ❌ Delist Memory NFT
entry fun delist_memory(
    listing: MemoryListing,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    ctx: &tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    let MemoryListing { 
        id, 
        seller, 
        memory_id,
        price: _, 
        listed_at: _,
    } = listing;
    let listing_addr = object::uid_to_address(&id);
    
    // 🔒 Verify ownership
    assert!(seller == sender_addr, 1);
    assert!(kiosk::has_access(kiosk, cap), 3);
    
    object::delete(id);
    
    // 🛒 Delist và take từ kiosk
    kiosk::delist<MemoryNFT>(kiosk, cap, memory_id);
    let memory = kiosk::take<MemoryNFT>(kiosk, cap, memory_id);
    
    // 🎁 Transfer về seller
    transfer::public_transfer(memory, sender_addr);
    
    // 📢 Emit event
    event::emit(MemoryDelisted {
        listing_id: listing_addr,
        seller: sender_addr,
        memory_id,
    });
}

/// 🔧 Update royalty rate (admin only)
entry fun update_royalty(
    registry: &mut MemoryMarketplaceRegistry,
    new_royalty_bps: u64,
    ctx: &tx_context::TxContext,
) {
    assert!(sender(ctx) == registry.deployer, 100);
    assert!(new_royalty_bps <= 1000, 101); // Max 10%
    registry.royalty_bps = new_royalty_bps;
}

/// 📊 View functions
public fun total_listings(registry: &MemoryMarketplaceRegistry): u64 {
    registry.total_listings
}

public fun royalty_bps(registry: &MemoryMarketplaceRegistry): u64 {
    registry.royalty_bps
}

public fun listing_price(listing: &MemoryListing): u64 {
    listing.price
}

public fun listing_seller(listing: &MemoryListing): address {
    listing.seller
}

public fun listing_memory_id(listing: &MemoryListing): ID {
    listing.memory_id
}

// ==================== Test-only functions ====================

#[test_only]
/// Initialize for testing
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    init(MEMORY_MARKETPLACE {}, ctx);
}
