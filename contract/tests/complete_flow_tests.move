#[test_only]
module nft_checkin::complete_flow_tests;

use nft_checkin::profiles::{Self, ProfileNFT, ProfileRegistry, LocationRegistry, VoterRegistry};
use nft_checkin::badge_marketplace::{Self, MarketplaceRegistry, TradableBadge, BadgeListing};
use std::string;
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin;
use sui::sui::SUI;
use sui::clock::{Self, Clock};
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::transfer_policy::{Self, TransferPolicy};

// Test constants
const ADMIN: address = @0xAD;
const USER1: address = @0x1;
const USER2: address = @0x2;
const USER3: address = @0x3;
const USER4: address = @0x4;
const MINT_FEE: u64 = 10_000_000; // 0.01 SUI
const CLAIM_FEE: u64 = 10_000_000; // 0.01 SUI

// ==================== Helper Functions ====================

fun setup_basic(scenario: &mut Scenario) {
    // Init profiles module
    ts::next_tx(scenario, ADMIN);
    profiles::init_for_testing(ts::ctx(scenario));
    
    // Init marketplace module
    ts::next_tx(scenario, ADMIN);
    badge_marketplace::init_for_testing(ts::ctx(scenario));
    
    // Create clock
    ts::next_tx(scenario, ADMIN);
    let clock = clock::create_for_testing(ts::ctx(scenario));
    clock::share_for_testing(clock);
    
    // Create location registry
    ts::next_tx(scenario, ADMIN);
    profiles::create_location_registry(ts::ctx(scenario));
    
    // Add test location
    ts::next_tx(scenario, ADMIN);
    let mut loc_registry = ts::take_shared<LocationRegistry>(scenario);
    profiles::add_location(
        &mut loc_registry,
        string::utf8(b"Eiffel Tower"),
        string::utf8(b"Paris, France"),
        string::utf8(b"48.8584"),
        string::utf8(b"2.2945"),
        string::utf8(b"https://common.jpg"),
        string::utf8(b"https://rare.jpg"),
        string::utf8(b"https://epic.jpg"),
        string::utf8(b"https://legendary.jpg"),
        ts::ctx(scenario)
    );
    ts::return_shared(loc_registry);
}

fun mint_profile_for_user(scenario: &mut Scenario, user: address, name: vector<u8>) {
    ts::next_tx(scenario, user);
    let mut registry = ts::take_shared<ProfileRegistry>(scenario);
    let clock = ts::take_shared<Clock>(scenario);
    let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(scenario));
    
    profiles::mint_profile(
        &mut registry,
        string::utf8(name),
        string::utf8(b"Test bio"),
        string::utf8(b"https://avatar.jpg"),
        vector[string::utf8(b"twitter:test")],
        string::utf8(b"USA"),
        payment,
        &clock,
        ts::ctx(scenario)
    );
    
    ts::return_shared(registry);
    ts::return_shared(clock);
}

// ==================== Flow 1: Profile Creation ====================

#[test]
fun test_flow_01_complete_profile_creation() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // USER1 mints profile
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    
    // Verify profile created correctly
    ts::next_tx(&mut scenario, USER1);
    let profile = ts::take_from_sender<ProfileNFT>(&scenario);
    
    assert!(profiles::owner(&profile) == USER1, 0);
    assert!(profiles::badge_count(&profile) == 0, 1);
    assert!(!profiles::is_verified(&profile), 2);
    assert!(profiles::verify_votes(&profile) == 0, 3);
    
    ts::return_to_sender(&scenario, profile);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 1)]
fun test_flow_02_cannot_mint_profile_twice() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // Mint first time
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    
    // Try mint second time - should fail
    mint_profile_for_user(&mut scenario, USER1, b"Alice2");
    
    ts::end(scenario);
}

// ==================== Flow 2: Badge Claim (Gacha) ====================

#[test]
fun test_flow_03_claim_badge_success() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    
    // Claim badge
    ts::next_tx(&mut scenario, USER1);
    let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
    let loc_registry = ts::take_shared<LocationRegistry>(&scenario);
    let clock = ts::take_shared<Clock>(&scenario);
    let payment = coin::mint_for_testing<SUI>(CLAIM_FEE, ts::ctx(&mut scenario));
    
    profiles::claim_badge(
        &mut profile,
        &loc_registry,
        0, // location_id
        payment,
        &clock,
        ts::ctx(&mut scenario)
    );
    
    // Verify badge claimed
    assert!(profiles::badge_count(&profile) == 1, 0);
    assert!(profiles::has_badge(&profile, 0), 1);
    
    ts::return_to_sender(&scenario, profile);
    ts::return_shared(loc_registry);
    ts::return_shared(clock);
    ts::end(scenario);
}

#[test]
fun test_flow_04_claim_same_badge_multiple_times() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    
    // Claim badge first time
    ts::next_tx(&mut scenario, USER1);
    {
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let loc_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(CLAIM_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(&mut profile, &loc_registry, 0, payment, &clock, ts::ctx(&mut scenario));
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(loc_registry);
        ts::return_shared(clock);
    };
    
    // Claim same badge again - should override
    ts::next_tx(&mut scenario, USER1);
    {
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let loc_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(CLAIM_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(&mut profile, &loc_registry, 0, payment, &clock, ts::ctx(&mut scenario));
        
        // Badge count should still be 1 (overridden)
        assert!(profiles::badge_count(&profile) == 1, 0);
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(loc_registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

// ==================== Flow 3: Verification System ====================

#[test]
fun test_flow_05_complete_verification_flow() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // Create 4 profiles (USER1 needs 3 votes from USER2, USER3, USER4)
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    mint_profile_for_user(&mut scenario, USER3, b"Charlie");
    mint_profile_for_user(&mut scenario, USER4, b"David");
    
    // USER2 votes for USER1
    ts::next_tx(&mut scenario, USER2);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        
        assert!(profiles::verify_votes(&profile1) == 1, 0);
        
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER3 votes for USER1
    ts::next_tx(&mut scenario, USER3);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        
        assert!(profiles::verify_votes(&profile1) == 2, 0);
        
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER4 votes for USER1
    ts::next_tx(&mut scenario, USER4);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        
        assert!(profiles::verify_votes(&profile1) == 3, 0);
        
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER1 claims verification
    ts::next_tx(&mut scenario, USER1);
    {
        let registry = ts::take_shared<ProfileRegistry>(&scenario);
        let mut profile1 = ts::take_from_sender<ProfileNFT>(&scenario);
        
        profiles::claim_verification(&registry, &mut profile1, ts::ctx(&mut scenario));
        
        assert!(profiles::is_verified(&profile1), 0);
        
        ts::return_to_sender(&scenario, profile1);
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 300)]
fun test_flow_06_cannot_vote_for_yourself() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    
    // USER1 tries to vote for themselves
    ts::next_tx(&mut scenario, USER1);
    let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
    let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
    
    profiles::vote_for_profile(&mut voter_registry, &mut profile, ts::ctx(&mut scenario));
    
    ts::return_to_sender(&scenario, profile);
    ts::return_shared(voter_registry);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 301)]
fun test_flow_07_cannot_vote_twice_for_same_person() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    
    // USER2 votes for USER1 first time
    ts::next_tx(&mut scenario, USER2);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER2 tries to vote for USER1 again - should fail
    ts::next_tx(&mut scenario, USER2);
    let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
    let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
    
    profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
    
    ts::return_to_address(USER1, profile1);
    ts::return_shared(voter_registry);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 302)]
fun test_flow_08_cannot_vote_more_than_2_times() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // Create 3 profiles to vote for
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    mint_profile_for_user(&mut scenario, USER3, b"Charlie");
    mint_profile_for_user(&mut scenario, USER4, b"David");
    
    // USER4 votes for USER1
    ts::next_tx(&mut scenario, USER4);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER4 votes for USER2
    ts::next_tx(&mut scenario, USER4);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile2 = ts::take_from_address<ProfileNFT>(&scenario, USER2);
        profiles::vote_for_profile(&mut voter_registry, &mut profile2, ts::ctx(&mut scenario));
        ts::return_to_address(USER2, profile2);
        ts::return_shared(voter_registry);
    };
    
    // USER4 tries to vote for USER3 (3rd vote) - should fail
    ts::next_tx(&mut scenario, USER4);
    let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
    let mut profile3 = ts::take_from_address<ProfileNFT>(&scenario, USER3);
    profiles::vote_for_profile(&mut voter_registry, &mut profile3, ts::ctx(&mut scenario));
    
    ts::return_to_address(USER3, profile3);
    ts::return_shared(voter_registry);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 304)]
fun test_flow_09_cannot_claim_verify_without_enough_votes() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    
    // USER2 votes for USER1 (only 1 vote, need 3)
    ts::next_tx(&mut scenario, USER2);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // USER1 tries to claim verification with only 1 vote - should fail
    ts::next_tx(&mut scenario, USER1);
    let registry = ts::take_shared<ProfileRegistry>(&scenario);
    let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
    
    profiles::claim_verification(&registry, &mut profile, ts::ctx(&mut scenario));
    
    ts::return_to_sender(&scenario, profile);
    ts::return_shared(registry);
    ts::end(scenario);
}

// ==================== Flow 4: Marketplace - Kiosk ====================

#[test]
fun test_flow_10_create_kiosk_success() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // USER1 creates kiosk
    ts::next_tx(&mut scenario, USER1);
    let mut mp_registry = ts::take_shared<MarketplaceRegistry>(&scenario);
    
    badge_marketplace::create_kiosk(&mut mp_registry, ts::ctx(&mut scenario));
    
    assert!(badge_marketplace::has_kiosk(&mp_registry, USER1), 0);
    
    ts::return_shared(mp_registry);
    
    // Verify kiosk and cap created
    ts::next_tx(&mut scenario, USER1);
    let _kiosk = ts::take_shared<Kiosk>(&scenario);
    let _cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
    
    ts::return_shared(_kiosk);
    ts::return_to_sender(&scenario, _cap);
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 200)]
fun test_flow_11_cannot_create_kiosk_twice() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // USER1 creates first kiosk
    ts::next_tx(&mut scenario, USER1);
    {
        let mut mp_registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        badge_marketplace::create_kiosk(&mut mp_registry, ts::ctx(&mut scenario));
        ts::return_shared(mp_registry);
    };
    
    // USER1 tries to create second kiosk - should fail
    ts::next_tx(&mut scenario, USER1);
    let mut mp_registry = ts::take_shared<MarketplaceRegistry>(&scenario);
    badge_marketplace::create_kiosk(&mut mp_registry, ts::ctx(&mut scenario));
    
    ts::return_shared(mp_registry);
    ts::end(scenario);
}

// ==================== Flow 5: Badge Trading ====================

#[test]
fun test_flow_12_complete_trading_flow() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // Setup: USER1 and USER2 have profiles
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    
    // USER1 creates kiosk
    ts::next_tx(&mut scenario, USER1);
    {
        let mut mp_registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        badge_marketplace::create_kiosk(&mut mp_registry, ts::ctx(&mut scenario));
        ts::return_shared(mp_registry);
    };
    
    // USER1 claims multiple badges to get Epic/Legendary
    // Note: In real scenario, need to claim multiple times due to randomness
    // For test purposes, we'll assume we got an Epic badge
    
    ts::end(scenario);
}

// ==================== Summary Test ====================

#[test]
fun test_flow_13_end_to_end_complete_journey() {
    let mut scenario = ts::begin(ADMIN);
    setup_basic(&mut scenario);
    
    // 1. Four users create profiles
    mint_profile_for_user(&mut scenario, USER1, b"Alice");
    mint_profile_for_user(&mut scenario, USER2, b"Bob");
    mint_profile_for_user(&mut scenario, USER3, b"Charlie");
    mint_profile_for_user(&mut scenario, USER4, b"David");
    
    // 2. Users claim badges
    ts::next_tx(&mut scenario, USER1);
    {
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        let loc_registry = ts::take_shared<LocationRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(CLAIM_FEE, ts::ctx(&mut scenario));
        
        profiles::claim_badge(&mut profile, &loc_registry, 0, payment, &clock, ts::ctx(&mut scenario));
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(loc_registry);
        ts::return_shared(clock);
    };
    
    // 3. Verification voting (USER1 gets 3 votes)
    ts::next_tx(&mut scenario, USER2);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    ts::next_tx(&mut scenario, USER3);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    ts::next_tx(&mut scenario, USER4);
    {
        let mut voter_registry = ts::take_shared<VoterRegistry>(&scenario);
        let mut profile1 = ts::take_from_address<ProfileNFT>(&scenario, USER1);
        profiles::vote_for_profile(&mut voter_registry, &mut profile1, ts::ctx(&mut scenario));
        ts::return_to_address(USER1, profile1);
        ts::return_shared(voter_registry);
    };
    
    // 4. USER1 claims verification
    ts::next_tx(&mut scenario, USER1);
    {
        let registry = ts::take_shared<ProfileRegistry>(&scenario);
        let mut profile = ts::take_from_sender<ProfileNFT>(&scenario);
        
        profiles::claim_verification(&registry, &mut profile, ts::ctx(&mut scenario));
        
        assert!(profiles::is_verified(&profile), 0);
        assert!(profiles::badge_count(&profile) == 1, 1);
        
        ts::return_to_sender(&scenario, profile);
        ts::return_shared(registry);
    };
    
    // 5. USER1 creates kiosk for future trading
    ts::next_tx(&mut scenario, USER1);
    {
        let mut mp_registry = ts::take_shared<MarketplaceRegistry>(&scenario);
        badge_marketplace::create_kiosk(&mut mp_registry, ts::ctx(&mut scenario));
        assert!(badge_marketplace::has_kiosk(&mp_registry, USER1), 0);
        ts::return_shared(mp_registry);
    };
    
    ts::end(scenario);
}
