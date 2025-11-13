module nft_checkin::profiles;

use nft_checkin::utils_random;
use std::string;
use sui::clock;
use sui::coin::{Self, Coin};
use sui::display;
use sui::dynamic_field as df;
use sui::event;
use sui::package;
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::vec_set::{Self, VecSet};
use sui::tx_context::sender;

public struct ProfileNFT has key {
    id: UID,
    owner: address,
    name: string::String,
    bio: string::String,
    avatar_url: string::String,
    social_links: vector<string::String>,
    country: string::String,
    created_at: u64,
    claimed_badges: vector<ClaimedBadgeInfo>, // 📍 Danh sách badges đã claim + stats
    badge_count: u64,                         // 🏅 Số unique locations đã claim
    total_claims: u64,                        // 📊 Tổng số lần claim (include reclaim)
    is_verified: bool,                        // ✅ Trạng thái verify
    verify_votes: u64,                        // 🗳️ Số vote nhận được
}

public struct ProfileRegistry has key {
    id: UID,
    deployer: address,
    total_profiles: u64,
    minted_users: Table<address, bool>,
    verify_threshold: u64, // 🎯 Số vote cần để verify (mặc định 3)
}

public struct PROFILES has drop {}

public struct BadgeKey has copy, drop, store { location_id: u64 }

public struct Badge has drop, store {
    location_name: string::String,
    description: string::String,
    image_url: string::String,
    rarity: u8,
    perfection: u64,
    created_at: u64,
}

/// 📍 Claimed Badge Info - Lưu thông tin badge đã claim (dùng để hiển thị trong profile)
public struct ClaimedBadgeInfo has copy, drop, store {
    location_id: u64,
    location_name: string::String,
    image_url: string::String,
    rarity: u8,
    perfection: u64,
    created_at: u64,
}

public struct LocationRegistry has key {
    id: UID,
    deployer: address,
    total_locations: u64,
    locations: Table<u64, BadgeTemplate>,
}

public struct BadgeTemplate has copy, drop, store {
    location_name: string::String,
    description: string::String,
    latitude: string::String, // 🗺️ Thêm vĩ độ
    longitude: string::String, // 🗺️ Thêm kinh độ
    image_common: string::String,
    image_rare: string::String,
    image_epic: string::String,
    image_legendary: string::String,
}

public struct ProfileCreated has copy, drop {
    profile_id: address,
    owner: address,
    name: string::String,
}

public struct BadgeClaimed has copy, drop {
    profile_id: address,
    owner: address,
    location_id: u64,

}

/// 🎰 Kết quả quay huy hiệu (dùng cho frontend hiển thị)
public struct BadgeGachaResult has copy, drop {
    owner: address,
    location_id: u64,
    rarity: u8,
    perfection: u64,
    timestamp: u64,
}

/// ✅ Events cho verify system
public struct ProfileVoted has copy, drop {
    voter: address,
    profile_owner: address,
    profile_id: address,
    new_vote_count: u64,
}

public struct ProfileVerified has copy, drop {
    profile_owner: address,
    profile_id: address,
    total_votes: u64,
}

/// 🗳️ Voter Registry - Track số lượt vote của mỗi user
public struct VoterRegistry has key {
    id: UID,
    // Map: voter_address -> VecSet<profile_addresses đã vote>
    votes_given: Table<address, VecSet<address>>,
}

fun init(otw: PROFILES, ctx: &mut tx_context::TxContext) {
    let publisher = package::claim(otw, ctx);
    let mut display = display::new<ProfileNFT>(&publisher, ctx);
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{bio}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{avatar_url}"));
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"Memory Mint"));
    display::update_version(&mut display);

    let deployer = sender(ctx);
    let registry = ProfileRegistry {
        id: object::new(ctx),
        deployer,
        total_profiles: 0,
        minted_users: table::new(ctx),
        verify_threshold: 3, // Mặc định cần 3 votes để verify
    };

    let voter_registry = VoterRegistry {
        id: object::new(ctx),
        votes_given: table::new(ctx),
    };

    let location_registry = LocationRegistry {
        id: object::new(ctx),
        deployer,
        total_locations: 0,
        locations: table::new(ctx),
    };

    transfer::share_object(registry);
    transfer::share_object(voter_registry);
    transfer::share_object(location_registry);
    transfer::public_transfer(publisher, deployer);
    transfer::public_transfer(display, deployer);
}

entry fun mint_profile(
    registry: &mut ProfileRegistry,
    name: string::String,
    bio: string::String,
    avatar_url: string::String,
    social_links: vector<string::String>,
    country: string::String,
    payment: Coin<SUI>,
    clock: &clock::Clock,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    assert!(!table::contains(&registry.minted_users, sender_addr), 1);

    let fee_amount = 10_000_000;
    let balance = coin::value(&payment);
    assert!(balance >= fee_amount, 10);

    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, fee_amount, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, sender_addr);

    table::add(&mut registry.minted_users, sender_addr, true);
    registry.total_profiles = registry.total_profiles + 1;

    let profile_nft = ProfileNFT {
        id: object::new(ctx),
        owner: sender_addr,
        name,
        bio,
        avatar_url,
        social_links,
        country,
        created_at: clock::timestamp_ms(clock),
        claimed_badges: vector::empty<ClaimedBadgeInfo>(),
        badge_count: 0,
        total_claims: 0,
        is_verified: false,
        verify_votes: 0,
    };

    event::emit(ProfileCreated {
        profile_id: object::uid_to_address(&profile_nft.id),
        owner: sender_addr,
        name: profile_nft.name,
    });

    transfer::transfer(profile_nft, sender_addr);
}

entry fun add_location(
    registry: &mut LocationRegistry,
    name: string::String,
    description: string::String,
    latitude: string::String,
    longitude: string::String,
    image_common: string::String,
    image_rare: string::String,
    image_epic: string::String,
    image_legendary: string::String,
    ctx: &tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    assert!(sender_addr == registry.deployer, 100);
    let id = registry.total_locations;
    let template = BadgeTemplate {
        location_name: name,
        description,
        latitude,
        longitude,
        image_common,
        image_rare,
        image_epic,
        image_legendary,
    };
    table::add(&mut registry.locations, id, template);
    registry.total_locations = id + 1;
}

/// 📝 Update profile information (phí 0.05 SUI)
entry fun update_profile(
    registry: &ProfileRegistry,
    profile: &mut ProfileNFT,
    new_name: string::String,
    new_bio: string::String,
    new_avatar_url: string::String,
    new_social_links: vector<string::String>,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    // 🔒 Chỉ owner mới update được
    assert!(profile.owner == sender_addr, 1);
    
    // 💰 Thu phí update = 0.05 SUI
    let fee_amount = 50_000_000; // 0.05 SUI = 5 * 10^7 MIST
    let balance = coin::value(&payment);
    assert!(balance >= fee_amount, 10);
    
    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, fee_amount, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, sender_addr);
    
    // ✅ Update profile fields
    profile.name = new_name;
    profile.bio = new_bio;
    profile.avatar_url = new_avatar_url;
    profile.social_links = new_social_links;
}

fun image_for_rarity(rarity: u8, template: &BadgeTemplate): string::String {
    if (rarity == 0) {
        template.image_common
    } else if (rarity == 1) {
        template.image_rare
    } else if (rarity == 2) {
        template.image_epic
    } else {
        template.image_legendary
    }
}

/// 🏅 Claim (Gacha) badge cho 1 địa điểm
entry fun claim_badge(
    profile: &mut ProfileNFT,
    registry: &LocationRegistry,
    location_id: u64,
    payment: Coin<SUI>,
    clock: &clock::Clock,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    assert!(profile.owner == sender_addr, 1);

    // 💰 Thu phí claim gacha = 0.01 SUI
    let fee_amount = 10_000_000; // 0.01 SUI = 10^7 MIST
    let balance = coin::value(&payment);
    assert!(balance >= fee_amount, 10);

    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, fee_amount, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, sender_addr);

    // 🎲 Random hóa độ hiếm và độ hoàn hảo
    let template = table::borrow(&registry.locations, location_id);
    let rarity_seed = utils_random::random_number(ctx, 0, 99);
    let rarity_level: u8 = if (rarity_seed < 60) { 0 } else if (rarity_seed < 85) { 1 } else if (
        rarity_seed < 97
    ) { 2 } else { 3 };
    let perfection = utils_random::random_number(ctx, 250, 1000);
    let img_url = image_for_rarity(rarity_level, template);

    // 🧱 Tạo badge mới
    let badge = Badge {
        location_name: template.location_name,
        description: template.description,
        image_url: img_url,
        rarity: rarity_level,
        perfection,
        created_at: clock::timestamp_ms(clock),
    };

    let key = BadgeKey { location_id };

    // 🧱 Ghi đè badge cũ (nếu có) - reclaim sẽ update badge
    let is_new_badge = !df::exists_(&profile.id, key);
    if (!is_new_badge) {
        df::remove<BadgeKey, Badge>(&mut profile.id, key);
        // 🔄 Reclaim: xóa old info từ claimed_badges
        let count = vector::length(&profile.claimed_badges);
        let mut i = 0;
        while (i < count) {
            let badge_info = vector::borrow(&profile.claimed_badges, i);
            if (badge_info.location_id == location_id) {
                let _ = vector::remove(&mut profile.claimed_badges, i);
                break
            };
            i = i + 1;
        };
    };
    df::add<BadgeKey, Badge>(&mut profile.id, key, badge);

    // 📊 Cập nhật badge_count và claimed_badges
    if (is_new_badge) {
        profile.badge_count = profile.badge_count + 1;
    };

    // 📍 Luôn thêm/update badge info trong claimed_badges
    let badge_info = ClaimedBadgeInfo {
        location_id,
        location_name: template.location_name,
        image_url: img_url,
        rarity: rarity_level,
        perfection,
        created_at: clock::timestamp_ms(clock),
    };
    vector::push_back(&mut profile.claimed_badges, badge_info);

    // 📈 Luôn cộng total_claims (mỗi lần claim hoặc reclaim)
    profile.total_claims = profile.total_claims + 1;

    // 🔔 Emit event GachaResult để frontend hiển thị kết quả quay
    event::emit(BadgeGachaResult {
        owner: sender_addr,
        location_id,
        rarity: rarity_level,
        perfection,
        timestamp: clock::timestamp_ms(clock),
    });

    // 🔔 Event chính thức ghi nhận (dành cho indexer / backend)
    event::emit(BadgeClaimed {
        profile_id: object::uid_to_address(&profile.id),
        owner: sender_addr,
        location_id,
    });
}

/// 🗳️ Vote để verify profile (mỗi user tối đa 2 votes, phí 0.02 SUI)
entry fun vote_for_profile(
    registry: &ProfileRegistry,
    voter_registry: &mut VoterRegistry,
    target_profile: &mut ProfileNFT,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let voter_addr = sender(ctx);
    let target_addr = target_profile.owner;
    let profile_id = object::uid_to_address(&target_profile.id);
    
    // 🚫 Không thể vote cho chính mình
    assert!(voter_addr != target_addr, 300); // Error: Cannot vote for yourself
    
    // 💰 Thu phí vote = 0.02 SUI
    let fee_amount = 20_000_000; // 0.02 SUI = 2 * 10^7 MIST
    let balance = coin::value(&payment);
    assert!(balance >= fee_amount, 10);
    
    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, fee_amount, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, voter_addr);
    
    // 📊 Check số lượt vote đã dùng
    if (!table::contains(&voter_registry.votes_given, voter_addr)) {
        table::add(&mut voter_registry.votes_given, voter_addr, vec_set::empty());
    };
    
    let voter_votes = table::borrow_mut(&mut voter_registry.votes_given, voter_addr);
    
    // 🚫 Đã vote cho profile này rồi
    assert!(!vec_set::contains(voter_votes, &target_addr), 301); // Error: Already voted for this profile
    
    // 🚫 Đã vote tối đa 2 người
    assert!(vec_set::length(voter_votes) < 2, 302); // Error: Max 2 votes per user
    
    // ✅ Thêm vote
    vec_set::insert(voter_votes, target_addr);
    target_profile.verify_votes = target_profile.verify_votes + 1;
    
    // 📢 Emit event
    event::emit(ProfileVoted {
        voter: voter_addr,
        profile_owner: target_addr,
        profile_id,
        new_vote_count: target_profile.verify_votes,
    });
}

/// ✅ Claim verify status (owner tự set sau khi đủ votes, phí 0.02 SUI)
entry fun claim_verification(
    registry: &ProfileRegistry,
    profile: &mut ProfileNFT,
    payment: Coin<SUI>,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    let profile_id = object::uid_to_address(&profile.id);
    
    // 🔒 Chỉ owner mới claim được
    assert!(profile.owner == sender_addr, 1);
    
    // 🚫 Đã verify rồi
    assert!(!profile.is_verified, 303); // Error: Already verified
    
    // 📊 Check đủ votes chưa
    assert!(profile.verify_votes >= registry.verify_threshold, 304); // Error: Not enough votes
    
    // 💰 Thu phí claim verification = 0.02 SUI
    let fee_amount = 20_000_000; // 0.02 SUI = 2 * 10^7 MIST
    let balance = coin::value(&payment);
    assert!(balance >= fee_amount, 10);
    
    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, fee_amount, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, sender_addr);
    
    // ✅ Set verified
    profile.is_verified = true;
    
    // 📢 Emit event
    event::emit(ProfileVerified {
        profile_owner: sender_addr,
        profile_id,
        total_votes: profile.verify_votes,
    });
}

/// 🔧 Admin update verify threshold
entry fun update_verify_threshold(
    registry: &mut ProfileRegistry,
    new_threshold: u64,
    ctx: &tx_context::TxContext,
) {
    assert!(sender(ctx) == registry.deployer, 100);
    assert!(new_threshold > 0 && new_threshold <= 10, 305); // Max 10 votes
    registry.verify_threshold = new_threshold;
}

public fun total_profiles(registry: &ProfileRegistry): u64 { registry.total_profiles }

public fun has_minted(registry: &ProfileRegistry, user: address): bool {
    table::contains(&registry.minted_users, user)
}

public fun verify_threshold(registry: &ProfileRegistry): u64 {
    registry.verify_threshold
}

/// 🗳️ View functions cho verify system
public fun is_verified(profile: &ProfileNFT): bool {
    profile.is_verified
}

public fun verify_votes(profile: &ProfileNFT): u64 {
    profile.verify_votes
}

public fun votes_given_count(voter_registry: &VoterRegistry, voter: address): u64 {
    if (table::contains(&voter_registry.votes_given, voter)) {
        vec_set::length(table::borrow(&voter_registry.votes_given, voter))
    } else {
        0
    }
}

public fun has_voted_for(voter_registry: &VoterRegistry, voter: address, target: address): bool {
    if (table::contains(&voter_registry.votes_given, voter)) {
        vec_set::contains(table::borrow(&voter_registry.votes_given, voter), &target)
    } else {
        false
    }
}

// 🔧 Helper functions for marketplace

/// Get profile owner
public fun owner(profile: &ProfileNFT): address {
    profile.owner
}

/// Get profile UID (for dynamic field access)
public fun profile_uid_mut(profile: &mut ProfileNFT): &mut UID {
    &mut profile.id
}

/// Check if badge exists
public fun has_badge(profile: &ProfileNFT, location_id: u64): bool {
    let key = BadgeKey { location_id };
    df::exists_(&profile.id, key)
}

/// Borrow badge immutably
public fun borrow_badge(profile: &ProfileNFT, location_id: u64): &Badge {
    let key = BadgeKey { location_id };
    df::borrow(&profile.id, key)
}

/// Borrow badge mutably
public fun borrow_badge_mut(profile: &mut ProfileNFT, location_id: u64): &mut Badge {
    let key = BadgeKey { location_id };
    df::borrow_mut(&mut profile.id, key)
}

/// Badge getters
public fun badge_location_name(badge: &Badge): string::String {
    badge.location_name
}

public fun badge_description(badge: &Badge): string::String {
    badge.description
}

public fun badge_image_url(badge: &Badge): string::String {
    badge.image_url
}

public fun badge_rarity(badge: &Badge): u8 {
    badge.rarity
}

public fun badge_perfection(badge: &Badge): u64 {
    badge.perfection
}

public fun badge_created_at(badge: &Badge): u64 {
    badge.created_at
}

/// Get badge count
public fun badge_count(profile: &ProfileNFT): u64 {
    profile.badge_count
}

/// Get total claims (mỗi lần claim hoặc reclaim)
public fun total_claims(profile: &ProfileNFT): u64 {
    profile.total_claims
}

/// Get claimed badges với stats (location_id, rarity, perfection)
public fun claimed_badges(profile: &ProfileNFT): vector<ClaimedBadgeInfo> {
    profile.claimed_badges
}

/// Get total locations
public fun total_locations(registry: &LocationRegistry): u64 {
    registry.total_locations
}

// ==================== Test-only functions ====================

#[test_only]
/// Initialize for testing
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    init(PROFILES {}, ctx);
}

#[test_only]
/// Create location registry for testing
public fun create_location_registry(ctx: &mut tx_context::TxContext) {
    let deployer = tx_context::sender(ctx);
    let registry = LocationRegistry {
        id: object::new(ctx),
        deployer,
        total_locations: 0,
        locations: table::new(ctx),
    };
    transfer::share_object(registry);
}
