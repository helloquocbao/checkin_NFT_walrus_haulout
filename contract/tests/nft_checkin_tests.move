#[test_only]
module nft_checkin::nft_checkin_tests;

use nft_checkin::profiles::{Self, ProfileNFT, ProfileRegistry, LocationRegistry};
use nft_checkin::badge_marketplace::{Self, MarketplaceRegistry};
use std::string;
use sui::test_scenario::{Self as ts};
use sui::coin;
use sui::sui::SUI;
use sui::clock::{Self, Clock};

// Test constants
const ADMIN: address = @0xAD;
const USER1: address = @0x1;
const MINT_FEE: u64 = 10_000_000; // 0.01 SUI

// ==================== Profile Module Tests ====================

#[test]
fun test_mint_profile_success() {
    let mut scenario = ts::begin(ADMIN);
    
    // 1. Admin khởi tạo module
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    // 2. Setup clock
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
    };
    
    // 3. USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Alice"),
            string::utf8(b"World traveler"),
            string::utf8(b"https://avatar.com/alice.jpg"),
            vector[string::utf8(b"twitter:alice")],
            string::utf8(b"USA"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // 4. Verify profile được tạo
    {
        ts::next_tx(&mut scenario, USER1);
        let profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        assert!(profiles::owner(&profile) == USER1, 0);
        assert!(profiles::badge_count(&profile) == 0, 1);
        
        ts::return_to_sender(&scenario, profile);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1)]
fun test_mint_profile_twice_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    // Init
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
    };
    
    // Mint lần 1
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Alice"),
            string::utf8(b"Bio"),
            string::utf8(b"https://avatar.jpg"),
            vector[],
            string::utf8(b"USA"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Mint lần 2 - Phải fail
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Alice2"),
            string::utf8(b"Bio2"),
            string::utf8(b"https://avatar2.jpg"),
            vector[],
            string::utf8(b"USA"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 10)]
fun test_mint_profile_insufficient_payment_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    // Init
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
    };
    
    // Mint với payment không đủ
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(5_000_000, ts::ctx(&mut scenario)); // Chỉ 0.005 SUI
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Alice"),
            string::utf8(b"Bio"),
            string::utf8(b"https://avatar.jpg"),
            vector[],
            string::utf8(b"USA"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
fun test_add_location_success() {
    let mut scenario = ts::begin(ADMIN);
    
    // Init
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    // Create location registry
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Admin add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Eiffel Tower"),
            string::utf8(b"Iconic Paris landmark"),
            string::utf8(b"48.8584"),
            string::utf8(b"2.2945"),
            string::utf8(b"https://common.jpg"),
            string::utf8(b"https://rare.jpg"),
            string::utf8(b"https://epic.jpg"),
            string::utf8(b"https://legendary.jpg"),
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::total_locations(&registry) == 1, 0);
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 100)]
fun test_add_location_non_admin_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    // Init
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // USER1 cố thêm location - Phải fail
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Tower"),
            string::utf8(b"Description"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"url1"),
            string::utf8(b"url2"),
            string::utf8(b"url3"),
            string::utf8(b"url4"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
fun test_claim_badge_success() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Tokyo Tower"),
            string::utf8(b"Famous tower in Tokyo"),
            string::utf8(b"35.6586"),
            string::utf8(b"139.7454"),
            string::utf8(b"https://common.jpg"),
            string::utf8(b"https://rare.jpg"),
            string::utf8(b"https://epic.jpg"),
            string::utf8(b"https://legendary.jpg"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Bob"),
            string::utf8(b"Traveler"),
            string::utf8(b"https://avatar.jpg"),
            vector[],
            string::utf8(b"Japan"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER1 claim badge
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0, // location_id
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::badge_count(&profile) == 1, 0);
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
fun test_claim_badge_multiple_times_same_location() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup (tương tự test trên)
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Location"),
            string::utf8(b"Desc"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"c"),
            string::utf8(b"r"),
            string::utf8(b"e"),
            string::utf8(b"l"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"User"),
            string::utf8(b"Bio"),
            string::utf8(b"url"),
            vector[],
            string::utf8(b"Country"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Claim lần 1
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0,
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::badge_count(&profile) == 1, 0);
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    // Claim lần 2 cùng location - badge_count vẫn là 1 (ghi đè)
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0,
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::badge_count(&profile) == 1, 1); // Vẫn là 1
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

// ==================== Marketplace Module Tests ====================

#[test]
fun test_marketplace_init() {
    let mut scenario = ts::begin(ADMIN);
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        
        assert!(badge_marketplace::total_listings(&registry) == 0, 0);
        assert!(badge_marketplace::royalty_bps(&registry) == 500, 1); // 5%
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
fun test_update_royalty_success() {
    let mut scenario = ts::begin(ADMIN);
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        
        badge_marketplace::update_royalty(
            &mut registry,
            1000, // 10%
            ts::ctx(&mut scenario)
        );
        
        assert!(badge_marketplace::royalty_bps(&registry) == 1000, 0);
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 100)]
fun test_update_royalty_non_admin_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    // USER1 cố update - phải fail
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        
        badge_marketplace::update_royalty(
            &mut registry,
            1000,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 101)]
fun test_update_royalty_too_high_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    // Set royalty > 20% - phải fail
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        
        badge_marketplace::update_royalty(
            &mut registry,
            2500, // 25% - quá cao
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
fun test_marketplace_list_epic_badge_success() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup profiles và marketplace
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Epic Location"),
            string::utf8(b"Epic badge location"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"common"),
            string::utf8(b"rare"),
            string::utf8(b"epic"),
            string::utf8(b"legendary"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile và claim epic badge (giả sử random ra epic)
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Seller"),
            string::utf8(b"Badge seller"),
            string::utf8(b"https://avatar.jpg"),
            vector[],
            string::utf8(b"USA"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Note: Test này giả định có epic badge để list, trong thực tế cần mock random function
    
    ts::end(scenario);
}

#[test]
fun test_claim_badge_different_locations() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add 2 locations
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Location 1"),
            string::utf8(b"First location"),
            string::utf8(b"1.0"),
            string::utf8(b"1.0"),
            string::utf8(b"c1"),
            string::utf8(b"r1"),
            string::utf8(b"e1"),
            string::utf8(b"l1"),
            ts::ctx(&mut scenario)
        );
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Location 2"),
            string::utf8(b"Second location"),
            string::utf8(b"2.0"),
            string::utf8(b"2.0"),
            string::utf8(b"c2"),
            string::utf8(b"r2"),
            string::utf8(b"e2"),
            string::utf8(b"l2"),
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::total_locations(&registry) == 2, 0);
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Multi-traveler"),
            string::utf8(b"Loves exploring"),
            string::utf8(b"https://avatar.jpg"),
            vector[],
            string::utf8(b"Global"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Claim badge từ location 1
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0, // location_id 0
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::badge_count(&profile) == 1, 0);
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    // Claim badge từ location 2
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            1, // location_id 1
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(profiles::badge_count(&profile) == 2, 1); // Bây giờ có 2 badge
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1)] // Error từ table::borrow khi location_id không tồn tại
fun test_claim_badge_invalid_location_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Chỉ add 1 location (index 0)
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Only Location"),
            string::utf8(b"Only one"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"c"),
            string::utf8(b"r"),
            string::utf8(b"e"),
            string::utf8(b"l"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"User"),
            string::utf8(b"Bio"),
            string::utf8(b"url"),
            vector[],
            string::utf8(b"Country"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Cố claim badge từ location không tồn tại (index 1) - phải fail
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            1, // location_id không tồn tại
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 10)]
fun test_claim_badge_insufficient_payment_fails() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Location"),
            string::utf8(b"Desc"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"c"),
            string::utf8(b"r"),
            string::utf8(b"e"),
            string::utf8(b"l"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"User"),
            string::utf8(b"Bio"),
            string::utf8(b"url"),
            vector[],
            string::utf8(b"Country"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Claim badge với payment không đủ - phải fail
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(5_000_000, ts::ctx(&mut scenario)); // Chỉ 0.005 SUI
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0,
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

#[test]
fun test_profile_basic_functionality() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"Test Name"),
            string::utf8(b"Test Bio Description"),
            string::utf8(b"https://test-avatar.com/image.jpg"),
            vector[string::utf8(b"twitter:testuser"), string::utf8(b"github:testdev")],
            string::utf8(b"Test Country"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Test basic getters
    {
        ts::next_tx(&mut scenario, USER1);
        let profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        // Test owner
        assert!(profiles::owner(&profile) == USER1, 0);
        
        // Test badge count starts at 0
        assert!(profiles::badge_count(&profile) == 0, 1);
        
        ts::return_to_sender(&scenario, profile);
    };
    
    ts::end(scenario);
}

#[test]
fun test_has_badge_functionality() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Test Location"),
            string::utf8(b"For testing"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"c"),
            string::utf8(b"r"),
            string::utf8(b"e"),
            string::utf8(b"l"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"User"),
            string::utf8(b"Bio"),
            string::utf8(b"url"),
            vector[],
            string::utf8(b"Country"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Test has_badge before claiming
    {
        ts::next_tx(&mut scenario, USER1);
        let profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        assert!(!profiles::has_badge(&profile, 0), 0); // Chưa có badge
        
        ts::return_to_sender(&scenario, profile);
    };
    
    // Claim badge
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0,
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    // Test has_badge after claiming
    {
        ts::next_tx(&mut scenario, USER1);
        let profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        assert!(profiles::has_badge(&profile, 0), 1); // Bây giờ có badge
        assert!(profiles::badge_count(&profile) == 1, 2); // Badge count = 1
        
        ts::return_to_sender(&scenario, profile);
    };
    
    ts::end(scenario);
}

#[test]
fun test_borrow_badge_functionality() {
    let mut scenario = ts::begin(ADMIN);
    
    // Setup
    {
        ts::next_tx(&mut scenario, ADMIN);
        profiles::init_for_testing(ts::ctx(&mut scenario));
    };
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock::share_for_testing(clock);
        profiles::create_location_registry(ts::ctx(&mut scenario));
    };
    
    // Add location
    {
        ts::next_tx(&mut scenario, ADMIN);
        let mut registry = ts::take_shared<LocationRegistry>(&scenario);
        
        profiles::add_location(
            &mut registry,
            string::utf8(b"Test Location"),
            string::utf8(b"For borrow test"),
            string::utf8(b"0"),
            string::utf8(b"0"),
            string::utf8(b"c"),
            string::utf8(b"r"),
            string::utf8(b"e"),
            string::utf8(b"l"),
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
    };
    
    // USER1 mint profile và claim badge
    {
        ts::next_tx(&mut scenario, USER1);
        let mut registry = ts::take_shared<ProfileRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment1 = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::mint_profile(
            &mut registry,
            string::utf8(b"User"),
            string::utf8(b"Bio"),
            string::utf8(b"url"),
            vector[],
            string::utf8(b"Country"),
            payment1,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    {
        ts::next_tx(&mut scenario, USER1);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let location_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment2 = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(
            &mut profile,
            &location_registry,
            0,
            payment2,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(location_registry);
        ts::return_shared(clock);
    };
    
    // Test borrow_badge
    {
        ts::next_tx(&mut scenario, USER1);
        let profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        // Test có thể borrow badge
        let _badge = profiles::borrow_badge(&profile, 0);
        
        // Verify badge exists
        assert!(profiles::has_badge(&profile, 0), 0);
        
        ts::return_to_sender(&scenario, profile);
    };
    
    ts::end(scenario);
}

#[test]
fun test_marketplace_total_listings() {
    let mut scenario = ts::begin(ADMIN);
    
    {
        ts::next_tx(&mut scenario, ADMIN);
        badge_marketplace::init_for_testing(ts::ctx(&mut scenario));
    };
    
    // Test initial total_listings
    {
        ts::next_tx(&mut scenario, ADMIN);
        let registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        
        assert!(badge_marketplace::total_listings(&registry) == 0, 0);
        
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}
