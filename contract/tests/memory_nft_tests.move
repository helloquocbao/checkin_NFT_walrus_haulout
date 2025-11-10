#[test_only]
module nft_checkin::memory_nft_tests;

use nft_checkin::memory_nft::{Self, MemoryNFT, MemoryRegistry};
use std::string;
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin;
use sui::sui::SUI;
use sui::clock::{Self, Clock};

// Test constants
const ADMIN: address = @0xAD;
const USER1: address = @0x1;
const USER2: address = @0x2;
const MINT_FEE: u64 = 30_000_000; // 0.03 SUI

// ==================== Helper Functions ====================

fun setup(scenario: &mut Scenario) {
    // Init memory_nft module
    ts::next_tx(scenario, ADMIN);
    memory_nft::init_for_testing(ts::ctx(scenario));
    
    // Create clock
    ts::next_tx(scenario, ADMIN);
    let clock = clock::create_for_testing(ts::ctx(scenario));
    clock::share_for_testing(clock);
}

// ==================== Test 01: Mint Memory NFT ====================

#[test]
fun test_01_mint_memory_success() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mint memory NFT
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"Sunset at Beach"),
            string::utf8(b"Beautiful sunset view"),
            string::utf8(b"https://image.jpg"),
            string::utf8(b"10.762622"),
            string::utf8(b"106.660172"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_nft::total_memories(&registry) == 1, 0);
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Verify NFT received
    ts::next_tx(&mut scenario, USER1);
    {
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        
        assert!(memory_nft::memory_name(&memory) == string::utf8(b"Sunset at Beach"), 1);
        assert!(memory_nft::memory_content(&memory) == string::utf8(b"Beautiful sunset view"), 2);
        assert!(memory_nft::memory_latitude(&memory) == string::utf8(b"10.762622"), 3);
        assert!(memory_nft::memory_longitude(&memory) == string::utf8(b"106.660172"), 4);
        assert!(memory_nft::memory_creator(&memory) == USER1, 5);
        // Check rarity and perfection are within valid ranges
        assert!(memory_nft::memory_rarity(&memory) <= 3, 6); // 0-3
        assert!(memory_nft::memory_perfection(&memory) >= 250 && memory_nft::memory_perfection(&memory) <= 1000, 7);
        
        ts::return_to_sender(&scenario, memory);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = 10)]
fun test_02_mint_memory_insufficient_fee() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 tries to mint with insufficient fee
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(10_000_000, ts::ctx(&mut scenario)); // Only 0.01 SUI
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"Test Memory"),
            string::utf8(b"Test content"),
            string::utf8(b"https://image.jpg"),
            string::utf8(b"10.0"),
            string::utf8(b"106.0"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    ts::end(scenario);
}

// ==================== Test 03: Multiple Memories ====================

#[test]
fun test_03_multiple_users_mint_memories() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // USER1 mints first memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"Memory 1"),
            string::utf8(b"Content 1"),
            string::utf8(b"https://img1.jpg"),
            string::utf8(b"10.0"),
            string::utf8(b"106.0"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_nft::total_memories(&registry) == 1, 0);
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER2 mints second memory
    ts::next_tx(&mut scenario, USER2);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"Memory 2"),
            string::utf8(b"Content 2"),
            string::utf8(b"https://img2.jpg"),
            string::utf8(b"20.0"),
            string::utf8(b"107.0"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_nft::total_memories(&registry) == 2, 1);
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // USER1 mints third memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"Memory 3"),
            string::utf8(b"Content 3"),
            string::utf8(b"https://img3.jpg"),
            string::utf8(b"15.0"),
            string::utf8(b"105.0"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        assert!(memory_nft::total_memories(&registry) == 3, 2);
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Verify USER1 has 2 memories
    ts::next_tx(&mut scenario, USER1);
    {
        let memory1 = ts::take_from_sender<MemoryNFT>(&scenario);
        let memory3 = ts::take_from_sender<MemoryNFT>(&scenario);
        
        assert!(memory_nft::memory_creator(&memory1) == USER1, 3);
        assert!(memory_nft::memory_creator(&memory3) == USER1, 4);
        
        ts::return_to_sender(&scenario, memory1);
        ts::return_to_sender(&scenario, memory3);
    };
    
    // Verify USER2 has 1 memory
    ts::next_tx(&mut scenario, USER2);
    {
        let memory2 = ts::take_from_sender<MemoryNFT>(&scenario);
        
        assert!(memory_nft::memory_creator(&memory2) == USER2, 5);
        assert!(memory_nft::memory_name(&memory2) == string::utf8(b"Memory 2"), 6);
        
        ts::return_to_sender(&scenario, memory2);
    };
    
    ts::end(scenario);
}

// ==================== Test 04: View Functions ====================

#[test]
fun test_04_view_functions() {
    let mut scenario = ts::begin(ADMIN);
    setup(&mut scenario);
    
    // Mint a memory
    ts::next_tx(&mut scenario, USER1);
    {
        let mut registry = ts::take_shared<MemoryRegistry>(&scenario);
        let clock = ts::take_shared<Clock>(&scenario);
        let payment = coin::mint_for_testing<SUI>(MINT_FEE, ts::ctx(&mut scenario));
        
        memory_nft::mint_memory(
            &mut registry,
            string::utf8(b"View Test Memory"),
            string::utf8(b"Testing all view functions"),
            string::utf8(b"https://test-image.jpg"),
            string::utf8(b"21.028511"),
            string::utf8(b"105.804817"),
            payment,
            &clock,
            ts::ctx(&mut scenario)
        );
        
        ts::return_shared(registry);
        ts::return_shared(clock);
    };
    
    // Test all view functions
    ts::next_tx(&mut scenario, USER1);
    {
        let memory = ts::take_from_sender<MemoryNFT>(&scenario);
        
        // Test all getters
        assert!(memory_nft::memory_name(&memory) == string::utf8(b"View Test Memory"), 0);
        assert!(memory_nft::memory_content(&memory) == string::utf8(b"Testing all view functions"), 1);
        assert!(memory_nft::memory_image_url(&memory) == string::utf8(b"https://test-image.jpg"), 2);
        assert!(memory_nft::memory_latitude(&memory) == string::utf8(b"21.028511"), 3);
        assert!(memory_nft::memory_longitude(&memory) == string::utf8(b"105.804817"), 4);
        assert!(memory_nft::memory_creator(&memory) == USER1, 5);
        // created_at là 0 trong test environment
        assert!(memory_nft::memory_created_at(&memory) == 0, 6);
        // Test rarity and perfection view functions
        let rarity = memory_nft::memory_rarity(&memory);
        let perfection = memory_nft::memory_perfection(&memory);
        assert!(rarity <= 3, 7);
        assert!(perfection >= 250 && perfection <= 1000, 8);
        
        ts::return_to_sender(&scenario, memory);
    };
    
    ts::end(scenario);
}
