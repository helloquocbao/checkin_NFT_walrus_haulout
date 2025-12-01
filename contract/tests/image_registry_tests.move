#[test_only]
module nft_checkin::test_image_registry {
    use nft_checkin::profiles;
    use sui::test_scenario::{Self};

    const ADMIN: address = @0xAD;

    // ==================== Test 1: Module Initialization ====================
    // Verifies all 4 registries are created during module init

    #[test]
    fun test_init_creates_all_registries() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize contract
        {
            profiles::init_for_testing(scenario.ctx());
        };
        
        // Verify all registries were created
        scenario.next_tx(ADMIN);
        {
            let profile_registry = scenario.take_shared<profiles::ProfileRegistry>();
            let image_registry = scenario.take_shared<profiles::ImageRegistry>();
            let location_registry = scenario.take_shared<profiles::LocationRegistry>();
            let voter_registry = scenario.take_shared<profiles::VoterRegistry>();
            
            // All registries exist and can be accessed
            test_scenario::return_shared(profile_registry);
            test_scenario::return_shared(image_registry);
            test_scenario::return_shared(location_registry);
            test_scenario::return_shared(voter_registry);
        };
        
        scenario.end();
    }
}
