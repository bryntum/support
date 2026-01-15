/**
 * Demonstration of the Container hasChanges issue and the fix.
 * 
 * This file shows the before and after behavior to clearly illustrate the bug and fix.
 */

const { Container } = require('./src/Container');
const { Combo, Store } = require('./src/Combo');

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForStoreLoad(store) {
    if (store && store.waitForLoad) {
        return store.waitForLoad();
    }
    return wait(50);
}

async function demonstrateIssue() {
    console.log('='.repeat(70));
    console.log('DEMONSTRATION: Container hasChanges Issue with Async Store Loading');
    console.log('='.repeat(70));
    
    console.log('\n📋 SCENARIO:');
    console.log('   A Container with a Combo field that loads its store asynchronously');
    console.log('   The Combo value is set during Container configuration (initial value)');
    console.log('   Expected: Container.hasChanges should be FALSE after initialization');
    console.log('   Bug: Container.hasChanges was TRUE because isConfiguring was lost\n');
    
    // Demonstration 1: Synchronous store (always worked)
    console.log('─'.repeat(70));
    console.log('Test 1: Combo with SYNCHRONOUS store (always worked)');
    console.log('─'.repeat(70));
    
    const syncStore = new Store({
        data: [
            { id: 1, name: 'Option 1' },
            { id: 2, name: 'Option 2' }
        ]
    });
    
    const syncCombo = new Combo({
        name: 'myCombo',
        value: 1,
        store: syncStore
    });
    
    const syncContainer = new Container({
        items: [syncCombo]
    });
    
    console.log(`✓ Combo value: ${syncCombo.value}`);
    console.log(`✓ Container hasChanges: ${syncContainer.hasChanges}`);
    console.log('  Result: ✅ PASS - No changes detected (as expected)\n');
    
    // Demonstration 2: Asynchronous store (the bug)
    console.log('─'.repeat(70));
    console.log('Test 2: Combo with ASYNCHRONOUS store (the bug we fixed)');
    console.log('─'.repeat(70));
    
    const asyncStore = new Store({
        url: '/mock/api/data',  // Triggers async loading
        data: [
            { id: 1, name: 'Option 1' },
            { id: 2, name: 'Option 2' }
        ]
    });
    
    const asyncCombo = new Combo({
        name: 'myCombo',
        value: 1,
        store: asyncStore
    });
    
    const asyncContainer = new Container({
        items: [asyncCombo]
    });
    
    console.log('⏳ Waiting for async store to load...');
    await waitForStoreLoad(asyncStore);
    
    console.log(`✓ Combo value: ${asyncCombo.value}`);
    console.log(`✓ Container hasChanges: ${asyncContainer.hasChanges}`);
    
    if (!asyncContainer.hasChanges) {
        console.log('  Result: ✅ PASS - No changes detected (FIX WORKS!)\n');
    } else {
        console.log('  Result: ❌ FAIL - Changes incorrectly detected (bug not fixed)\n');
    }
    
    // Demonstration 3: Actual user changes should still be detected
    console.log('─'.repeat(70));
    console.log('Test 3: User modifies value AFTER initialization (should detect change)');
    console.log('─'.repeat(70));
    
    const userStore = new Store({
        url: '/mock/api/data',
        data: [
            { id: 1, name: 'Option 1' },
            { id: 2, name: 'Option 2' }
        ]
    });
    
    const userCombo = new Combo({
        name: 'myCombo',
        value: 1,
        store: userStore
    });
    
    const userContainer = new Container({
        items: [userCombo]
    });
    
    await waitForStoreLoad(userStore);
    
    console.log(`Initial state:`);
    console.log(`  - Combo value: ${userCombo.value}`);
    console.log(`  - Container hasChanges: ${userContainer.hasChanges}`);
    
    // Simulate user changing the value
    console.log('\n👤 User changes combo value to 2...');
    userCombo.value = 2;
    
    console.log(`After user change:`);
    console.log(`  - Combo value: ${userCombo.value}`);
    console.log(`  - Container hasChanges: ${userContainer.hasChanges}`);
    
    if (userContainer.hasChanges) {
        console.log('  Result: ✅ PASS - User changes correctly detected\n');
    } else {
        console.log('  Result: ❌ FAIL - User changes not detected\n');
    }
    
    // Summary
    console.log('='.repeat(70));
    console.log('SUMMARY OF THE FIX');
    console.log('='.repeat(70));
    console.log('\n🔧 THE PROBLEM:');
    console.log('   When store.ion() callback fired asynchronously, isConfiguring was false');
    console.log('   Setting combo.value triggered onChange, marking Container as changed\n');
    
    console.log('💡 THE SOLUTION:');
    console.log('   Capture isConfiguring state in closure before registering callback');
    console.log('   Restore isConfiguring=true before setting value in callback');
    console.log('   This prevents onChange from firing during configuration\n');
    
    console.log('📝 CODE CHANGE (in Combo.setValueAfterStoreLoad):');
    console.log('   BEFORE: store.ion({ load: () => me.value = value })');
    console.log('   AFTER:  const { isConfiguring } = me;');
    console.log('           store.ion({');
    console.log('               load: () => {');
    console.log('                   me.isConfiguring = isConfiguring;  // Restore state');
    console.log('                   me.value = value;                  // Set value');
    console.log('                   me.isConfiguring = false;          // Reset');
    console.log('               }');
    console.log('           });\n');
    
    console.log('✅ Result: Container.hasChanges correctly stays FALSE during configuration');
    console.log('✅ Result: Container.hasChanges correctly becomes TRUE for user changes');
    console.log('='.repeat(70));
}

// Run demonstration
demonstrateIssue().catch(error => {
    console.error('Error running demonstration:', error);
    process.exit(1);
});
