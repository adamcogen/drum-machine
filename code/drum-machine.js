/**
 * This file contains the main logic and function definitions for running and updating the sequencer, its on-screen display, etc.
 */

window.onload = () => {

    // initialize sound file constants
    const SOUND_FILES_PATH = './sounds/';
    const BASS_DRUM = "bass-drum";
    const HI_HAT_CLOSED = 'hi-hat-closed';
    const HI_HAT_OPEN = 'hi-hat-open';
    const SNARE = 'snare';
    const WOODBLOCK = 'woodblock';
    const TOM = 'tom'
    const CLAP = 'clap'
    const WAV_EXTENSION = '.wav';

    // initialize the list of sample names we will use. the order of this list determines the order of sounds on the sound bank
    let sampleNameList = [WOODBLOCK, HI_HAT_CLOSED, HI_HAT_OPEN, CLAP, SNARE, TOM, BASS_DRUM]

    /**
     * load sound files
     */
    let samples = {}
    samples[WOODBLOCK] = new SequencerNoteType(null, '#bd3b07')
    samples[HI_HAT_CLOSED] = new SequencerNoteType(null, '#cf6311') // or try #b58f04 , this was yellow before
    samples[HI_HAT_OPEN] = new SequencerNoteType(null, '#b8961c') // or try #bf3d5e , this was red before
    samples[CLAP] = new SequencerNoteType(null, '#689620')
    samples[SNARE] = new SequencerNoteType(null, '#0e6e21')
    samples[TOM] = new SequencerNoteType(null, '#1b617a')
    samples[BASS_DRUM] = new SequencerNoteType(null, '#5b3787')
    // load all of the drum samples
    for (sampleName of sampleNameList) {
        loadDrumSample(SOUND_FILES_PATH, sampleName, WAV_EXTENSION)
    }

    // initialize web audio context
    setUpAudioAndAnimationForWebAudioApi()
    let _audioContext = new AudioContext();
    let webAudioDriver = new WebAudioDriver(_audioContext);

    // wait until the first click before resuming the audio context (this is required by Chrome browser)
    window.onclick = () => {
        _audioContext.resume()
    }

    /**
     * drum machine configurations
     */
    const _LOOK_AHEAD_MILLIS = 50; // number of milliseconds to look ahead when scheduling notes to play. note bigger value means that there is a longer delay for sounds to stop after the 'pause' button is hit.
    let defaultLoopLengthInMillis = 2100; // length of the whole drum sequence (loop), in millliseconds
    // initialize sequencer object
    let sequencer = new Sequencer([webAudioDriver], 0, defaultLoopLengthInMillis, _LOOK_AHEAD_MILLIS, samples)

    // Initialize Two.js library
    let two = initializeTwoJs(document.getElementById('draw-shapes'))
    
    // initialize ID generator for node / note labels, and node generator for notes taken from the sample bank.
    let idGenerator = new IdGenerator() // we will use this same ID generator everywhere we need IDs, to make sure we track which IDs have already been generated
    let _sampleBankNodeGenerator = new SampleBankNodeGenerator(idGenerator, sampleNameList) // generates a new sequencer list node whenever we pull a note off the sound bank
    let gui = new DrumMachineGui(sequencer, two, sampleNameList, samples, _sampleBankNodeGenerator, hideIcons=false);

    initializeTempoTextInputActionListeners();
    addPauseButtonActionListeners()
    addRestartSequencerButtonActionListeners()
    addClearAllNotesButtonActionListeners()

    let selectedRowIndex = null
    let rowSelecionTracker = {
        shapes: [],
        shapesOriginalPositions: [], // this is going to be such a weird way of doing this..
        rowHandleStartingPosition: {
            x: 0,
            y: 0,
        },
        domElements: [],
        domElementsOriginalPositions: [],
        removeRow: false,
    }

    // set up a initial example drum sequence
    initializeSimpleDefaultSequencerPattern()

    drawAllNoteBankCircles()
    drawNotesToReflectSequencerCurrentState()

    refreshWindowMouseMoveEvent();

    pause(); // start the sequencer paused

    redrawSequencer();

    // start main recursive update loop, where all state updates will happen
    requestAnimationFrameShim(draw)

    /**
     * end of main logic, start of function definitions.
     */

    // this method is the 'update' loop that will keep updating the page. after first invocation, this method basically calls itself recursively forever.
    function draw() {
        sequencer.update() // update timekeeping variables and schedule any upcoming notes, using the sequencer
        gui.update() // update the GUI display
        requestAnimationFrameShim(draw); // call animation frame update with this 'draw' method again
    }

    function windowMouseMoveEventHandler(event) {
        // clicking on a circle sets 'circleBeingMoved' to it. circle being moved will follow mouse movements (i.e. click-drag).
        if (gui.circleBeingMoved !== null) { // handle mousemove events when a note is selected
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            // start with default note movement behavior, for when the note doesn't fall within range of the trash bin, a sequencer line, etc.
            gui.circleBeingMoved.translation.x = mouseX
            gui.circleBeingMoved.translation.y = mouseY
            gui.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW // start with "it's not colliding with anything", and update the value from there if we find a collision
            gui.circleBeingMoved.stroke = "black"
            gui.components.domElements.images.trashClosedIcon.style.display = 'block'
            gui.components.domElements.images.trashOpenIcon.style.display = 'none'
            /**
             * adding stuff here for new 'snap to grid on move' behavior.
             * this will be the first part of making it so that notes being moved 'snap' into place when they are close to the trash bin or a sequencer line.
             * this will also be used for 'snapping' notes to subdivision lines (i.e. quantizing them) during placement onto quantized sequencer rows.
             * todo: add 'update sequence on move' behavior, so that the sequence will be constantly updated as notes are removed / moved around 
             * (i.e. the sequence will update in real time even before the note being moved is released).
             */
            // check if the note is within range to be placed in the trash bin. if so, move the circle to the center of the trash bin.
            centerOfTrashBinX = gui.configurations.noteTrashBin.left + (gui.configurations.noteTrashBin.width / 2)
            centerOfTrashBinY = gui.configurations.noteTrashBin.top + (gui.configurations.noteTrashBin.height / 2)
            let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= gui.configurations.noteTrashBin.left - gui.configurations.mouseEvents.notePlacementPadding) && (mouseX <= gui.configurations.noteTrashBin.left + gui.configurations.noteTrashBin.width + gui.configurations.mouseEvents.notePlacementPadding)
            let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= gui.configurations.noteTrashBin.top - gui.configurations.mouseEvents.notePlacementPadding) && (mouseY <= gui.configurations.noteTrashBin.top + gui.configurations.noteTrashBin.height + gui.configurations.mouseEvents.notePlacementPadding)
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                gui.circleBeingMoved.translation.x = centerOfTrashBinX
                gui.circleBeingMoved.translation.y = centerOfTrashBinY
                gui.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                gui.circleBeingMoved.stroke = "red"
                gui.components.domElements.images.trashClosedIcon.style.display = 'none'
                gui.components.domElements.images.trashOpenIcon.style.display = 'block'
                gui.components.shapes.noteTrashBinContainer.stroke = 'red'
            } else {
                gui.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            }
            // check if the note is in range to be placed onto a sequencer row. if so, determine which row, and move the circle onto the line where it would be placed
            let sequencerLeftBoundary = gui.configurations.sequencer.left - gui.configurations.mouseEvents.notePlacementPadding
            let sequencerRightBoundary = (gui.configurations.sequencer.left + gui.configurations.sequencer.width) + gui.configurations.mouseEvents.notePlacementPadding
            let sequencerTopBoundary = gui.configurations.sequencer.top - gui.configurations.mouseEvents.notePlacementPadding
            let sequencerBottomBoundary = gui.configurations.sequencer.top + ((sequencer.numberOfRows - 1) * gui.configurations.sequencer.spaceBetweenRows) + gui.configurations.mouseEvents.notePlacementPadding
            let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerLeftBoundary) && (mouseX <= sequencerRightBoundary)
            let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerTopBoundary) && (mouseY <= sequencerBottomBoundary)
            if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                // if we get here, we know the circle is within the vertical and horizontal boundaries of the sequencer.
                // next we want to do a more fine-grained calculation, for whether it is in range to be placed onto one of the sequencer lines.
                for(let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
                    rowActualVerticalLocation = gui.configurations.sequencer.top + (rowIndex * gui.configurations.sequencer.spaceBetweenRows)
                    rowActualLeftBound = gui.configurations.sequencer.left
                    rowActualRightBound = gui.configurations.sequencer.left + gui.configurations.sequencer.width
                    rowTopLimit = rowActualVerticalLocation - gui.configurations.mouseEvents.notePlacementPadding
                    rowBottomLimit = rowActualVerticalLocation + gui.configurations.mouseEvents.notePlacementPadding
                    rowLeftLimit = rowActualLeftBound - gui.configurations.mouseEvents.notePlacementPadding
                    rowRightLimit = rowActualRightBound + gui.configurations.mouseEvents.notePlacementPadding
                    if (mouseX >= rowLeftLimit && mouseX <= rowRightLimit && mouseY >= rowTopLimit && mouseY <= rowBottomLimit) {
                        // correct the padding so the circle falls precisely on an actual sequencer line once mouse is released
                        if (sequencer.rows[rowIndex].quantized === true) {
                            // determine which subdivision we are closest to
                            gui.circleBeingMovedNewBeatNumber = getIndexOfClosestSubdivisionLine(mouseX, sequencer.rows[rowIndex].getNumberOfSubdivisions())
                            gui.circleBeingMoved.translation.x = getXPositionOfSubdivisionLine(gui.circleBeingMovedNewBeatNumber, sequencer.rows[rowIndex].getNumberOfSubdivisions())
                        } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                            gui.circleBeingMoved.translation.x = gui.confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                            gui.circleBeingMovedNewBeatNumber = Sequencer.NOTE_IS_NOT_QUANTIZED
                        }
                        // quantization has a more complicated effect on x position than y. y position will always just be on line, so always just put it there.
                        gui.circleBeingMoved.translation.y = rowActualVerticalLocation;
                        gui.circleBeingMovedNewRow = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
                    }
                }
            } else {
                // new secondary trash bin logic: if the note is far enough away from the sequencer, we will throw it out
                let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - gui.configurations.mouseEvents.throwNoteAwaySidesPadding) || (mouseX >= sequencerRightBoundary + gui.configurations.mouseEvents.throwNoteAwaySidesPadding)
                let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - gui.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + gui.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding)
                if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                    gui.circleBeingMoved.stroke = "red" // make the note's outline red so it's clear it will be thrown out
                    gui.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                    gui.components.domElements.images.trashClosedIcon.style.display = 'none'
                    gui.components.domElements.images.trashOpenIcon.style.display = 'block'
                    gui.components.shapes.noteTrashBinContainer.stroke = 'red'
                }
            }
        }
        if (selectedRowIndex !== null) { // handle mousemove events when a row is selected
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY

            let circle = gui.components.shapes.sequencerRowHandles[selectedRowIndex]
            circle.stroke = 'black'
            circle.linewidth = 2
            circle.fill = gui.configurations.sequencerRowHandles.selectedColor
            let rowSelectionRectangle = gui.components.shapes.sequencerRowSelectionRectangles[selectedRowIndex]
            rowSelectionRectangle.stroke = gui.configurations.sequencerRowHandles.selectedColor
            gui.components.domElements.images.trashClosedIcon.style.display = 'block'
            gui.components.domElements.images.trashOpenIcon.style.display = 'none'

            gui.components.shapes.sequencerRowHandles[selectedRowIndex].translation.x = mouseX
            gui.components.shapes.sequencerRowHandles[selectedRowIndex].translation.y = mouseY

            // check if the row handle is within range to be placed in the trash bin. if so, move the handle to the center of the trash bin.
            centerOfTrashBinX = gui.configurations.noteTrashBin.left + (gui.configurations.noteTrashBin.width / 2)
            centerOfTrashBinY = gui.configurations.noteTrashBin.top + (gui.configurations.noteTrashBin.height / 2)
            let withinHorizontalBoundaryOfTrashBin = (mouseX >= gui.configurations.noteTrashBin.left - gui.configurations.mouseEvents.notePlacementPadding) && (mouseX <= gui.configurations.noteTrashBin.left + gui.configurations.noteTrashBin.width + gui.configurations.mouseEvents.notePlacementPadding)
            let withinVerticalBoundaryOfTrashBin = (mouseY >= gui.configurations.noteTrashBin.top - gui.configurations.mouseEvents.notePlacementPadding) && (mouseY <= gui.configurations.noteTrashBin.top + gui.configurations.noteTrashBin.height + gui.configurations.mouseEvents.notePlacementPadding)
            if (withinHorizontalBoundaryOfTrashBin && withinVerticalBoundaryOfTrashBin) {
                circle.translation.x = centerOfTrashBinX
                circle.translation.y = centerOfTrashBinY
                rowSelectionRectangle.stroke = "red"
                rowSelecionTracker.removeRow = true;
                circle.stroke = "red"
                gui.components.domElements.images.trashClosedIcon.style.display = 'none'
                gui.components.domElements.images.trashOpenIcon.style.display = 'block'
                gui.components.shapes.noteTrashBinContainer.stroke = 'red'
            } else {
                rowSelecionTracker.removeRow = false;
                gui.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            }

            let xChangeFromStart = gui.components.shapes.sequencerRowHandles[selectedRowIndex].translation.x - rowSelecionTracker.rowHandleStartingPosition.x
            let yChangeFromStart = gui.components.shapes.sequencerRowHandles[selectedRowIndex].translation.y - rowSelecionTracker.rowHandleStartingPosition.y

            for (let shapeIndex = 0; shapeIndex < rowSelecionTracker.shapes.length; shapeIndex++) {
                rowSelecionTracker.shapes[shapeIndex].translation.x = rowSelecionTracker.shapesOriginalPositions[shapeIndex].x + xChangeFromStart;
                rowSelecionTracker.shapes[shapeIndex].translation.y = rowSelecionTracker.shapesOriginalPositions[shapeIndex].y + yChangeFromStart;
            }

            for (let domElementIndex = 0; domElementIndex < rowSelecionTracker.domElements.length; domElementIndex++) {
                rowSelecionTracker.domElements[domElementIndex].style.left = "" + (rowSelecionTracker.domElementsOriginalPositions[domElementIndex].left + xChangeFromStart) + "px"
                rowSelecionTracker.domElements[domElementIndex].style.top = "" + (rowSelecionTracker.domElementsOriginalPositions[domElementIndex].top + yChangeFromStart) + "px";
            }

            // if the row is far enough away from the sequencer, we will throw it out
            let sequencerLeftBoundary = gui.configurations.sequencer.left - gui.configurations.mouseEvents.notePlacementPadding
            let sequencerRightBoundary = (gui.configurations.sequencer.left + gui.configurations.sequencer.width) + gui.configurations.mouseEvents.notePlacementPadding
            let sequencerTopBoundary = gui.configurations.sequencer.top - gui.configurations.mouseEvents.notePlacementPadding
            let sequencerBottomBoundary = gui.configurations.sequencer.top + ((sequencer.numberOfRows - 1) * gui.configurations.sequencer.spaceBetweenRows) + gui.configurations.mouseEvents.notePlacementPadding
            let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - gui.configurations.mouseEvents.throwRowAwaySidesPadding) || (mouseX >= sequencerRightBoundary + gui.configurations.mouseEvents.throwRowAwaySidesPadding)
            let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - gui.configurations.mouseEvents.throwRowAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + gui.configurations.mouseEvents.throwRowAwayTopAndBottomPadding)
            if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                circle.stroke = "red"
                rowSelectionRectangle.stroke = "red"
                rowSelecionTracker.removeRow = true;
                gui.components.domElements.images.trashClosedIcon.style.display = 'none'
                gui.components.domElements.images.trashOpenIcon.style.display = 'block'
                gui.components.shapes.noteTrashBinContainer.stroke = 'red'
            }

            for(let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
                if (rowIndex === selectedRowIndex) {
                    continue;
                }
                let rowHandleActualVerticalLocation = gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * rowIndex) + gui.configurations.sequencerRowHandles.topPadding;
                let rowHandleActualHorizontalLocation = gui.configurations.sequencer.left + gui.configurations.sequencerRowHandles.leftPadding;
                let topLimit = rowHandleActualVerticalLocation - gui.configurations.mouseEvents.notePlacementPadding
                let bottomLimit = rowHandleActualVerticalLocation + gui.configurations.mouseEvents.notePlacementPadding
                let leftLimit = rowHandleActualHorizontalLocation - gui.configurations.mouseEvents.notePlacementPadding
                let rightLimit = rowHandleActualHorizontalLocation + gui.configurations.mouseEvents.notePlacementPadding + gui.configurations.sequencer.width

                if (mouseX >= leftLimit && mouseX <= rightLimit && mouseY >= topLimit && mouseY <= bottomLimit) {
                    sequencer.moveRowToNewIndex(selectedRowIndex, rowIndex);
                    selectedRowIndex = rowIndex
                    redrawSequencer();
                    break; // we found the row that the note will be placed on, so stop iterating thru rows early
                }
            }
        }
    }

    function refreshWindowMouseMoveEvent() {
        window.removeEventListener('mousemove', windowMouseMoveEventHandler);
        window.addEventListener('mousemove', windowMouseMoveEventHandler);
    }

    // lifting your mouse anywhere means you're no longer click-dragging
    window.addEventListener('mouseup', (event) => {
        // handle letting go of notes
        if (gui.circleBeingMoved !== null) {
            /**
             * this is the workflow for determining where to put a circle that we were click-dragging once we release the mouse.
             * how this workflow works (todo: double check that this is all correct):
             * - in the circle.mousedown event, we: 
             *   - note down initial information about circle starting state before being moved
             * - in the window.mousemove event, we:
             *   - check for circle collision with the trash bin. if colliding, cricle's new row is -3.
             *   - check for collision with a sequencer row. if colliding, new row is >= 0 (specifically, the index of the sequencer row it's colliding with).
             *   - if colliding with nothing, new row is -1.
             * - in this window.mouseup event, how we handle states, based on the values we previously set in the window.mousemove event:
             *   - if the note isn't colliding with a sequencer row or the trash bin, put it back wherever it came from, with no change.
             *   - if the note is on a row, remove it from wherever it came from, and add it wherever it was placed (even if new and old row are the same, 
             *     in order to allow for a simple way to move a note to a different place on the same row)
             *   - if the note is in the trash bin, throw it away, unless it came from the note bank, in which case we just but it back onto the note bank 
             *     (i.e. put it back where it came from).
             *   - to do all of this, we will (in some cases) manually change the values of some of these variables around based on what combination of 
             *     values we have stored, then make changes to the state of the sequencer using the following set of rules:
             *     - how to handle different 'old row' values:
             *       - if old row is >= 0, remove the note from its old row
             *       - if old row is < 0, do NOT remove the note from its old row. 
             *     - how to handle different 'new row' values:
             *       - if new row is >= 0, place the note into its new row
             *       - if new row < 0, do NOT place the note into a new row
             *     - this means: 
             *       - old row >= 0, new row < 0: is a delete operation. delete a note from its old row, without adding it back anywhere.
             *       - old row >= 0, new row >= 0: is a move-note operation. move note from one row to another or to a new place in the same row.
             *       - old row < 0, new row < 0: means a note was removed from the note bank but didn't end up on a row. there will be no change.
             *       - old row < 0, new row >= 0: takes a note from the note bank and adds it to a new row, without removing it from an old row
             *         (since there's no real reason to actually remove anything when "removing" a note from the note bank. instead we just 
             *         create a new node for the sequencer's note list, and place that onto the row it's being added to).
             */
            gui.circleBeingMoved.stroke = "transparent"
            // note down starting state, current state.
            circleNewXPosition = gui.circleBeingMovedStartingPositionX // note, circle starting position was recorded when we frist clicked the circle.
            circleNewYPosition = gui.circleBeingMovedStartingPositionY // if the circle is not colliding with a row etc., it will be put back to its old place, so start with the 'old place' values.
            circleNewBeatNumber = gui.circleBeingMovedOldBeatNumber
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            // check for collisions with things (sequencer rows, the trash bin, etc.)and make adjustments accordingly, so that everything will be handled as explained in the block comment above
            if (gui.circleBeingMovedNewRow >= 0) { // this means the note is being put onto a new sequencer row
                circleNewXPosition = gui.circleBeingMoved.translation.x // the note should have already been 'snapped' to its new row in the 'mousemove' event, so just commit to that new location
                circleNewYPosition = gui.circleBeingMoved.translation.y
                circleNewBeatNumber = gui.circleBeingMovedNewBeatNumber
            } else if (gui.circleBeingMovedNewRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW) { // if the note isn't being put onto any row, just put it back wherever it came from
                circleNewXPosition = gui.circleBeingMovedStartingPositionX
                circleNewYPosition = gui.circleBeingMovedStartingPositionY
                gui.circleBeingMovedNewRow = gui.circleBeingMovedOldRow // replace the 'has no row' constant value with the old row number that this was taken from (i.e. just put it back where it came from!)
                circleNewBeatNumber = gui.circleBeingMovedOldBeatNumber
            } else if (gui.circleBeingMovedNewRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN) { // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
                if (gui.circleBeingMovedOldRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK) { // if the note being thrown away came from the note bank, just put it back in the note bank.
                    gui.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK
                } else { // only bother throwing away things that came from a row (throwing away note bank notes is pointless)
                    removeCircleFromDisplay(gui.circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles and from the two.js canvas
                }
            }
            // we are done checking for collisions with things and updating 'old row' and 'new row' values, so now move on to updating the sequencer
            gui.circleBeingMoved.translation.x = circleNewXPosition
            gui.circleBeingMoved.translation.y = circleNewYPosition
            gui.circleBeingMoved.guiData.row = gui.circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
            if (gui.circleBeingMovedOldRow >= 0) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                node = sequencer.rows[gui.circleBeingMovedOldRow].removeNode(gui.circleBeingMoved.guiData.label)
            }
            // add the moved note to its new sequencer row.
            if (gui.circleBeingMovedNewRow >= 0) {
                if (node === null) { // this should just mean the circle was pulled from the note bank, so we need to create a node for it
                    if (gui.circleBeingMovedOldRow >= 0) { // should be an unreachable case, just checking for safety
                        throw "unexpected case: node was null but 'circleBeingMovedOldRow' was not < 0. circleBeingMovedOldRow: " + gui.circleBeingMovedOldRow + ". node: " + node + "."
                    }
                    // create a new node for the sample that this note bank circle was for. note bank circles have a sample in their GUI data, 
                    // but no real node that can be added to the drum sequencer's data structure, so we need to create one.
                    node = gui.sampleBankNodeGenerator.createNewNodeForSample(gui.circleBeingMoved.guiData.sampleName)
                    gui.circleBeingMoved.guiData.label = node.label // the newly generated node will also have a real generated ID (label), use that
                    drawNoteBankCircleForSample(gui.circleBeingMoved.guiData.sampleName) // if the note was taken from the sound bank, refill the sound bank
                }
                // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                let newNodeTimestampMillis = sequencer.loopLengthInMillis * ((circleNewXPosition - gui.configurations.sequencer.left) / gui.configurations.sequencer.width)
                node.priority = newNodeTimestampMillis
                // add the moved note to its new sequencer row
                sequencer.rows[gui.circleBeingMovedNewRow].insertNode(node, gui.circleBeingMoved.guiData.label)
                node.data.lastScheduledOnIteration = Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED // mark note as 'not played yet on current iteration'
                node.data.beat = circleNewBeatNumber
                gui.circleBeingMoved.guiData.beat = circleNewBeatNumber
            }
        }
        if (selectedRowIndex !== null) {
            // un-selecting the row will be handled in 'redraw', as long as we set selected row index to null here
            if (rowSelecionTracker.removeRow) {
                sequencer.removeRowAtIndex(selectedRowIndex);
            }
            selectedRowIndex = null
            redrawSequencer();
        }
        gui.circleBeingMoved = null
        gui.setNoteTrashBinVisibility(false)
        selectedRowIndex = null
    });

    // making a cleaner (less redundant) way to call 'loadSample()', which matches what we need for the drum sequencer.
    // the simplifying assumption here is that "sampleName" will always match the name of the file (without its file extension).
    function loadDrumSample(directoryPath, sampleName, fileExtension) {
        loadAudioSample(sampleName, directoryPath + sampleName + fileExtension)
    }

    // load an audio sample from a file. to load from a local file, this script needs to be running on a server.
    function loadAudioSample(sampleName, url) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
      
        // Decode asynchronously
        request.onload = function() {
            _audioContext.decodeAudioData(request.response, function(buffer) {
            samples[sampleName].file = buffer; // once we get a response, write the returned data to the corresponding attribute in our 'samples' object
          }, (error) => {
              console.log("Error caught when attempting to load file with URL: '" + url + "'. Error: '" + error + "'.")
          });
        }
        request.send();
    }

    function initializeIcons(hideIcons=false) {
        if (hideIcons) { // gives us a mechanism to leave the icons off the sequencer display if we want to
            for (key of Object.keys(gui.components.domElements.images)) {
                gui.components.domElements.images[key].remove()
            }
            return;
        }
        // "add row" button icon
        gui.components.domElements.images.addIcon.style.width = "" + gui.configurations.addRowButton.icon.width + "px"
        gui.components.domElements.images.addIcon.style.height = "" + gui.configurations.addRowButton.icon.height + "px"
        let addRowButtonTop = gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * (sequencer.rows.length - 1)) + gui.configurations.addRowButton.topPadding
        let addRowButtonLeft = gui.configurations.sequencer.left + (gui.configurations.sequencer.width / 2) + gui.configurations.addRowButton.leftPadding - (gui.configurations.addRowButton.width / 2)
        gui.components.domElements.images.addIcon.style.top = "" + (addRowButtonTop) + "px"
        gui.components.domElements.images.addIcon.style.left = "" + (addRowButtonLeft) + "px"
        // trash bin icon: open
        gui.components.domElements.images.trashOpenIcon.style.width = "" + gui.configurations.noteTrashBin.icon.width + "px"
        gui.components.domElements.images.trashOpenIcon.style.height = "" + gui.configurations.noteTrashBin.icon.height + "px"
        gui.components.domElements.images.trashOpenIcon.style.left = "" + gui.configurations.noteTrashBin.left + "px"
        gui.components.domElements.images.trashOpenIcon.style.top = "" + gui.configurations.noteTrashBin.top + "px"
        // trash bin icon: closed
        gui.components.domElements.images.trashClosedIcon.style.width = "" + gui.configurations.noteTrashBin.icon.width + "px"
        gui.components.domElements.images.trashClosedIcon.style.height = "" + gui.configurations.noteTrashBin.icon.height + "px"
        gui.components.domElements.images.trashClosedIcon.style.left = "" + gui.configurations.noteTrashBin.left + "px"
        gui.components.domElements.images.trashClosedIcon.style.top = "" + gui.configurations.noteTrashBin.top + "px"
        // "clear all rows" button
        gui.components.domElements.images.clearAllIcon.style.width = "" + gui.configurations.clearAllNotesButton.icon.width + "px"
        gui.components.domElements.images.clearAllIcon.style.height = "" + gui.configurations.clearAllNotesButton.icon.height + "px"
        gui.components.domElements.images.clearAllIcon.style.left = "" + gui.configurations.clearAllNotesButton.left + "px"
        gui.components.domElements.images.clearAllIcon.style.top = "" + gui.configurations.clearAllNotesButton.top + "px"
        // restart
        gui.components.domElements.images.restartIcon.style.width = "" + gui.configurations.restartSequencerButton.icon.width + "px"
        gui.components.domElements.images.restartIcon.style.height = "" + gui.configurations.restartSequencerButton.icon.height + "px"
        gui.components.domElements.images.restartIcon.style.left = "" + gui.configurations.restartSequencerButton.left + "px"
        gui.components.domElements.images.restartIcon.style.top = "" + gui.configurations.restartSequencerButton.top + "px"
        // pause
        gui.components.domElements.images.pauseIcon.style.width = "" + gui.configurations.pauseButton.icon.width + "px"
        gui.components.domElements.images.pauseIcon.style.height = "" + gui.configurations.pauseButton.icon.height + "px"
        gui.components.domElements.images.pauseIcon.style.left = "" + gui.configurations.pauseButton.left + "px"
        gui.components.domElements.images.pauseIcon.style.top = "" + gui.configurations.pauseButton.top + "px"
        // play
        gui.components.domElements.images.playIcon.style.width = "" + gui.configurations.pauseButton.icon.width + "px"
        gui.components.domElements.images.playIcon.style.height = "" + gui.configurations.pauseButton.icon.height + "px"
        gui.components.domElements.images.playIcon.style.left = "" + gui.configurations.pauseButton.left + "px"
        gui.components.domElements.images.playIcon.style.top = "" + gui.configurations.pauseButton.top + "px"
        // clear row buttons -- one per row
        for (icon of gui.components.domElements.iconLists.clearRowIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.clearRowIcons = [];
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            // create a new copy of the original clear row icon
            let clearRowIcon = gui.components.domElements.images.clearRowIcon.cloneNode()
            // make the copy visible
            clearRowIcon.style.display = 'block'
            // set the copy's position -- we will have one per row
            clearRowIcon.style.width = "" + gui.configurations.clearRowButtons.icon.width + "px";
            clearRowIcon.style.height = "" + gui.configurations.clearRowButtons.icon.height + "px"
            clearRowIcon.style.left = "" + (gui.configurations.sequencer.left + gui.configurations.sequencer.width + gui.configurations.clearRowButtons.leftPaddingPerRow) + "px"
            clearRowIcon.style.top = "" + (gui.configurations.sequencer.top + (rowIndex * gui.configurations.sequencer.spaceBetweenRows) + gui.configurations.clearRowButtons.topPaddingPerRow) + "px"
            // add event listeners to our icon
            clearRowIcon.removeEventListener('click', (event) => {
                clearRowButtonClickHandler(event, rowIndex)
            });
            clearRowIcon.addEventListener('click', (event) => {
                clearRowButtonClickHandler(event, rowIndex)
            });
            // add the copy to the dom and to our list that tracks these icons
            gui.components.domElements.iconLists.clearRowIcons.push(clearRowIcon)
            document.body.appendChild(clearRowIcon)
        }
        gui.components.domElements.images.clearRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // lock / unlock (quantize / unquantize) row buttons -- need one per row
        for (icon of gui.components.domElements.iconLists.lockedIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.lockedIcons = [];
        for (icon of gui.components.domElements.iconLists.unlockedIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.unlockedIcons = [];
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            // make copies of the original image so that we can freely throw them away or add more
            let lockedIcon = gui.components.domElements.images.lockedIcon.cloneNode()
            let unlockedIcon = gui.components.domElements.images.unlockedIcon.cloneNode()
            // set visibilty of each icon based on the row's current quantization setting
            // really, we could just make whichever icon is necessary and not make an invisible copy of the other
            // one, but making an invisible copy leaves the door open for optimizing the 'quantize' button a bit later.
            // there is a bit of unnecessary code duplication right now because of this.
            // may clean this up later, for now it's fine.
            if (sequencer.rows[rowIndex].quantized) {
                lockedIcon.style.display = 'block'
                unlockedIcon.style.display = 'none'
            } else {
                lockedIcon.style.display = 'none'
                unlockedIcon.style.display = 'block'
            }
            // put each lock icon into the right place, resize it, etc.
            let lockIconsVerticalPosition = gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * rowIndex) + gui.configurations.subdivionLineTextInputs.topPaddingPerRow + gui.configurations.quantizationButtons.icon.topPaddingPerRow
            let lockIconsHorizontalPosition = gui.configurations.sequencer.left + gui.configurations.sequencer.width + gui.configurations.quantizationButtons.icon.leftPaddingPerRow
            lockedIcon.style.width = "" + gui.configurations.quantizationButtons.icon.width + "px"
            lockedIcon.style.height = "" + gui.configurations.quantizationButtons.icon.height + "px"
            lockedIcon.style.left = "" + lockIconsHorizontalPosition + "px"
            lockedIcon.style.top = "" + lockIconsVerticalPosition + "px"
            unlockedIcon.style.width = "" + gui.configurations.quantizationButtons.icon.width + "px"
            unlockedIcon.style.height = "" + gui.configurations.quantizationButtons.icon.height + "px"
            unlockedIcon.style.left = "" + lockIconsHorizontalPosition + "px"
            unlockedIcon.style.top = "" + lockIconsVerticalPosition + "px"
            // add event listeners
            lockedIcon.removeEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, false)
            });
            lockedIcon.addEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, false)
            });
            unlockedIcon.removeEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, true)
            });
            unlockedIcon.addEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, true)
            });
            // add the icons to the dom and to our list that tracks these icons
            gui.components.domElements.iconLists.lockedIcons.push(lockedIcon)
            gui.components.domElements.iconLists.unlockedIcons.push(unlockedIcon)
            document.body.appendChild(lockedIcon)
            document.body.appendChild(unlockedIcon)
        }
        gui.components.domElements.images.unlockedIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        gui.components.domElements.images.lockedIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
    }

    function initializeQuantizationCheckboxActionListeners() {
        if (!gui.configurations.hideIcons) {
            return 
        }
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let checkbox = gui.components.domElements.checkboxes.quantizationCheckboxes[rowIndex]
            checkbox.removeEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, checkbox.checked)
            });
            checkbox.addEventListener('click', (event) => {
                setQuantizationButtonClickHandler(event, rowIndex, checkbox.checked)
            });
        }
    }

    function setQuantizationButtonClickHandler(event, rowIndex, quantize) {
        if (sequencer.rows[rowIndex].getNumberOfSubdivisions() === 0) {
            // you can't quantize a row if it has 0 subdivisions, so automatically change the value to 1 in this case
            updateNumberOfSubdivisionsForRow(1, rowIndex)
        }
        sequencer.rows[rowIndex].setQuantization(quantize)
        redrawSequencer();
    }

    // todo: clean up the block comments for the two 'snap to' methods below for clarity

    /**
     * for a given x coordinate and number of subdivisions, return what subdivision
     * number (i.e. what beat number) the x coordinate falls closest to.
     * 
     * this is used as part of 'snap note to quantized row' logic.
     * 
     * for a given mouse x coordinate and number of subdivisions, we need to find the 
     * x coordinate of the subdivision line that is closest to the mouse position. in 
     * other words, we need to quantize the mouse x position to the nearest subdivision 
     * line. this will be used for 'snapping' notes to subdivision lines when moving 
     * them on quantized sequencer rows.
     * we will break the logic for doing this into two parts.
     * 
     * the first part of doing this is handled in this function -- we need to find the
     * index of the closest subdivision line, in other words we need to find the beat
     * number that we should quantize to for the given mouse x coordinate and number
     * of subdivisions.
     * 
     * the other piece we will then need to do is to get the x position for a beat
     * number. that will be handled elsewhere.
     */
    function getIndexOfClosestSubdivisionLine(mouseX, numberOfSubdivisions) {
        let sequencerLeftEdge = gui.configurations.sequencer.left
        let widthOfEachSubdivision = gui.configurations.sequencer.width / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencer / widthOfEachSubdivision)
        let mouseIsCloserToRightSubdivisionThanLeft = (mouseXWithinSequencer % widthOfEachSubdivision) > (widthOfEachSubdivision / 2)
        let subdivisionToSnapTo = subdivisionNumberToLeftOfMouse
        if (mouseIsCloserToRightSubdivisionThanLeft) {
            subdivisionToSnapTo += 1
        }
        return gui.confineNumberToBounds(subdivisionToSnapTo, 0, numberOfSubdivisions - 1)
    }
    
    /**
     * for a given subdivision number and number of subdivisions, return
     * the x coordinate of that subdivision number.
     * 
     * this logic is part of our 'snap note to quantized sequencer row' logic.
     * see the block comment above for info on how this function is used.
     * 
     * this function is the second part of the logic explained in the block comment 
     * above, where we find the x coordinate for a given beat number.
     */
    function getXPositionOfSubdivisionLine(subdivisionIndex, numberOfSubdivisions) {
        let sequencerLeftEdge = gui.configurations.sequencer.left
        let widthOfEachSubdivision = gui.configurations.sequencer.width / numberOfSubdivisions
        return sequencerLeftEdge + (widthOfEachSubdivision * subdivisionIndex)
    }

    // The SVG renderer's top left corner isn't necessarily located at (0,0), 
    // so our mouse / touch events may be misaligned until we correct them.
    // event.pageX and event.pageY are read-only, so this method creates and 
    // returns a new event object rather than modifying the one that was passed in.
    // Put any event-specific calls, such as preventDefault(), before this method is called.
    // TODO: This currently only supports mouse events. Add support for touch events.
    function adjustEventCoordinates(event) {
        let svgScale = $(two.renderer.domElement).height() / two.height;
        let svgOrigin = $('#draw-shapes')[0].getBoundingClientRect();
        return {
            pageX: (event.pageX - svgOrigin.left) / svgScale,
            pageY: (event.pageY - svgOrigin.top) / svgScale
        }
    }

    function initializeSimpleDefaultSequencerPattern(){
        sequencer.setNumberOfRows(0)
        addEmptySequencerRow();
        sequencer.rows[0].setNumberOfSubdivisions(16)
        sequencer.rows[0].setNumberOfReferenceLines(4)
        sequencer.rows[0].setQuantization(true)
        addEmptySequencerRow();
        sequencer.rows[1].setNumberOfSubdivisions(8)
        sequencer.rows[1].setNumberOfReferenceLines(4)
        sequencer.rows[1].setQuantization(true)
        addEmptySequencerRow();
        sequencer.rows[2].setNumberOfSubdivisions(8)
        sequencer.rows[2].setNumberOfReferenceLines(4)
        sequencer.rows[2].setQuantization(true)
        addEmptySequencerRow();
        sequencer.rows[3].setNumberOfSubdivisions(8)
        sequencer.rows[3].setNumberOfReferenceLines(4)
        sequencer.rows[3].setQuantization(false)
        addEmptySequencerRow();
        sequencer.rows[4].setNumberOfSubdivisions(4)
        sequencer.rows[4].setNumberOfReferenceLines(4)
        sequencer.rows[4].setQuantization(true)
    }

    // set up a default initial drum sequence with some notes in it.
    function initializeComplexDefaultSequencerPattern(){
        sequencer.setNumberOfRows(6)
        sequencer.rows[0].setNumberOfSubdivisions(8)
        sequencer.rows[0].setNumberOfReferenceLines(4)
        sequencer.rows[0].setQuantization(true)
        sequencer.rows[1].setNumberOfSubdivisions(4)
        sequencer.rows[1].setQuantization(true)
        sequencer.rows[2].setNumberOfSubdivisions(2)
        sequencer.rows[3].setNumberOfSubdivisions(0)
        sequencer.rows[4].setNumberOfSubdivisions(5)
        sequencer.rows[4].setQuantization(true)
        sequencer.rows[5].setNumberOfReferenceLines(8)
        sequencer.rows[5].setNumberOfSubdivisions(7)
        sequencer.rows[5].setQuantization(true)
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), 0, 
        {
            lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: HI_HAT_CLOSED,
            beat: 0,
        }
        ))
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 8) * 3, 
        {
            lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: WOODBLOCK,
            beat: 3,
        }
        ))
        sequencer.rows[1].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 4) * 1, 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: HI_HAT_OPEN,
                beat: 1,
            }
        ))
        sequencer.rows[2].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), ((sequencer.loopLengthInMillis / 4) * 2), 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: SNARE,
                beat: Sequencer.NOTE_IS_NOT_QUANTIZED,
            }
        ))
        sequencer.rows[3].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 4) * 3, 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: BASS_DRUM,
                beat: Sequencer.NOTE_IS_NOT_QUANTIZED,
            }
        ))
    }

    // initialize Two.js library object and append it to the given DOM element
    function initializeTwoJs(twoJsDomElement) {
        return new Two({
            fullscreen: true,
            type: Two.Types.svg
        }).appendTo(twoJsDomElement);
    }

    // set up AudioContext and requestAnimationFrame, so that they will work nicely
    // with the 'AudioContextMonkeyPatch.js' library. contents of this method were 
    // taken and adjusted from the 'Web Audio Metronome' repo by cwilso on GitHub: 
    // https://github.com/cwilso/metronome
    function setUpAudioAndAnimationForWebAudioApi() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        
        // Shim the requestAnimationFrame API, with a setTimeout fallback
        window.requestAnimationFrameShim = (function(){
            return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(callback){
                window.setTimeout(callback, 1000 / 60);
            };
        })();
    }

    function drawAllNoteBankCircles(){
        // draw the circles (i.e. notes) that are in the note bank
        for (let noteBankSampleName of sampleNameList) {
            drawNoteBankCircleForSample(noteBankSampleName)
        }
    }

    function drawNotesToReflectSequencerCurrentState(){
        // draw all notes that are in the sequencer before the sequencer starts (aka the notes of the initial example drum sequence)
        for(let sequencerRowIndex = 0; sequencerRowIndex < sequencer.numberOfRows; sequencerRowIndex++) {
            let noteToDraw = sequencer.rows[sequencerRowIndex]._notesList.head // we are reading notes lists directly so that we can draw them, but making no changes to them
            while (noteToDraw !== null) {
                let xPosition = gui.configurations.sequencer.left + (gui.configurations.sequencer.width * (noteToDraw.priority / sequencer.loopLengthInMillis))
                let yPosition = gui.configurations.sequencer.top + (sequencerRowIndex * gui.configurations.sequencer.spaceBetweenRows)
                let sampleName = noteToDraw.data.sampleName
                let row = sequencerRowIndex
                let label = noteToDraw.label
                let beat = noteToDraw.data.beat
                drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat)
                noteToDraw = noteToDraw.next
            }
        }
    }

    // draw a new circle in the note bank based on its sampleName.
    // this is called when initializing the starting set of cirlces (i.e. notes) in the 
    // notes bank, and also called when a note from the note bank is placed on a row and 
    // we need to refill the note bank for the note that was just placed.
    function drawNoteBankCircleForSample(sampleName) {
        // figure out which index in the 'sampleNameList' the given sample name is. this will be used to determine physical positioning of the circle within the sample bank
        let indexOfSampleInNoteBank = sampleNameList.findIndex(elementFromList => elementFromList === sampleName);
        if (indexOfSampleInNoteBank === -1) { // we don't expect to reach this case, where the given sample isn't found in the sample names list
            throw "unexpected problem: couldn't find the given sample in the sample list when trying to add it to the note bank. was looking for sample name: " + sampleName + ". expected sample name to be one of: " + sampleNameList + "."
        }
        let xPosition = gui.configurations.sampleBank.left + gui.configurations.sampleBank.borderPadding + (gui.configurations.notes.unplayedCircleRadius / 2)
        let yPosition = gui.configurations.sampleBank.top + gui.configurations.sampleBank.borderPadding + (indexOfSampleInNoteBank * gui.configurations.notes.unplayedCircleRadius) + (indexOfSampleInNoteBank * gui.configurations.sampleBank.spaceBetweenNotes)
        let row = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
        /**
         * the top note in the note bank will have label '-1', next one down will be '-2', etc.
         * these negative number labels will still be unique to a particular circle in the note bank,
         * and these IDs will be replaced with a real, normal label (a generated ID) once each note
         * bank circle is taken fom the note bank and placed onto a real row.
         */
        let label = (indexOfSampleInNoteBank + 1) * -1 // see block comment above for info about '-1' here
        drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, Sequencer.NOTE_IS_NOT_QUANTIZED)
    }

    // create a new circle (i.e. note) on the screen, with the specified x and y position. color is determined by sample name. 
    // values given for sample name, label, and row number are stored in the circle object to help the GUI keep track of things.
    // add the newly created circle to the list of all drawn cricles.
    function drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat) {
        // initialize the new circle and set its colors
        let circle = two.makeCircle(xPosition, yPosition, gui.configurations.notes.unplayedCircleRadius)
        circle.fill = samples[sampleName].color
        circle.stroke = 'transparent'

        // add mouse events to the new circle
        two.update() // this 'update' needs to go here because it is what generates the new circle's _renderer.elem 
        
        // add border to circle on mouseover
        circle._renderer.elem.addEventListener('mouseenter', (event) => {
            circle.stroke = 'black'
            circle.linewidth = 2
        });
        // remove border from circle when mouse is no longer over it
        circle._renderer.elem.addEventListener('mouseleave', (event) => {
            circle.stroke = 'transparent'
        });
        // select circle (for moving) if we click it
        circle._renderer.elem.addEventListener('mousedown', (event) => {
            gui.circleBeingMoved = circle
            gui.circleBeingMovedStartingPositionX = gui.circleBeingMoved.translation.x
            gui.circleBeingMovedStartingPositionY = gui.circleBeingMoved.translation.y
            gui.circleBeingMovedOldRow = gui.circleBeingMoved.guiData.row
            gui.circleBeingMovedNewRow = gui.circleBeingMovedOldRow
            gui.circleBeingMovedOldBeatNumber = gui.circleBeingMoved.guiData.beat
            gui.circleBeingMovedNewBeatNumber = gui.circleBeingMovedOldBeatNumber
            gui.setNoteTrashBinVisibility(true)
            gui.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            sequencer.playDrumSampleNow(gui.circleBeingMoved.guiData.sampleName)
        });

        // add info to the circle object that the gui uses to keep track of things
        circle.guiData = {}
        circle.guiData.sampleName = sampleName
        circle.guiData.row = row
        circle.guiData.label = label
        circle.guiData.beat = beat

        // add circle to list of all drawn circles
        gui.allDrawnCircles.push(circle)
    }

    // remove a circle from the 'allDrawnCircles' list and two.js canvas, based on its label.
    // this is meant to be used during deletion of notes from the sequencer, with the idea being that deleting
    // them from this list and maybe from a few other places will clear up clutter, and hopefully allow the 
    // deleted circles to get garbage-collected.
    // note that this method _only_ deletes circles from the _display_, not from the underlying sequencer data
    // structure, that needs to be handled somewhere else separately.
    function removeCircleFromDisplay(label){``
        let indexOfListItemToRemove = gui.allDrawnCircles.findIndex(elementFromList => elementFromList.guiData.label === label);
        if (indexOfListItemToRemove === -1) { //  we don't expect to reach this case, where a circle with the given label isn't found in the list
            throw "unexpected problem: couldn't find the circle with the given label in the list of all drawn circles, when trying to delete it. the given label was: " + label + ". full list (labels only): " + gui.allDrawnCircles.map((item) => item.guiData.label) + "."
        }
        let listOfOneRemovedElement = gui.allDrawnCircles.splice(indexOfListItemToRemove, 1) // this should go in and delete the element we want to delete!
        if (listOfOneRemovedElement.length !== 1) {
            throw "unexpected problem: we expected exactly one circle to be removed from the allDrawnCricles list, but some other number of circles were removed. number removed: " + listOfOneRemovedElement.length
        }
        // now we should remove the circle from the two.js canvas as well
        listOfOneRemovedElement[0].remove()
    }

    /**
     * remove all circles from the display.
     * this has _no effect_ on the underlying sequencer data structure, it only removes circles _from the GUI display_.
     */
    function removeAllCirclesFromDisplay() {
        let allDrawnCirclesCopy = [...gui.allDrawnCircles] // make a copy of the drawn circles list so we can iterate through its circles while also removing the items from the original list
        for (let note of allDrawnCirclesCopy) {
            removeCircleFromDisplay(note.guiData.label)
        }
    }

    function addPauseButtonActionListeners() {
        // remove event listeners to avoid duplicates
        gui.components.shapes.pauseButtonShape._renderer.elem.removeEventListener('click', pauseButtonClickHandler)
        gui.components.domElements.images.pauseIcon.removeEventListener('click', pauseButtonClickHandler)
        gui.components.domElements.images.playIcon.removeEventListener('click', pauseButtonClickHandler)
        // then add the event listeners
        gui.components.shapes.pauseButtonShape._renderer.elem.addEventListener('click', pauseButtonClickHandler)
        gui.components.domElements.images.pauseIcon.addEventListener('click', pauseButtonClickHandler)
        gui.components.domElements.images.playIcon.addEventListener('click', pauseButtonClickHandler)
    }

    function pauseButtonClickHandler(event) {
        gui.lastButtonClickTimeTrackers.pause.lastClickTime = sequencer.currentTime
        gui.components.shapes.pauseButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        togglePaused()
    }

    function initializeRectangleShape(top, left, height, width, radius=4) {
        // new button rectangle: make a rectangle with rounded corners
        button = two.makeRoundedRectangle(left + (width / 2), top + (height / 2), width, height, radius)
        button.linewidth = gui.configurations.sequencer.lineWidth
        button.stroke = gui.configurations.sequencer.color
        button.fill = 'transparent'
        return button
    }

    function initializeButtonPerSequencerRow(topPaddingPerRow, leftPaddingPerRow, height, width) {
        shapes = []
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let top = gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * rowIndex) + topPaddingPerRow
            let left = gui.configurations.sequencer.left + gui.configurations.sequencer.width + leftPaddingPerRow
            shapes[rowIndex] = initializeRectangleShape(top, left, height, width)
        }
        return shapes
    }

    function initializeSequencerRowHandlesActionListeners() {
        for (let rowIndex = 0; rowIndex < gui.components.shapes.sequencerRowHandles.length; rowIndex++) {
            let circle = gui.components.shapes.sequencerRowHandles[rowIndex];
            let rowSelectionRectangle = gui.components.shapes.sequencerRowSelectionRectangles[rowIndex]

            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', (event) => {
                if (selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
                    circle.stroke = 'black'
                    circle.linewidth = 2
                    circle.fill = gui.configurations.sequencerRowHandles.unselectedColor
                    rowSelectionRectangle.stroke = gui.configurations.sequencerRowHandles.unselectedColor
                }
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', (event) => {
                circle.stroke = 'transparent'
                circle.fill = gui.configurations.sequencerRowHandles.unselectedColor
                rowSelectionRectangle.stroke = 'transparent'
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', (event) => {
                // save relevant info about whichever row is selected
                initializeRowSelectionVariablesAndVisuals(rowIndex);
            });
            // the bulk of the actual 'mouseup' logic will be handled in the window's mouseup event,
            // because if we implement snap-into-place for sequencer rows, the row handle may not actually
            // be under our mouse when we lift our mouse to drop the row into place.
            // just putting the most basic functionality for visual effects here for now.
            circle._renderer.elem.addEventListener('mouseup', (event) => {
                circle.stroke = 'black'
                circle.linewidth = 2
                circle.fill = gui.configurations.sequencerRowHandles.unselectedColor
                rowSelectionRectangle.stroke = gui.configurations.sequencerRowHandles.unselectedColor
            });
        }
    }

    function initializeRowSelectionVariablesAndVisuals(rowIndex) {
        gui.setNoteTrashBinVisibility(true)
        gui.components.shapes.noteTrashBinContainer.stroke = 'transparent'
        // save relevant info about whichever row is selected
        selectedRowIndex = rowIndex;
        rowSelecionTracker.removeRow = false // start this out false until we move the row around (i.e. into the trash bin)
        // save a list, of all the shapes that are associated with the selected row.
        // we are saving this list so that we can move them all as we move the row around.
        rowSelecionTracker.shapes = [];
        for (let circle of gui.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                rowSelecionTracker.shapes.push(circle)
            }
        }
        rowSelecionTracker.shapes.push(...gui.components.shapes.subdivisionLineLists[rowIndex])
        rowSelecionTracker.shapes.push(...gui.components.shapes.referenceLineLists[rowIndex])
        rowSelecionTracker.shapes.push(gui.components.shapes.sequencerRowLines[rowIndex])
        rowSelecionTracker.shapes.push(gui.components.shapes.sequencerRowSelectionRectangles[rowIndex])
        rowSelecionTracker.shapes.push(gui.components.shapes.clearNotesForRowButtonShapes[rowIndex])
        // this part gets a little weird. save a list of all of the starting positions of each
        // shape that is being moved. that way we can translate them proporionally to how far
        // the row handle has moved.
        rowSelecionTracker.shapesOriginalPositions = []
        for (let shape of rowSelecionTracker.shapes) {
            rowSelecionTracker.shapesOriginalPositions.push({
                x: shape.translation.x,
                y: shape.translation.y,
            });
        }
        rowSelecionTracker.rowHandleStartingPosition.x = gui.components.shapes.sequencerRowHandles[rowIndex].translation.x
        rowSelecionTracker.rowHandleStartingPosition.y = gui.components.shapes.sequencerRowHandles[rowIndex].translation.y
        // do the exact same thing for dom elements (subdivision and reference line text inputs, quantization checkbox, images) next
        rowSelecionTracker.domElements = [];
        rowSelecionTracker.domElements.push(gui.components.domElements.textInputs.subdivisionTextInputs[rowIndex])
        rowSelecionTracker.domElements.push(gui.components.domElements.textInputs.referenceLineTextInputs[rowIndex])
        if (gui.configurations.hideIcons) {
            rowSelecionTracker.domElements.push(gui.components.domElements.checkboxes.quantizationCheckboxes[rowIndex])
        } else {
            rowSelecionTracker.domElements.push(gui.components.domElements.iconLists.lockedIcons[rowIndex]);
            rowSelecionTracker.domElements.push(gui.components.domElements.iconLists.unlockedIcons[rowIndex]);
            rowSelecionTracker.domElements.push(gui.components.domElements.iconLists.clearRowIcons[rowIndex]);
        }
        rowSelecionTracker.domElementsOriginalPositions = [];
        for (let domElement of rowSelecionTracker.domElements) {
            rowSelecionTracker.domElementsOriginalPositions.push({
                left: parseInt(domElement.style.left.slice(0, -2)), // cut off "px" from the position and convert it to an integer
                top: parseInt(domElement.style.top.slice(0, -2)),
            });
        }
        // update visuals
        let circle = gui.components.shapes.sequencerRowHandles[rowIndex]
        circle.stroke = 'black'
        circle.linewidth = 2
        circle.fill = gui.configurations.sequencerRowHandles.selectedColor
        let rowSelectionRectangle = gui.components.shapes.sequencerRowSelectionRectangles[rowIndex];
        rowSelectionRectangle.stroke = gui.configurations.sequencerRowHandles.selectedColor
    }

    function addRestartSequencerButtonActionListeners() {
        // remove event listeners first to avoid duplicates
        gui.components.shapes.restartSequencerButtonShape._renderer.elem.removeEventListener('click', restartSequencerButtonClickHandler)
        gui.components.domElements.images.restartIcon.removeEventListener('click', restartSequencerButtonClickHandler)
        // then add the event listeners
        gui.components.shapes.restartSequencerButtonShape._renderer.elem.addEventListener('click', restartSequencerButtonClickHandler)
        gui.components.domElements.images.restartIcon.addEventListener('click', restartSequencerButtonClickHandler)
    }

    function restartSequencerButtonClickHandler(event) {
        gui.lastButtonClickTimeTrackers.restartSequencer.lastClickTime = sequencer.currentTime
        gui.components.shapes.restartSequencerButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        restartSequencer()
    }

    function addClearAllNotesButtonActionListeners() {
        // remove event listeners to prevent duplicates
        gui.components.shapes.clearAllNotesButtonShape._renderer.elem.removeEventListener('click', clearAllNotesButtonClickHandler)
        gui.components.domElements.images.clearAllIcon.removeEventListener('click', clearAllNotesButtonClickHandler)
        // add event listners
        gui.components.shapes.clearAllNotesButtonShape._renderer.elem.addEventListener('click', clearAllNotesButtonClickHandler)
        gui.components.domElements.images.clearAllIcon.addEventListener('click', clearAllNotesButtonClickHandler)
    }

    function clearAllNotesButtonClickHandler(event) {
        gui.lastButtonClickTimeTrackers.clearAllNotes.lastClickTime = sequencer.currentTime
        gui.components.shapes.clearAllNotesButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        clearAllNotes();
    }

    function addClearNotesForRowButtonsActionListeners() {
        for(let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            gui.lastButtonClickTimeTrackers["clearNotesForRow" + rowIndex] = {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: gui.components.shapes.clearNotesForRowButtonShapes[rowIndex],
            }
            gui.components.shapes.clearNotesForRowButtonShapes[rowIndex]._renderer.elem.removeEventListener('click', (event) => {
                clearRowButtonClickHandler(event, rowIndex)
            });
            gui.components.shapes.clearNotesForRowButtonShapes[rowIndex]._renderer.elem.addEventListener('click', (event) => {
                clearRowButtonClickHandler(event, rowIndex)
            });
        }
    }

    function clearRowButtonClickHandler(event, rowIndex) {
        gui.lastButtonClickTimeTrackers["clearNotesForRow" + rowIndex].lastClickTime = sequencer.currentTime
        gui.components.shapes.clearNotesForRowButtonShapes[rowIndex].fill = gui.configurations.buttonBehavior.clickedButtonColor
        clearNotesForRow(rowIndex);
    }

    function initializeAddRowButtonActionListener() {
        gui.lastButtonClickTimeTrackers.addRow.shape = gui.components.shapes.addRowButtonShape;
        // remove any existing click listeners to prevent duplicates
        gui.components.shapes.addRowButtonShape._renderer.elem.removeEventListener('click', addRowClickHandler)
        gui.components.shapes.addRowButtonShape._renderer.elem.addEventListener('click', addRowClickHandler)
        // add new click listeners
        gui.components.domElements.images.addIcon.removeEventListener('click', addRowClickHandler)
        gui.components.domElements.images.addIcon.addEventListener('click', addRowClickHandler)
    }

    function addRowClickHandler(event) {
        gui.lastButtonClickTimeTrackers.addRow.lastClickTime = sequencer.currentTime
        gui.components.shapes.addRowButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        addEmptySequencerRow();
        // redraw the sequencer
        redrawSequencer()
    }

    function addEmptySequencerRow() {
        sequencer.addEmptyRow();
        let newRowIndex = sequencer.rows.length - 1
        // set new row default configuration
        sequencer.rows[newRowIndex].setNumberOfReferenceLines(4);
        sequencer.rows[newRowIndex].setNumberOfSubdivisions(8);
        sequencer.rows[newRowIndex].setQuantization(true);
    }

    function redrawSequencer() {
        // update mouse event listeners to reflect current state of sequencer (number of rows, etc.)
        refreshWindowMouseMoveEvent();
        // redraw notes so and lines
        resetNotesAndLinesDisplayForAllRows();
        // redraw html inputs, such as subdivision and reference line text areas, quantization checkboxes
        gui.initializeSubdivisionTextInputsValuesAndStyles();
        gui.initializeReferenceLineTextInputsValuesAndStyles();
        gui.initializeQuantizationCheckboxes(); // add checkboxes for toggling quantization on each row. these might be replaced with hand-drawn buttons of some sort later for better UI
        // redraw two.js shapes, such as 'add row' and 'clear notes for row' button shapes
        // todo: make methods for these so we don't have to pass in the GUI configurations twice when initializing.
        // todo: clean up first GUI initialization so that we can just call a 'redraw' method the first time as well, 
        //       to avoid duplicated code
        for (shape of gui.components.shapes.clearNotesForRowButtonShapes) {
            shape.remove()
        }
        gui.components.shapes.clearNotesForRowButtonShapes = []
        gui.components.shapes.clearNotesForRowButtonShapes = initializeButtonPerSequencerRow(gui.configurations.clearRowButtons.topPaddingPerRow, gui.configurations.clearRowButtons.leftPaddingPerRow, gui.configurations.clearRowButtons.height, gui.configurations.clearRowButtons.width); // this is a list of button rectangles, one per row, to clear the notes on that row
        gui.components.shapes.addRowButtonShape.remove();
        gui.components.shapes.addRowButtonShape = initializeRectangleShape(gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * (sequencer.rows.length - 1)) + gui.configurations.addRowButton.topPadding, gui.configurations.sequencer.left + (gui.configurations.sequencer.width / 2) + gui.configurations.addRowButton.leftPadding - (gui.configurations.addRowButton.width / 2), gui.configurations.addRowButton.height, gui.configurations.addRowButton.width)
        gui.components.shapes.addRowButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        // update two.js so we can add action listeners to shapes
        two.update()
        // initialize action listeners
        initializeSubdivisionTextInputsActionListeners();
        initializeReferenceLineTextInputsActionListeners();
        addClearNotesForRowButtonsActionListeners();
        initializeQuantizationCheckboxActionListeners();
        initializeAddRowButtonActionListener();
        initializeSequencerRowHandlesActionListeners();
        // initialize, format, and move button icons into place
        initializeIcons(gui.configurations.hideIcons)
        if (selectedRowIndex !== null) {
            // if a row is selected, set variables appropriately for moving it around
            initializeRowSelectionVariablesAndVisuals(selectedRowIndex);
        }
    }

    // toggle whether the sequencer is 'paused' or not. this method gets called when we click the pause button
    function togglePaused() {
        if (sequencer.paused) { // unpause 
            unpause();
        } else { // pause
            pause();
        }
    }

    function pause() {
        if (!sequencer.paused) {
            sequencer.pause();
        }
        gui.components.domElements.images.pauseIcon.style.display = 'none'
        gui.components.domElements.images.playIcon.style.display = 'block'
    }

    function unpause() {
        if (sequencer.paused) {
            sequencer.unpause();
        }
        gui.components.domElements.images.pauseIcon.style.display = 'block'
        gui.components.domElements.images.playIcon.style.display = 'none'
    }

    function initializeTempoTextInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'loop length in millis' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        gui.components.domElements.textInputs.loopLengthMillis.addEventListener('blur', (event) => {
            let newTextInputValue = gui.components.domElements.textInputs.loopLengthMillis.value.trim() // remove whitespace from beginning and end of input then store it
            if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                newTextInputValue = sequencer.loopLengthInMillis
            }
            newTextInputValue = parseFloat(newTextInputValue) // do we allow floats rather than ints?? i think we could. it probably barely makes a difference though
            // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input
            newTextInputValue = gui.confineNumberToBounds(newTextInputValue, sequencer.lookAheadMillis, gui.configurations.tempoTextInput.maximumValue)
            gui.components.domElements.textInputs.loopLengthMillis.value = newTextInputValue
            updateSequencerLoopLength(newTextInputValue)
        })
        addDefaultTextInputKeypressEventListener(gui.components.domElements.textInputs.loopLengthMillis, true)
    }

    function addDefaultTextInputKeypressEventListener(textarea, allowPeriods) {
        textarea.addEventListener('keypress', (event) => {
            if (event.key === "Enter") {
                event.preventDefault()
                textarea.blur() // apply the change to the text area if the user presses "enter"
            }
            let periodCheckPassed = (event.key === "." && allowPeriods) // if the character is a period, make this value 'true' if periods are allowed. otherwise false.
            if (isNaN(Number.parseInt(event.key)) && !periodCheckPassed) { // don't allow the user to enter things that aren't numbers (but allow periods if they're allowed)
                event.preventDefault()
            }
        })
    }

    function updateSequencerLoopLength(newLoopLengthInMillis) {
        if (sequencer.loopLengthInMillis === newLoopLengthInMillis) { // save a little effort by skipping update if it isn't needed
            return
        }
        /**
         * note down current state before changing tempo
         */
        let wasPaused = sequencer.paused
        /**
         * update states
         */
        pause();
        sequencer.setLoopLengthInMillis(newLoopLengthInMillis);
        // only unpause if the sequencer wasn't paused before
        if (!wasPaused) {
            unpause();
        }
    }

    function initializeSubdivisionTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
            let subdivisionTextInput = gui.components.domElements.textInputs.subdivisionTextInputs[rowIndex]
            subdivisionTextInput.addEventListener('blur', (event) => {
                let newTextInputValue = subdivisionTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = sequencer.rows[rowIndex].getNumberOfSubdivisions()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = gui.confineNumberToBounds(newTextInputValue, 0, gui.configurations.subdivionLineTextInputs.maximumValue)
                subdivisionTextInput.value = newTextInputValue
                updateNumberOfSubdivisionsForRow(newTextInputValue, rowIndex)
            })
            addDefaultTextInputKeypressEventListener(subdivisionTextInput, false)
        }
    }

    function initializeReferenceLineTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
            let referenceLineTextInput = gui.components.domElements.textInputs.referenceLineTextInputs[rowIndex]
            referenceLineTextInput.addEventListener('blur', (event) => {
                let newTextInputValue = referenceLineTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = sequencer.rows[rowIndex].getNumberOfReferenceLines()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = gui.confineNumberToBounds(newTextInputValue, 0, gui.configurations.referenceLineTextInputs.maximumValue)
                if (newTextInputValue === 0) {
                    referenceLineTextInput.style.color = gui.configurations.referenceLines.color // set font color to lighter if the value is 0 to (try) reduce visual clutter
                } else {
                    referenceLineTextInput.style.color = gui.configurations.defaultFont.color // set font color
                }
                referenceLineTextInput.value = newTextInputValue
                updateNumberOfReferenceLinesForRow(newTextInputValue, rowIndex)
            })
            addDefaultTextInputKeypressEventListener(referenceLineTextInput, false)
        }
    }

    function updateNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        // update quantization toggle checkbox, quantization settings: you can't quantize a row if it has 0 subdivisions.
        if (newNumberOfSubdivisions === 0) {
            if (gui.configurations.hideIcons) {
                gui.components.domElements.checkboxes.quantizationCheckboxes[rowIndex].checked = false
            }
            sequencer.rows[rowIndex].quantized = false
        }
        // update the sequencer data structure to reflect the new number of subdivisions.
        // call the sequencer's 'update subdivisions for row' method
        sequencer.setNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex)
        gui.components.domElements.textInputs.subdivisionTextInputs[rowIndex].value = newNumberOfSubdivisions
        redrawSequencer()
    }

    function updateNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex) {
        // update the sequencer data structure to reflect the new number of reference lines.
        // call the sequencer's 'update number of reference lines for row' method
        sequencer.setNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex)
        gui.components.domElements.textInputs.referenceLineTextInputs[rowIndex].value = newNumberOfReferenceLines
        resetNotesAndLinesDisplayForRow(rowIndex)
    }

    function restartSequencer() {
        sequencer.restart();
    }

    function clearNotesForRow(rowIndex) { 
        sequencer.clearRow(rowIndex)
        resetNotesAndLinesDisplayForRow(rowIndex)
    }

    function clearAllNotes() {
        sequencer.clear();
        redrawSequencer()
    }

    function resetNotesAndLinesDisplayForAllRows() {
        removeAllCirclesFromDisplay()
        for (list of gui.components.shapes.subdivisionLineLists) {
            for (line of list) {
                line.remove();
            }
            list = [];
        }
        gui.components.shapes.subdivisionLineLists = []
        for (list of gui.components.shapes.referenceLineLists) {
            for (line of list) {
                line.remove();
            }
            list = [];
        }
        gui.components.shapes.referenceLineLists = []
        for (line of gui.components.shapes.sequencerRowLines) {
            line.remove();
        }
        gui.components.shapes.sequencerRowLines = [];
        for (line of gui.components.shapes.timeTrackingLines) {
            line.remove();
        }
        gui.components.shapes.timeTrackingLines = [];
        for (circle of gui.components.shapes.sequencerRowHandles) {
            circle.remove();
        }
        gui.components.shapes.sequencerRowHandles = []
        for (rectangle of gui.components.shapes.sequencerRowSelectionRectangles) {
            rectangle.remove();
        }
        gui.components.shapes.sequencerRowSelectionRectangles = []
        gui.components.shapes.sequencerRowSelectionRectangles = gui.initializeSequencerRowSelectionRectangles();
        gui.components.shapes.referenceLineLists = gui.initializeAllReferenceLines();
        gui.components.shapes.subdivisionLineLists = gui.initializeAllSubdivisionLines();
        gui.components.shapes.sequencerRowLines = gui.initializeAllSequencerRowLines();
        gui.components.shapes.sequencerRowHandles = gui.initializeSequencerRowHandles();
        gui.components.shapes.timeTrackingLines = gui.initializeTimeTrackingLines();
        drawAllNoteBankCircles();
        drawNotesToReflectSequencerCurrentState();
    }

    function resetNotesAndLinesDisplayForRow(rowIndex) {
        /**
         * found a problem with deleting only a single row. shapes are layered on-screen in the order they are 
         * drawn (newer on top), so re-drawing only one row including its subdivision lines means if we move a 
         * circle from another line onto the row with newly drawn subdivision lines, the note will show up 
         * behind the subdivision lines. it isn't simple to change layer ordering in two.js, so instead of
         * re-drawing single rows, we will redraw the entire sequencer's notes whenever a big change 
         * happens, since it is simpler. also since notes are scheduled ahead of time, the extra computation
         * shouldn't affect the timing of the drums at all.
         */
        // first delete all existing notes from the display for the changed row,
        // because now they may be out of date or some of them may have been deleted,
        // and the simplest thing to do may just be to delete them all then redraw
        // the current state of the sequencer for the changed row.
        // the same applies for the subdivion lines and the sequencer row line as well,
        // since we want those to be in front of the reference lines, which we are
        // redrawing now.
        removeAllCirclesFromDisplay()
        // next we will delete all lines for the changed row
        gui.removeSubdivisionLinesForRow(rowIndex)
        gui.removeReferenceLinesForRow(rowIndex)
        gui.removeSequencerRowLine(rowIndex)
        gui.removeTimeTrackingLine(rowIndex)
        // then we will draw all the lines for the changed row, starting with reference lines since they need to be the bottom layer
        gui.components.shapes.referenceLineLists[rowIndex] = gui.initializeReferenceLinesForRow(rowIndex)
        gui.components.shapes.subdivisionLineLists[rowIndex] = gui.initializeSubdivisionLinesForRow(rowIndex)
        gui.components.shapes.sequencerRowLines[rowIndex] = gui.initializeSequencerRowLine(rowIndex)
        gui.components.shapes.timeTrackingLines[rowIndex] = gui.initializeTimeTrackingLineForRow(rowIndex)
        // then we will add the notes from the sequencer data structure to the display, so the display accurately reflects the current state of the sequencer.
        drawAllNoteBankCircles()
        drawNotesToReflectSequencerCurrentState()
    }
}