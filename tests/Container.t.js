/**
 * Tests for Container change tracking, specifically testing the fix for
 * the issue where a Combo with an async-loaded store incorrectly marks
 * the Container as having changes during configuration.
 * 
 * Issue: Container `hasChanges` when it should not
 * Forum post: https://forum.bryntum.com/viewtopic.php?p=177191#p177191
 */

const { Container } = require('../src/Container');
const { Combo, Store } = require('../src/Combo');

/**
 * Helper function to wait for async operations
 * @deprecated Use store.waitForLoad() for more reliable testing
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to wait for store to load
 */
async function waitForStoreLoad(store) {
    if (store && store.waitForLoad) {
        return store.waitForLoad();
    }
    return wait(50);
}

// Run tests
if (require.main === module) {
    console.log('Running Container tests...');
    
    // Simple test runner
    const runTests = async () => {
        try {
            console.log('\nTest 1: Sync store - no changes');
            const store1 = new Store({
                data: [{ id: 1, name: 'Option 1' }]
            });
            const combo1 = new Combo({ name: 'test', value: 1, store: store1 });
            const container1 = new Container({ items: [combo1] });
            console.log(`  hasChanges: ${container1.hasChanges} (expected: false)`);
            console.log(`  ✓ Test 1 ${!container1.hasChanges ? 'PASSED' : 'FAILED'}`);
            
            console.log('\nTest 2: Async store - no changes (THE FIX)');
            const store2 = new Store({
                url: '/mock/data',
                data: [{ id: 1, name: 'Option 1' }]
            });
            const combo2 = new Combo({ name: 'test', value: 1, store: store2 });
            const container2 = new Container({ items: [combo2] });
            
            // Wait for store to load using reliable method
            await waitForStoreLoad(store2);
            console.log(`  hasChanges: ${container2.hasChanges} (expected: false)`);
            console.log(`  value: ${combo2.value} (expected: 1)`);
            console.log(`  ✓ Test 2 ${!container2.hasChanges && combo2.value === 1 ? 'PASSED' : 'FAILED'}`);
            
            console.log('\nTest 3: User changes - should have changes');
            const store3 = new Store({
                url: '/mock/data',
                data: [{ id: 1, name: 'Option 1' }, { id: 2, name: 'Option 2' }]
            });
            const combo3 = new Combo({ name: 'test', value: 1, store: store3 });
            const container3 = new Container({ items: [combo3] });
            
            // Wait for store to load using reliable method
            await waitForStoreLoad(store3);
            const noChangesInitially = !container3.hasChanges;
            combo3.value = 2;
            const hasChangesAfterEdit = container3.hasChanges;
            console.log(`  hasChanges initially: ${!noChangesInitially} (expected: false)`);
            console.log(`  hasChanges after edit: ${hasChangesAfterEdit} (expected: true)`);
            console.log(`  ✓ Test 3 ${noChangesInitially && hasChangesAfterEdit ? 'PASSED' : 'FAILED'}`);
            
            console.log('\n✅ All tests completed!');
        } catch (error) {
            console.error('❌ Test error:', error);
        }
    };
    
    runTests();
}
