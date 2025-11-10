module nft_checkin::utils_random;

use std::bcs;
use std::hash;

/// 🎲 Sinh số ngẫu nhiên 64-bit từ transaction digest
public fun random_number(ctx: &TxContext, min: u64, max: u64): u64 {
    // ✅ digest có kiểu `object::ID`, encode ra bytes bằng BCS
    let digest = tx_context::digest(ctx);
    let seed = bcs::to_bytes(digest); // 👈 bỏ dấu & để truyền by-value

    // ✅ Hash bằng SHA3-256
    let hash_bytes = hash::sha3_256(seed);

    // ✅ Lấy 8 byte đầu tiên để tạo u64
    let mut val: u64 = 0;
    let mut i = 0;
    while (i < 8) {
        val = (val << 8) | ((*vector::borrow(&hash_bytes, i)) as u64);

        i = i + 1;
    };

    let range = (max - min) + 1;
    (val % range) + min
}


