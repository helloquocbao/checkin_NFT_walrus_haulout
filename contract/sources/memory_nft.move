module nft_checkin::memory_nft;

use std::string::{Self, String};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::event;
use sui::package;
use sui::display;
use sui::clock::{Self, Clock};
use sui::tx_context::sender;


/// 🖼️ Memory NFT - NFT check-in có thể trade
public struct MemoryNFT has key, store {
    id: UID,
    name: String,                    // Tên memory
    content: String,                 // Nội dung ngắn mô tả
    image_url: String,               // Link ảnh
    latitude: String,                // Vĩ độ
    longitude: String,               // Kinh độ
    creator: address,                // Người tạo
    created_at: u64,                 // Timestamp
    likes: u64,                      // Số lượt like
}

/// 📋 Memory Registry - Quản lý tất cả memories
public struct MemoryRegistry has key {
    id: UID,
    deployer: address,
    total_memories: u64,
}

/// 🎫 One-time witness
public struct MEMORY_NFT has drop {}

/// 📢 Events
public struct MemoryMinted has copy, drop {
    memory_id: address,
    creator: address,
    name: String,
    latitude: String,
    longitude: String,
    created_at: u64,
}

public struct MemoryLiked has copy, drop {
    memory_id: address,
    liker: address,
    new_like_count: u64,
}

/// ⚙️ Init
fun init(otw: MEMORY_NFT, ctx: &mut tx_context::TxContext) {
    let deployer = sender(ctx);
    
    // 📦 Create Publisher
    let publisher = package::claim(otw, ctx);
    
    // 🎨 Setup Display for MemoryNFT
    let mut display = display::new<MemoryNFT>(&publisher, ctx);
    display::add(&mut display, string::utf8(b"name"), string::utf8(b"{name}"));
    display::add(&mut display, string::utf8(b"description"), string::utf8(b"{content}"));
    display::add(&mut display, string::utf8(b"image_url"), string::utf8(b"{image_url}"));
    display::add(&mut display, string::utf8(b"latitude"), string::utf8(b"{latitude}"));
    display::add(&mut display, string::utf8(b"longitude"), string::utf8(b"{longitude}"));
    display::add(&mut display, string::utf8(b"creator"), string::utf8(b"{creator}"));
    display::add(&mut display, string::utf8(b"likes"), string::utf8(b"{likes}"));
    display::update_version(&mut display);
    
    // 🏪 Create Registry
    let registry = MemoryRegistry {
        id: object::new(ctx),
        deployer,
        total_memories: 0,
    };
    
    // 📤 Transfer objects
    transfer::public_transfer(publisher, deployer);
    transfer::public_transfer(display, deployer);
    transfer::share_object(registry);
}

/// 🎨 Mint Memory NFT khi check-in
entry fun mint_memory(
    registry: &mut MemoryRegistry,
    name: String,
    content: String,
    image_url: String,
    latitude: String,
    longitude: String,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut tx_context::TxContext,
) {
    let sender_addr = sender(ctx);
    
    // 💰 Thu phí mint = 0.03 SUI (hardcoded)
    let mint_fee = 30_000_000; // 0.03 SUI
    let balance = coin::value(&payment);
    assert!(balance >= mint_fee, 10);
    
    let mut pay = payment;
    let fee_coin = coin::split<SUI>(&mut pay, mint_fee, ctx);
    transfer::public_transfer(fee_coin, registry.deployer);
    transfer::public_transfer(pay, sender_addr);
    
    // 🎨 Create Memory NFT
    let memory = MemoryNFT {
        id: object::new(ctx),
        name,
        content,
        image_url,
        latitude,
        longitude,
        creator: sender_addr,
        created_at: clock::timestamp_ms(clock),
        likes: 0,
    };
    
    let memory_id = object::uid_to_address(&memory.id);
    
    registry.total_memories = registry.total_memories + 1;
    
    // 📢 Emit event
    event::emit(MemoryMinted {
        memory_id,
        creator: sender_addr,
        name: memory.name,
        latitude: memory.latitude,
        longitude: memory.longitude,
        created_at: memory.created_at,
    });
    
    // 🎁 Transfer NFT to creator
    transfer::public_transfer(memory, sender_addr);
}

/// 👍 Like a Memory NFT
entry fun like_memory(
    memory: &mut MemoryNFT,
    ctx: &tx_context::TxContext,
) {
    memory.likes = memory.likes + 1;
    
    event::emit(MemoryLiked {
        memory_id: object::uid_to_address(&memory.id),
        liker: sender(ctx),
        new_like_count: memory.likes,
    });
}

///  View functions
public fun total_memories(registry: &MemoryRegistry): u64 {
    registry.total_memories
}

public fun memory_name(memory: &MemoryNFT): String {
    memory.name
}

public fun memory_content(memory: &MemoryNFT): String {
    memory.content
}

public fun memory_image_url(memory: &MemoryNFT): String {
    memory.image_url
}

public fun memory_latitude(memory: &MemoryNFT): String {
    memory.latitude
}

public fun memory_longitude(memory: &MemoryNFT): String {
    memory.longitude
}

public fun memory_creator(memory: &MemoryNFT): address {
    memory.creator
}

public fun memory_created_at(memory: &MemoryNFT): u64 {
    memory.created_at
}

public fun memory_likes(memory: &MemoryNFT): u64 {
    memory.likes
}

// ==================== Test-only functions ====================

#[test_only]
/// Initialize for testing
public fun init_for_testing(ctx: &mut tx_context::TxContext) {
    init(MEMORY_NFT {}, ctx);
}
