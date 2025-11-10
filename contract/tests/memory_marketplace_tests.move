#[test_only]
module nft_checkin::memory_marketplace_tests;

use nft_checkin::memory_nft::{Self, MemoryNFT, MemoryRegistry};
use nft_checkin::memory_marketplace::{Self, MemoryMarketplaceRegistry, MemoryListing};
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
const MINT_FEE: u64 = 30_000_000; // 0.03 SUI
const LISTING_PRICE: u64 = 100_000_000; // 0.1 SUI

// ==================== Helper Functions ====================

fun setup(scenario: &mut Scenario) {
    // Init memory_nft module
    ts::next_tx(scenario, ADMIN);
    memory_nft::init_for_testing(ts::ctx(scenario));
    
    // Init memory_marketplace module
    ts::next_tx(scenario, ADMIN);
    memory_marketplace::init_for_testing(ts::ctx(scenario));
    
    // Create clock
    ts::next_tx(scenario, ADMIN);
    let clock = clock::create_for_testing(ts::ctx(scenario));
    clock::share_for_testing(clock);
}

fun mint_memory_for_user(scenario: &mut Scenario, user: address, name: vector<u8>) {
    ts::next_tx(scenario, user);
    let mut registry = ts::take_shared<MemoryRegistry>(scenario);
    let clock = ts::take_shared<Clock>(scenario);
    let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(scenario));
    
    memory_nft::mint_memory(
        &mut registry,
        string::utf8(name),
        string::utf8(b"Test content"),
        string::utf8(b"https://image.jpg"),
        string::utf8(b"10.762622"),
        string::utf8(b"106.660172"),
        payment,
        &clock,
        ts::ctx(scenario)
    );
    
    ts::return_shared(registry);
    ts::return_shared(clock);
}

fun create_kiosk_for_user(scenario: &mut Scenario, user: address) {
    ts::next_tx(scenario, user);
    let (kiosk, cap) = kiosk::new(ts::ctx(scenario));
    transfer::public_share_object(kiosk);
    transfer::public_transfer(cap, user);
}

// ==================== Test 01: List Memory NFT ====================

#[test]
fun test_01_list_memory_success() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint memory
    mint_memory_for_user(&mut scenario, USER1, b"Beach Sunset");
    
    // USER1 create kiosk
    create_kiosk_for_user(&mut scenario, USER1);
    
    // USER1 list memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_marketplace::total_listings(&registry) == 1, 0);
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

// ==================== Test 02: Buy Memory Direct ====================

#[test]
fun test_02_buy_memory_direct_success() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint memory
    mint_memory_for_user(&mut scenario, USER1, b"Mountain View");
    
    // USER1 create kiosk and list
    create_kiosk_for_user(&mut scenario, USER1);
    
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER2 buys the memory (direct transfer)
    ts::next_tx(&mut scenario, USER2);
    {
        let registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut seller_kiosk = ts::take_shared<Kiosk>(&scenario);
        let policy = ts::take_shared<TransferPolicy<MemoryNFT>>(&scenario);
        let listing = ts::take_shared<MemoryListing>(&scenario);
        let payment = coin::mint_for_testing<SUI>(LISTING_PRICE, ts::ctx(&mut scenario));
        
        memory_marketplace::buy_memory_direct(
            &registry,
            listing,
            &mut seller_kiosk,
            &policy,
            payment,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(seller_kiosk);
        ts::return_shared(registry);
        ts::return_shared(policy);
    };
    
    // Verify USER2 received the memory
    ts::next_tx(&mut scenario, USER2);
    {
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        
        assert!(memory_nft::memory_name(&memory) == string::utf8(b"Mountain View"), 0);
        assert!(memory_nft::memory_creator(&memory) == USER1, 1); // Original creator still USER1
        
        ts::return_to_sender(&scenario, memory);
    };
    
    ts::end(scenario);
}

// ==================== Test 03: Verify Listing Data ====================

#[test]
fun test_03_verify_listing_data() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint and list memory
    mint_memory_for_user(&mut scenario, USER1, b"City Lights");
    create_kiosk_for_user(&mut scenario, USER1);
    
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Verify listing data
    ts::next_tx(&mut scenario, ADMIN);
    {
        let listing = ts::take_shared<MemoryListing>(&scenario);
        
        assert!(memory_marketplace::listing_seller(&listing) == USER1, 0);
        assert!(memory_marketplace::listing_price(&listing) == LISTING_PRICE, 1);
        
        ts::return_shared(listing);
    };
    
    ts::end(scenario);
}

// ==================== Test 04: Delist Memory ====================

#[test]
fun test_04_delist_memory_success() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint and list memory
    mint_memory_for_user(&mut scenario, USER1, b"Delist Test");
    create_kiosk_for_user(&mut scenario, USER1);
    
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER1 delists the memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let listing = ts::take_shared<MemoryListing>(&scenario);
        
        memory_marketplace::delist_memory(
            listing,
            &mut kiosk,
            &cap,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
    };
    
    // Verify USER1 got the memory back
    ts::next_tx(&mut scenario, USER1);
    {
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        
        assert!(memory_nft::memory_name(&memory) == string::utf8(b"Delist Test"), 0);
        
        ts::return_to_sender(&scenario, memory);
    };
    
    ts::end(scenario);
}

// ==================== Test 05: Single User Multiple Listings ====================

#[test]
fun test_05_single_user_multiple_listings() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint 2 memories
    mint_memory_for_user(&mut scenario, USER1, b"Memory 1");
    mint_memory_for_user(&mut scenario, USER1, b"Memory 2");
    
    // Create kiosk for USER1
    create_kiosk_for_user(&mut scenario, USER1);
    
    // USER1 lists first memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_marketplace::total_listings(&registry) == 1, 0);
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER1 lists second memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE + 50_000_000, // 0.15 SUI
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_marketplace::total_listings(&registry) == 2, 1);
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

// ==================== Test 06: Royalty Calculation ====================

#[test]
fun test_06_royalty_calculation() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // Check default royalty is 2.5% (250 bps)
    ts::next_tx(&mut scenario, ADMIN);
    {
        let registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        assert!(memory_marketplace::royalty_bps(&registry) == 250, 0);
        ts::return_shared(registry);
    };
    
    // Update royalty to 5% (500 bps)
    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        memory_marketplace::update_royalty(&mut registry, 500, ts::ctx(&mut scenario));
        assert!(memory_marketplace::royalty_bps(&registry) == 500, 1);
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

// ==================== Test 07: Update Royalty Failure (Non-Admin) ====================

#[test]
#[expected_failure(abort_code = 100)]
fun test_07_update_royalty_non_admin_fails() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 tries to update royalty (should fail)
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        memory_marketplace::update_royalty(&mut registry, 500, ts::ctx(&mut scenario));
        ts::return_shared(registry);
    };
    
    ts::end(scenario);
}

// ==================== Test 08: Listing View Functions ====================

#[test]
fun test_08_listing_view_functions() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint and list memory
    mint_memory_for_user(&mut scenario, USER1, b"View Test");
    create_kiosk_for_user(&mut scenario, USER1);
    
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryMarketplaceRegistry>(&scenario);
        let mut kiosk = ts::take_shared<Kiosk>(&scenario);
        let cap = ts::take_from_sender<KioskOwnerCap>(&scenario);
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        
        memory_marketplace::list_memory(
            &mut registry,
            &mut kiosk,
            &cap,
            memory,
            LISTING_PRICE,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_sender(&scenario, cap);
        ts::return_shared(kiosk);
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Test listing view functions
    ts::next_tx(&mut scenario, USER1);
    {
        let listing = ts::take_shared<MemoryListing>(&scenario);
        
        assert!(memory_marketplace::listing_price(&listing) == LISTING_PRICE, 0);
        assert!(memory_marketplace::listing_seller(&listing) == USER1, 1);
        
        ts::return_shared(listing);
    };
    
    ts::end(scenario);
}
