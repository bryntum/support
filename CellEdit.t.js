/**
 * Test for CellEdit duplicate task bug fix
 */

StartTest(t => {
    let grid;

    t.beforeEach(() => {
        grid?.destroy();
        grid = null;
    });

    t.it('Should not create duplicate tasks when pressing ENTER with addNewAtEnd enabled', async t => {
        grid = await t.getGridAsync({
            appendTo : document.body,
            features : {
                cellEdit : {
                    addNewAtEnd : true
                }
            },
            columns : [
                { field : 'name', text : 'Name', editor : 'text' }
            ],
            data : []
        });

        // Add a button that simulates the "Create" button
        const button = document.createElement('button');
        button.id = 'createButton';
        button.textContent = 'Create+';
        let clickCount = 0;
        button.addEventListener('click', () => {
            clickCount++;
            grid.store.add({ name : `New Task ${clickCount}` });
            grid.startEditing({ record : grid.store.last, field : 'name' });
        });
        document.body.appendChild(button);

        // Reset store to empty
        grid.store.removeAll();
        
        t.is(grid.store.count, 0, 'Store is initially empty');

        // Click the Create button to add first task
        await t.click('#createButton');
        
        // Wait for editor to be visible
        await t.waitForSelector('.b-editor');
        
        t.is(grid.store.count, 1, 'One task added after Create button click');
        t.is(clickCount, 1, 'Button clicked once');

        // Type a name for the task
        await t.type(null, 'Task 1');

        // Press ENTER to finish editing
        // This should NOT trigger the button's click event
        await t.type(null, '[ENTER]');

        // Wait a bit for any potential duplicate creation
        await t.waitFor(500);

        // Verify no duplicate was created
        t.is(grid.store.count, 1, 'Still only one task after ENTER (no duplicate)');
        t.is(clickCount, 1, 'Button was not clicked again by ENTER event');
        t.is(grid.store.first.name, 'Task 1', 'Task has correct name');

        // Clean up
        button.remove();
    });

    t.it('Should handle multiple ENTER presses without creating duplicates', async t => {
        grid = await t.getGridAsync({
            appendTo : document.body,
            features : {
                cellEdit : {
                    addNewAtEnd : true
                }
            },
            columns : [
                { field : 'name', text : 'Name', editor : 'text' }
            ],
            data : []
        });

        const button = document.createElement('button');
        button.id = 'createButton';
        button.textContent = 'Create+';
        let clickCount = 0;
        button.addEventListener('click', () => {
            clickCount++;
            grid.store.add({ name : `New Task ${clickCount}` });
            grid.startEditing({ record : grid.store.last, field : 'name' });
        });
        document.body.appendChild(button);

        grid.store.removeAll();

        // Click Create button
        await t.click('#createButton');
        await t.waitForSelector('.b-editor');
        
        // Type and press ENTER for first task
        await t.type(null, 'Task 1[ENTER]');
        await t.waitFor(200);

        // With addNewAtEnd, a new row should be created for editing
        // Type and press ENTER for second task
        await t.type(null, 'Task 2[ENTER]');
        await t.waitFor(200);

        // Type and press ENTER for third task
        await t.type(null, 'Task 3[ENTER]');
        await t.waitFor(200);

        // Should have exactly 3 tasks, no duplicates
        t.is(grid.store.count, 3, 'Exactly 3 tasks created');
        t.is(clickCount, 1, 'Button clicked only once initially');
        t.is(grid.store.getAt(0).name, 'Task 1', 'First task correct');
        t.is(grid.store.getAt(1).name, 'Task 2', 'Second task correct');
        t.is(grid.store.getAt(2).name, 'Task 3', 'Third task correct');

        button.remove();
    });

    t.it('Should not affect TAB key navigation', async t => {
        grid = await t.getGridAsync({
            appendTo : document.body,
            features : {
                cellEdit : true
            },
            columns : [
                { field : 'name', text : 'Name', editor : 'text' },
                { field : 'age', text : 'Age', editor : 'number' }
            ],
            data : [
                { name : 'Test', age : 25 }
            ]
        });

        await t.click('.b-grid-row[data-index="0"] .b-grid-cell[data-column="name"]');
        await t.waitForSelector('.b-editor');

        await t.type(null, 'Updated Name[TAB]');
        await t.waitForSelector('.b-editor:contains(25)');

        t.is(grid.store.first.name, 'Updated Name', 'Name updated correctly');
        
        // Verify we're now editing the age field
        const editor = document.querySelector('.b-editor input');
        t.ok(editor, 'Editor still active after TAB');
    });
});
