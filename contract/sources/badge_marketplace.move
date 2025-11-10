module nft_checkin::badge_marketplace;

use nft_checkin::profiles::{Self, ProfileNFT, Badge, BadgeKey};
use std::string;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::event;
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::transfer_policy::{Self, TransferPolicy};
use sui::package;
use sui::display;
use sui::dynamic_field;
use sui::clock;
use sui::tx_context::sender;
use sui::table::{Self, Table};

/// 🏪 Marketplace Registry - quản lý toàn bộ marketplace
public struct MarketplaceRegistry has key {
    id: UID,
    deployer: address,
    total_listings: u64,
    royalty_bps: u64, // Basis points (100 = 1%)
    kiosk_owners: Table<address, bool>, // 🔒 Đảm bảo 1 ví = 1 kiosk
}

/// 🎫 One-time witness for package
public struct BADGE_MARKETPLACE has drop {}

/// 🛒 Badge Listing - thông tin badge đang được list
public struct BadgeListing has key, store {
    id: UID,
    seller: address,
    location_id: u64,
    price: u64,
    listed_at: u64,
    badge_object_id: ID, // ID của TradableBadge trong Kiosk
}

/// 📦 Badge Wrapper - wrap badge để có thể store trong Kiosk
public struct TradableBadge has key, store {
    id: UID,
    location_id: u64,
    location_name: string::String,
    description: string::String,
    image_url: string::String,
    rarity: u8,
    perfection: u64,
    created_at: u64,
    original_owner: address,
}

/// 📢 Events
public struct BadgeListed has copy, drop {
    listing_id: address,
    seller: address,
    location_id: u64,
    price: u64,
}

public struct BadgeSold has copy, drop {
    listing_id: address,
    seller: address,
    buyer: address,
    location_id: u64,
    price: u64,
    royalty_paid: u64,
}

public struct BadgeDelisted has copy, drop {
    listing_id: address,
    seller: address,
    location_id: u64,
}

/// ⚙️ Init marketplace
#[allow(lint(share_owned))]
fun init(otw: BADGE_MARKETPLACE, ctx: &mut tx_context::TxContext) {
    let deployer = sender(ctx);
    
    // 📦 Create Publisher
    let publisher = package::claim(otw, ctx);
    
    // 🎨 Setup Display for TradableBadge
    let mut display = display::new<TradableBadge>(&publisher, ctx);
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{location_name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{description}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
    display::add(&mut display, string::utf8(b"rarity"), string::utf8(b"{rarity}"));
    display::add(&mut display, string::utf8(b"perfection"), string::utf8(b"{perfection}"));
    display::add(&mut display, string::utf8(b"original_owner"), string::utf8(b"{original_owner}"));
    display::update_version(&mut display);
    
    // 🔐 Create Transfer Policy (simple version without custom rules for now)
    let (policy, policy_cap) = transfer_policy::new<TradableBadge>(&publisher, ctx);
    
    // 🏪 Create Registry
    let registry = MarketplaceRegistry {
        id: object::new(ctx),
        deployer,
        total_listings: 0,
        royalty_bps: 500, // 5% royalty mặc định
        kiosk_owners: table::new(ctx),
    };
    
    // 📤 Transfer objects
    transfer::public_transfer(publisher, deployer);
    transfer::public_transfer(display, deployer);
    transfer::public_share_object(policy);
    transfer::public_transfer(policy_cap, deployer);
    transfer::share_object(registry);
}

/// 🏪 Tạo Kiosk cho user để trade badges (chỉ được tạo 1 lần)
entry fun create_kiosk(
    registry: &mut MarketplaceRegistry,
    ctx: &mut tx_context::TxContext
) {
    let sender_addr = sender(ctx);
    
    // 🔒 Kiểm tra user đã có kiosk chưa
    assert!(!table::contains(&registry.kiosk_owners, sender_addr), 200); // Error: Already has a kiosk
    
    let (kiosk, cap) = kiosk::new(ctx);
    
    // 📝 Đánh dấu user đã có kiosk
    table::add(&mut registry.kiosk_owners, sender_addr, true);
    
    // Transfer kiosk ownership cap về user
    transfer::public_transfer(cap, sender(ctx));
    // Share kiosk để mọi người có thể xem và mua
    transfer::public_share_object(kiosk);
}

/// 📤 List badge để bán (extract từ Profile và list vào marketplace)
entry fun list_badge(
    profile: &mut ProfileNFT,
    registry: &mut MarketplaceRegistry,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    location_id: u64,
    price: u64,
    clock: &clock::Clock,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    // 🔒 Verify ownership
    assert!(profiles::owner(profile) == sender_addr, 1);
    assert!(kiosk::has_access(kiosk, cap), 3);
    
    // 🎯 Extract badge từ Profile (as dynamic field)
    let badge_key = profiles::new_badge_key(location_id);
    let badge = dynamic_field::remove<BadgeKey, Badge>(profiles::profile_uid_mut(profile), badge_key);
    
    // 📦 Get badge data
    let (location_name, description, image_url, rarity, perfection, created_at) = profiles::unpack_badge(badge);
    
    // 🏆 CHỈ Epic (2) hoặc Legendary (3) mới được trade
    assert!(rarity >= 2, 4); // Error code 4: Badge rarity too low for trading
    
    // 📦 Wrap badge thành TradableBadge
    let tradable = TradableBadge {
        id: object::new(ctx),
        location_id,
        location_name,
        description,
        image_url,
        rarity,
        perfection,
        created_at,
        original_owner: sender_addr,
    };
    
    let tradable_id = object::id(&tradable);
    
    // 🛒 Place vào Kiosk và list
    kiosk::place(kiosk, cap, tradable);
    kiosk::list<TradableBadge>(kiosk, cap, tradable_id, price);
    
    // 📝 Tạo listing record
    let listing = BadgeListing {
        id: object::new(ctx),
        seller: sender_addr,
        location_id,
        price,
        listed_at: clock::timestamp_ms(clock),
        badge_object_id: tradable_id,
    };
    
    let listing_addr = object::uid_to_address(&listing.id);
    
    registry.total_listings = registry.total_listings + 1;
    
    // 📢 Emit event
    event::emit(BadgeListed {
        listing_id: listing_addr,
        seller: sender_addr,
        location_id,
        price,
    });
    
    transfer::share_object(listing);
}

/// 💰 Mua badge từ marketplace
entry fun buy_badge(
    profile: &mut ProfileNFT,
    registry: &MarketplaceRegistry,
    listing: BadgeListing,
    seller_kiosk: &mut Kiosk,
    policy: &TransferPolicy<TradableBadge>,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let buyer_addr = sender(ctx);
    let BadgeListing { 
        id, 
        seller, 
        location_id: _location_id, 
        price, 
        listed_at: _, 
        badge_object_id 
    } = listing;
    let listing_addr = object::uid_to_address(&id);
    object::delete(id);
    
    // 💸 Verify payment
    let paid_amount = coin::value(&payment);
    assert!(paid_amount >= price, 2);
    
    // 🛒 Purchase từ kiosk với Transfer Policy
    let (badge, request) = kiosk::purchase<TradableBadge>(
        seller_kiosk,
        badge_object_id,
        payment
    );
    
    // ✅ Confirm transfer policy - Kiosk automatically handles payment distribution
    let (_item, _paid_amount, _from) = transfer_policy::confirm_request(policy, request);
    
    // 💎 Calculate royalty for event (estimation)
    let royalty_amount = (price * registry.royalty_bps) / 10000;
    
    // 📦 Unwrap badge và add vào Profile của buyer
    let TradableBadge {
        id: badge_id,
        location_id,
        location_name,
        description,
        image_url,
        rarity,
        perfection,
        created_at,
        original_owner: _,
    } = badge;
    
    object::delete(badge_id);
    
    // 🎯 Create new badge và add vào Profile
    let new_badge = profiles::new_badge(
        location_name,
        description,
        image_url,
        rarity,
        perfection,
        created_at
    );
    
    let badge_key = profiles::new_badge_key(location_id);
    let profile_uid = profiles::profile_uid_mut(profile);
    
    // Ghi đè badge cũ nếu có
    if (dynamic_field::exists_(profile_uid, badge_key)) {
        dynamic_field::remove<BadgeKey, Badge>(profile_uid, badge_key);
    };
    
    dynamic_field::add(profile_uid, badge_key, new_badge);
    
    // 📢 Emit event
    event::emit(BadgeSold {
        listing_id: listing_addr,
        seller,
        buyer: buyer_addr,
        location_id,
        price,
        royalty_paid: royalty_amount,
    });
}

/// ❌ Delist badge (seller rút lại)
entry fun delist_badge(
    profile: &mut ProfileNFT,
    listing: BadgeListing,
    kiosk: &mut Kiosk,
    cap: &KioskOwnerCap,
    ctx: &tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    let BadgeListing { 
        id, 
        seller, 
        location_id: _location_id, 
        price: _, 
        listed_at: _, 
        badge_object_id 
    } = listing;
    let listing_addr = object::uid_to_address(&id);
    
    // 🔒 Verify ownership
    assert!(seller == sender_addr, 1);
    assert!(kiosk::has_access(kiosk, cap), 3);
    
    object::delete(id);
    
    // 🛒 Delist và take từ kiosk
    kiosk::delist<TradableBadge>(kiosk, cap, badge_object_id);
    let badge = kiosk::take<TradableBadge>(kiosk, cap, badge_object_id);
    
    // 📦 Unwrap và trả về Profile
    let TradableBadge {
        id: badge_id,
        location_id,
        location_name,
        description,
        image_url,
        rarity,
        perfection,
        created_at,
        original_owner: _,
    } = badge;
    
    object::delete(badge_id);
    
    let restored_badge = profiles::new_badge(
        location_name,
        description,
        image_url,
        rarity,
        perfection,
        created_at
    );
    
    let badge_key = profiles::new_badge_key(location_id);
    let profile_uid = profiles::profile_uid_mut(profile);
    dynamic_field::add(profile_uid, badge_key, restored_badge);
    
    // 📢 Emit event
    event::emit(BadgeDelisted {
        listing_id: listing_addr,
        seller: sender_addr,
        location_id,
    });
}

/// 🔧 Update royalty rate (chỉ deployer)
entry fun update_royalty(
    registry: &mut MarketplaceRegistry,
    new_royalty_bps: u64,
    ctx: &tx_context::TxContext,
) {
    assert!(sender(ctx) == registry.deployer, 100);
    assert!(new_royalty_bps <= 2000, 101); // Max 20%
    registry.royalty_bps = new_royalty_bps;
}

/// 📊 View functions
public fun total_listings(registry: &MarketplaceRegistry): u64 {
    registry.total_listings
}

public fun royalty_bps(registry: &MarketplaceRegistry): u64 {
    registry.royalty_bps
}

public fun has_kiosk(registry: &MarketplaceRegistry, user: address): bool {
    table::contains(&registry.kiosk_owners, user)
}

public fun listing_price(listing: &BadgeListing): u64 {
    listing.price
}

public fun listing_seller(listing: &BadgeListing): address {
    listing.seller
}

public fun listing_location_id(listing: &BadgeListing): u64 {
    listing.location_id
}

public fun listing_badge_object_id(listing: &BadgeListing): ID {
    listing.badge_object_id
}

/// 🔍 View functions for TradableBadge (để FE hiển thị badge trong kiosk)
public fun tradable_badge_location_id(badge: &TradableBadge): u64 {
    badge.location_id
}

public fun tradable_badge_location_name(badge: &TradableBadge): string::String {
    badge.location_name
}

public fun tradable_badge_description(badge: &TradableBadge): string::String {
    badge.description
}

public fun tradable_badge_image_url(badge: &TradableBadge): string::String {
    badge.image_url
}

public fun tradable_badge_rarity(badge: &TradableBadge): u8 {
    badge.rarity
}

public fun tradable_badge_perfection(badge: &TradableBadge): u64 {
    badge.perfection
}

public fun tradable_badge_created_at(badge: &TradableBadge): u64 {
    badge.created_at
}

public fun tradable_badge_original_owner(badge: &TradableBadge): address {
    badge.original_owner
}

// ==================== Test-only functions ====================

#[test_only]
/// Initialize marketplace for testing
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    init(BADGE_MARKETPLACE {}, ctx);
}
