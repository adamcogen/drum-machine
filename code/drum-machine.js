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
    for (let sampleName of sampleNameList) {
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
    
    // initialize ID generator for node / note labels, and node generator for notes taken from the sample bank.
    let idGenerator = new IdGenerator() // we will use this same ID generator everywhere we need IDs, to make sure we track which IDs have already been generated
    let _sampleBankNodeGenerator = new SampleBankNodeGenerator(idGenerator, sampleNameList) // generates a new sequencer list node whenever we pull a note off the sound bank
    let gui = new DrumMachineGui(sequencer, sampleNameList, samples, _sampleBankNodeGenerator, hideIcons=false);

    addClearAllNotesButtonActionListeners()

    // set up a initial example drum sequence
    initializeSimpleDefaultSequencerPattern()

    gui.drawAllNoteBankCircles()
    gui.drawNotesToReflectSequencerCurrentState()

    refreshWindowMouseMoveEvent();
    refreshWindowMouseUpEvent();

    redrawSequencer();

    // start main recursive update loop, where all drum machine state updates will happen
    loop()

    // this method is the 'recursive update loop` that will keep updating the page. after first invocation, this method basically calls itself recursively forever.
    function loop() {
        sequencer.update() // update timekeeping variables and schedule any upcoming notes, using the sequencer
        gui.update() // update the GUI display
        requestAnimationFrameShim(loop); // call animation frame update with this 'loop' method again
    }

    // search for comment "a general note about the 'self' paramater" within gui.js file for info on its use here
    function windowMouseMoveEventHandler(self, event) {
        // clicking on a circle sets 'circleBeingMoved' to it. circle being moved will follow mouse movements (i.e. click-drag).
        if (self.circleBeingMoved !== null) { // handle mousemove events when a note is selected
            self.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY
            // start with default note movement behavior, for when the note doesn't fall within range of the trash bin, a sequencer line, etc.
            self.circleBeingMoved.translation.x = mouseX
            self.circleBeingMoved.translation.y = mouseY
            self.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW // start with "it's not colliding with anything", and update the value from there if we find a collision
            self.circleBeingMoved.stroke = "black"
            self.components.domElements.images.trashClosedIcon.style.display = 'block'
            self.components.domElements.images.trashOpenIcon.style.display = 'none'
            /**
             * adding stuff here for new 'snap to grid on move' behavior.
             * this will be the first part of making it so that notes being moved 'snap' into place when they are close to the trash bin or a sequencer line.
             * this will also be used for 'snapping' notes to subdivision lines (i.e. quantizing them) during placement onto quantized sequencer rows.
             * todo: add 'update sequence on move' behavior, so that the sequence will be constantly updated as notes are removed / moved around 
             * (i.e. the sequence will update in real time even before the note being moved is released).
             */
            // check if the note is within range to be placed in the trash bin. if so, move the circle to the center of the trash bin.
            let centerOfTrashBinX = self.configurations.noteTrashBin.left + (self.configurations.noteTrashBin.width / 2)
            let centerOfTrashBinY = self.configurations.noteTrashBin.top + (self.configurations.noteTrashBin.height / 2)
            let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= self.configurations.noteTrashBin.left - self.configurations.mouseEvents.notePlacementPadding) && (mouseX <= self.configurations.noteTrashBin.left + self.configurations.noteTrashBin.width + self.configurations.mouseEvents.notePlacementPadding)
            let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= self.configurations.noteTrashBin.top - self.configurations.mouseEvents.notePlacementPadding) && (mouseY <= self.configurations.noteTrashBin.top + self.configurations.noteTrashBin.height + self.configurations.mouseEvents.notePlacementPadding)
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                self.circleBeingMoved.translation.x = centerOfTrashBinX
                self.circleBeingMoved.translation.y = centerOfTrashBinY
                self.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                self.circleBeingMoved.stroke = "red"
                self.components.domElements.images.trashClosedIcon.style.display = 'none'
                self.components.domElements.images.trashOpenIcon.style.display = 'block'
                self.components.shapes.noteTrashBinContainer.stroke = 'red'
            } else {
                self.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            }
            // check if the note is in range to be placed onto a sequencer row. if so, determine which row, and move the circle onto the line where it would be placed
            let sequencerLeftBoundary = self.configurations.sequencer.left - self.configurations.mouseEvents.notePlacementPadding
            let sequencerRightBoundary = (self.configurations.sequencer.left + self.configurations.sequencer.width) + self.configurations.mouseEvents.notePlacementPadding
            let sequencerTopBoundary = self.configurations.sequencer.top - self.configurations.mouseEvents.notePlacementPadding
            let sequencerBottomBoundary = self.configurations.sequencer.top + ((self.sequencer.numberOfRows - 1) * self.configurations.sequencer.spaceBetweenRows) + self.configurations.mouseEvents.notePlacementPadding
            let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerLeftBoundary) && (mouseX <= sequencerRightBoundary)
            let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerTopBoundary) && (mouseY <= sequencerBottomBoundary)
            if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                // if we get here, we know the circle is within the vertical and horizontal boundaries of the sequencer.
                // next we want to do a more fine-grained calculation, for whether it is in range to be placed onto one of the sequencer lines.
                for(let rowIndex = 0; rowIndex < self.sequencer.numberOfRows; rowIndex++) {
                    let rowActualVerticalLocation = self.configurations.sequencer.top + (rowIndex * self.configurations.sequencer.spaceBetweenRows)
                    let rowActualLeftBound = self.configurations.sequencer.left
                    let rowActualRightBound = self.configurations.sequencer.left + self.configurations.sequencer.width
                    let rowTopLimit = rowActualVerticalLocation - self.configurations.mouseEvents.notePlacementPadding
                    let rowBottomLimit = rowActualVerticalLocation + self.configurations.mouseEvents.notePlacementPadding
                    let rowLeftLimit = rowActualLeftBound - self.configurations.mouseEvents.notePlacementPadding
                    let rowRightLimit = rowActualRightBound + self.configurations.mouseEvents.notePlacementPadding
                    if (mouseX >= rowLeftLimit && mouseX <= rowRightLimit && mouseY >= rowTopLimit && mouseY <= rowBottomLimit) {
                        // correct the padding so the circle falls precisely on an actual sequencer line once mouse is released
                        if (self.sequencer.rows[rowIndex].quantized === true) {
                            // determine which subdivision we are closest to
                            self.circleBeingMovedNewBeatNumber = self.getIndexOfClosestSubdivisionLine(mouseX, self.sequencer.rows[rowIndex].getNumberOfSubdivisions())
                            self.circleBeingMoved.translation.x = self.getXPositionOfSubdivisionLine(self.circleBeingMovedNewBeatNumber, self.sequencer.rows[rowIndex].getNumberOfSubdivisions())
                        } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                            self.circleBeingMoved.translation.x = self.confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                            self.circleBeingMovedNewBeatNumber = Sequencer.NOTE_IS_NOT_QUANTIZED
                        }
                        // quantization has a more complicated effect on x position than y. y position will always just be on line, so always just put it there.
                        self.circleBeingMoved.translation.y = rowActualVerticalLocation;
                        self.circleBeingMovedNewRow = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
                    }
                }
            } else {
                // new secondary trash bin logic: if the note is far enough away from the sequencer, we will throw it out
                let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - self.configurations.mouseEvents.throwNoteAwaySidesPadding) || (mouseX >= sequencerRightBoundary + self.configurations.mouseEvents.throwNoteAwaySidesPadding)
                let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding)
                if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                    self.circleBeingMoved.stroke = "red" // make the note's outline red so it's clear it will be thrown out
                    self.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                    self.components.domElements.images.trashClosedIcon.style.display = 'none'
                    self.components.domElements.images.trashOpenIcon.style.display = 'block'
                    self.components.shapes.noteTrashBinContainer.stroke = 'red'
                }
            }
        }
        if (self.selectedRowIndex !== null) { // handle mousemove events when a row is selected
            self.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY

            let circle = self.components.shapes.sequencerRowHandles[self.selectedRowIndex]
            circle.stroke = 'black'
            circle.linewidth = 2
            circle.fill = self.configurations.sequencerRowHandles.selectedColor
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[self.selectedRowIndex]
            rowSelectionRectangle.stroke = self.configurations.sequencerRowHandles.selectedColor
            self.components.domElements.images.trashClosedIcon.style.display = 'block'
            self.components.domElements.images.trashOpenIcon.style.display = 'none'

            self.components.shapes.sequencerRowHandles[self.selectedRowIndex].translation.x = mouseX
            self.components.shapes.sequencerRowHandles[self.selectedRowIndex].translation.y = mouseY

            // check if the row handle is within range to be placed in the trash bin. if so, move the handle to the center of the trash bin.
            let centerOfTrashBinX = self.configurations.noteTrashBin.left + (self.configurations.noteTrashBin.width / 2)
            let centerOfTrashBinY = self.configurations.noteTrashBin.top + (self.configurations.noteTrashBin.height / 2)
            let withinHorizontalBoundaryOfTrashBin = (mouseX >= self.configurations.noteTrashBin.left - self.configurations.mouseEvents.notePlacementPadding) && (mouseX <= self.configurations.noteTrashBin.left + self.configurations.noteTrashBin.width + self.configurations.mouseEvents.notePlacementPadding)
            let withinVerticalBoundaryOfTrashBin = (mouseY >= self.configurations.noteTrashBin.top - self.configurations.mouseEvents.notePlacementPadding) && (mouseY <= self.configurations.noteTrashBin.top + self.configurations.noteTrashBin.height + self.configurations.mouseEvents.notePlacementPadding)
            if (withinHorizontalBoundaryOfTrashBin && withinVerticalBoundaryOfTrashBin) {
                circle.translation.x = centerOfTrashBinX
                circle.translation.y = centerOfTrashBinY
                rowSelectionRectangle.stroke = "red"
                self.rowSelecionTracker.removeRow = true;
                circle.stroke = "red"
                self.components.domElements.images.trashClosedIcon.style.display = 'none'
                self.components.domElements.images.trashOpenIcon.style.display = 'block'
                self.components.shapes.noteTrashBinContainer.stroke = 'red'
            } else {
                self.rowSelecionTracker.removeRow = false;
                self.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            }

            let xChangeFromStart = self.components.shapes.sequencerRowHandles[self.selectedRowIndex].translation.x - self.rowSelecionTracker.rowHandleStartingPosition.x
            let yChangeFromStart = self.components.shapes.sequencerRowHandles[self.selectedRowIndex].translation.y - self.rowSelecionTracker.rowHandleStartingPosition.y

            for (let shapeIndex = 0; shapeIndex < self.rowSelecionTracker.shapes.length; shapeIndex++) {
                self.rowSelecionTracker.shapes[shapeIndex].translation.x = self.rowSelecionTracker.shapesOriginalPositions[shapeIndex].x + xChangeFromStart;
                self.rowSelecionTracker.shapes[shapeIndex].translation.y = self.rowSelecionTracker.shapesOriginalPositions[shapeIndex].y + yChangeFromStart;
            }

            for (let domElementIndex = 0; domElementIndex < self.rowSelecionTracker.domElements.length; domElementIndex++) {
                self.rowSelecionTracker.domElements[domElementIndex].style.left = "" + (self.rowSelecionTracker.domElementsOriginalPositions[domElementIndex].left + xChangeFromStart) + "px"
                self.rowSelecionTracker.domElements[domElementIndex].style.top = "" + (self.rowSelecionTracker.domElementsOriginalPositions[domElementIndex].top + yChangeFromStart) + "px";
            }

            // if the row is far enough away from the sequencer, we will throw it out
            let sequencerLeftBoundary = self.configurations.sequencer.left - self.configurations.mouseEvents.notePlacementPadding
            let sequencerRightBoundary = (self.configurations.sequencer.left + self.configurations.sequencer.width) + self.configurations.mouseEvents.notePlacementPadding
            let sequencerTopBoundary = self.configurations.sequencer.top - self.configurations.mouseEvents.notePlacementPadding
            let sequencerBottomBoundary = self.configurations.sequencer.top + ((self.sequencer.numberOfRows - 1) * self.configurations.sequencer.spaceBetweenRows) + self.configurations.mouseEvents.notePlacementPadding
            let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - self.configurations.mouseEvents.throwRowAwaySidesPadding) || (mouseX >= sequencerRightBoundary + self.configurations.mouseEvents.throwRowAwaySidesPadding)
            let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - self.configurations.mouseEvents.throwRowAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + self.configurations.mouseEvents.throwRowAwayTopAndBottomPadding)
            if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                circle.stroke = "red"
                rowSelectionRectangle.stroke = "red"
                self.rowSelecionTracker.removeRow = true;
                self.components.domElements.images.trashClosedIcon.style.display = 'none'
                self.components.domElements.images.trashOpenIcon.style.display = 'block'
                self.components.shapes.noteTrashBinContainer.stroke = 'red'
            }

            for(let rowIndex = 0; rowIndex < self.sequencer.numberOfRows; rowIndex++) {
                if (rowIndex === self.selectedRowIndex) {
                    continue;
                }
                let rowHandleActualVerticalLocation = self.configurations.sequencer.top + (self.configurations.sequencer.spaceBetweenRows * rowIndex) + self.configurations.sequencerRowHandles.topPadding;
                let rowHandleActualHorizontalLocation = self.configurations.sequencer.left + self.configurations.sequencerRowHandles.leftPadding;
                let topLimit = rowHandleActualVerticalLocation - self.configurations.mouseEvents.notePlacementPadding
                let bottomLimit = rowHandleActualVerticalLocation + self.configurations.mouseEvents.notePlacementPadding
                let leftLimit = rowHandleActualHorizontalLocation - self.configurations.mouseEvents.notePlacementPadding
                let rightLimit = rowHandleActualHorizontalLocation + self.configurations.mouseEvents.notePlacementPadding + self.configurations.sequencer.width

                if (mouseX >= leftLimit && mouseX <= rightLimit && mouseY >= topLimit && mouseY <= bottomLimit) {
                    self.sequencer.moveRowToNewIndex(self.selectedRowIndex, rowIndex);
                    self.selectedRowIndex = rowIndex
                    redrawSequencer();
                    break; // we found the row that the note will be placed on, so stop iterating thru rows early
                }
            }
        }
    }

    function refreshWindowMouseMoveEvent() {
        if (gui.eventHandlerFunctions.windowMouseMove !== null && gui.eventHandlerFunctions.windowMouseMove !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            window.removeEventListener('mousemove', gui.eventHandlerFunctions.windowMouseMove);
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        gui.eventHandlerFunctions.windowMouseMove = (event) => windowMouseMoveEventHandler(gui, event);
        window.addEventListener('mousemove', gui.eventHandlerFunctions.windowMouseMove);
    }

    function refreshWindowMouseUpEvent() {
        if (gui.eventHandlerFunctions.windowMouseUp !== null && gui.eventHandlerFunctions.windowMouseUp !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            window.removeEventListener('mouseup', gui.eventHandlerFunctions.windowMouseUp);
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        gui.eventHandlerFunctions.windowMouseUp = (event) => windowMouseUpEventHandler(event);
        window.addEventListener('mouseup', gui.eventHandlerFunctions.windowMouseUp);
    }

    function windowMouseUpEventHandler(event) {
        // handle letting go of notes. lifting your mouse anywhere means you're no longer click-dragging
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
            let circleNewXPosition = gui.circleBeingMovedStartingPositionX // note, circle starting position was recorded when we frist clicked the circle.
            let circleNewYPosition = gui.circleBeingMovedStartingPositionY // if the circle is not colliding with a row etc., it will be put back to its old place, so start with the 'old place' values.
            let circleNewBeatNumber = gui.circleBeingMovedOldBeatNumber
            gui.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY
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
                    gui.removeCircleFromDisplay(gui.circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles and from the two.js canvas
                }
            }
            // we are done checking for collisions with things and updating 'old row' and 'new row' values, so now move on to updating the sequencer
            gui.circleBeingMoved.translation.x = circleNewXPosition
            gui.circleBeingMoved.translation.y = circleNewYPosition
            gui.circleBeingMoved.guiData.row = gui.circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
            if (gui.circleBeingMovedOldRow >= 0) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                node = gui.sequencer.rows[gui.circleBeingMovedOldRow].removeNode(gui.circleBeingMoved.guiData.label)
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
                    gui.drawNoteBankCircleForSample(gui.circleBeingMoved.guiData.sampleName) // if the note was taken from the sound bank, refill the sound bank
                }
                // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                let newNodeTimestampMillis = sequencer.loopLengthInMillis * ((circleNewXPosition - gui.configurations.sequencer.left) / gui.configurations.sequencer.width)
                node.priority = newNodeTimestampMillis
                // add the moved note to its new sequencer row
                gui.sequencer.rows[gui.circleBeingMovedNewRow].insertNode(node, gui.circleBeingMoved.guiData.label)
                node.data.lastScheduledOnIteration = Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED // mark note as 'not played yet on current iteration'
                node.data.beat = circleNewBeatNumber
                gui.circleBeingMoved.guiData.beat = circleNewBeatNumber
            }
        }
        if (gui.selectedRowIndex !== null) {
            // un-selecting the row will be handled in 'redraw', as long as we set selected row index to null here
            if (gui.rowSelecionTracker.removeRow) {
                gui.sequencer.removeRowAtIndex(gui.selectedRowIndex);
            }
            gui.selectedRowIndex = null
            redrawSequencer();
        }
        gui.circleBeingMoved = null
        gui.setNoteTrashBinVisibility(false)
        gui.selectedRowIndex = null
    }

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
            for (let key of Object.keys(gui.components.domElements.images)) {
                gui.components.domElements.images[key].remove()
            }
            return;
        }
        // "add row" button icon
        gui.components.domElements.images.addIcon.style.width = "" + gui.configurations.addRowButton.icon.width + "px"
        gui.components.domElements.images.addIcon.style.height = "" + gui.configurations.addRowButton.icon.height + "px"
        let addRowButtonTop = gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * (gui.sequencer.rows.length - 1)) + gui.configurations.addRowButton.topPadding
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
        for (let icon of gui.components.domElements.iconLists.clearRowIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.clearRowIcons = [];
        for (let rowIndex = 0; rowIndex < gui.sequencer.rows.length; rowIndex++) {
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
            if (gui.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] !== null && gui.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                clearRowIcon.removeEventListener('click', gui.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            gui.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] = () => gui.clearRowButtonClickHandler(gui, rowIndex);
            clearRowIcon.addEventListener('click', gui.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex]);
            // add the copy to the dom and to our list that tracks these icons
            gui.components.domElements.iconLists.clearRowIcons.push(clearRowIcon)
            document.body.appendChild(clearRowIcon)
        }
        gui.components.domElements.images.clearRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // lock / unlock (quantize / unquantize) row buttons -- need one per row
        for (let icon of gui.components.domElements.iconLists.lockedIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.lockedIcons = [];
        for (let icon of gui.components.domElements.iconLists.unlockedIcons) {
            icon.remove();
        }
        gui.components.domElements.iconLists.unlockedIcons = [];
        for (let rowIndex = 0; rowIndex < gui.sequencer.rows.length; rowIndex++) {
            // make copies of the original image so that we can freely throw them away or add more
            let lockedIcon = gui.components.domElements.images.lockedIcon.cloneNode()
            let unlockedIcon = gui.components.domElements.images.unlockedIcon.cloneNode()
            // set visibilty of each icon based on the row's current quantization setting
            // really, we could just make whichever icon is necessary and not make an invisible copy of the other
            // one, but making an invisible copy leaves the door open for optimizing the 'quantize' button a bit later.
            // there is a bit of unnecessary code duplication right now because of this.
            // may clean this up later, for now it's fine.
            if (gui.sequencer.rows[rowIndex].quantized) {
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
            // add event listeners for 'locked icon'
            if (gui.eventHandlerFunctions["lockedIcon" + rowIndex] !== null && gui.eventHandlerFunctions["lockedIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                lockedIcon.removeEventListener('click', gui.eventHandlerFunctions["lockedIcon" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            gui.eventHandlerFunctions["lockedIcon" + rowIndex] = () => setQuantizationButtonClickHandler(gui, rowIndex, false);
            lockedIcon.addEventListener('click', gui.eventHandlerFunctions["lockedIcon" + rowIndex])
            // add event listeners for 'unlocked icon'
            if (gui.eventHandlerFunctions["unlockedIcon" + rowIndex] !== null && gui.eventHandlerFunctions["unlockedIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                unlockedIcon.removeEventListener('click', gui.eventHandlerFunctions["unlockedIcon" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            gui.eventHandlerFunctions["unlockedIcon" + rowIndex] = () => setQuantizationButtonClickHandler(gui, rowIndex, true);
            unlockedIcon.addEventListener('click', gui.eventHandlerFunctions["unlockedIcon" + rowIndex])
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
        for (let rowIndex = 0; rowIndex < gui.sequencer.rows.length; rowIndex++) {
            let checkbox = gui.components.domElements.checkboxes.quantizationCheckboxes[rowIndex]
            if (gui.eventHandlerFunctions["quantizationCheckbox" + rowIndex] !== null && gui.eventHandlerFunctions["quantizationCheckbox" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                checkbox.removeEventListener('click', gui.eventHandlerFunctions["quantizationCheckbox" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            gui.eventHandlerFunctions["quantizationCheckbox" + rowIndex] = () => setQuantizationButtonClickHandler(gui, rowIndex, checkbox.checked);
            checkbox.addEventListener('click', gui.eventHandlerFunctions["quantizationCheckbox" + rowIndex])
        }
    }

    // search for comment "a general note about the 'self' paramater" within gui.js file for info on its use here
    function setQuantizationButtonClickHandler(self, rowIndex, quantize) {
        if (self.sequencer.rows[rowIndex].getNumberOfSubdivisions() === 0) {
            // you can't quantize a row if it has 0 subdivisions, so automatically change the value to 1 in this case
            self.updateNumberOfSubdivisionsForRow(1, rowIndex)
        }
        self.sequencer.rows[rowIndex].setQuantization(quantize)
        redrawSequencer();
    }

    function initializeSimpleDefaultSequencerPattern(){
        sequencer.setNumberOfRows(0)
        gui.addEmptySequencerRow();
        sequencer.rows[0].setNumberOfSubdivisions(16)
        sequencer.rows[0].setNumberOfReferenceLines(4)
        sequencer.rows[0].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[1].setNumberOfSubdivisions(8)
        sequencer.rows[1].setNumberOfReferenceLines(4)
        sequencer.rows[1].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[2].setNumberOfSubdivisions(8)
        sequencer.rows[2].setNumberOfReferenceLines(4)
        sequencer.rows[2].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[3].setNumberOfSubdivisions(8)
        sequencer.rows[3].setNumberOfReferenceLines(4)
        sequencer.rows[3].setQuantization(false)
        gui.addEmptySequencerRow();
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

    function addClearAllNotesButtonActionListeners() {
        if (gui.eventHandlerFunctions.clearAllNotesButton !== null && gui.eventHandlerFunctions.clearAllNotesButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            gui.components.shapes.clearAllNotesButtonShape._renderer.elem.removeEventListener('click', gui.eventHandlerFunctions.clearAllNotesButton)
            gui.components.domElements.images.clearAllIcon.removeEventListener('click', gui.eventHandlerFunctions.clearAllNotesButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        gui.eventHandlerFunctions.clearAllNotesButton = () => clearAllNotesButtonClickHandler(gui);
        gui.components.shapes.clearAllNotesButtonShape._renderer.elem.addEventListener('click', gui.eventHandlerFunctions.clearAllNotesButton)
        gui.components.domElements.images.clearAllIcon.addEventListener('click', gui.eventHandlerFunctions.clearAllNotesButton)
    }

    // search for comment "a general note about the 'self' paramater" within gui.js file for info on its use here
    function clearAllNotesButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers.clearAllNotes.lastClickTime = self.sequencer.currentTime
        self.components.shapes.clearAllNotesButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.clearAllNotes();
        redrawSequencer();
    }

    function initializeAddRowButtonActionListener() {
        gui.lastButtonClickTimeTrackers.addRow.shape = gui.components.shapes.addRowButtonShape;
        if (gui.eventHandlerFunctions.addRowButton !== null && gui.eventHandlerFunctions.addRowButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            gui.components.shapes.addRowButtonShape._renderer.elem.removeEventListener('click', gui.eventHandlerFunctions.addRowButton)
            gui.components.domElements.images.addIcon.removeEventListener('click', gui.eventHandlerFunctions.addRowButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        gui.eventHandlerFunctions.addRowButton = () => addRowClickHandler(gui)
        gui.components.shapes.addRowButtonShape._renderer.elem.addEventListener('click', gui.eventHandlerFunctions.addRowButton)
        gui.components.domElements.images.addIcon.addEventListener('click', gui.eventHandlerFunctions.addRowButton)
    }

    // search for comment "a general note about the 'self' paramater" within gui.js file for info on its use here
    function addRowClickHandler(self) {
        self.lastButtonClickTimeTrackers.addRow.lastClickTime = self.sequencer.currentTime
        self.components.shapes.addRowButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.addEmptySequencerRow();
        redrawSequencer()
    }

    function redrawSequencer() {
        // update mouse event listeners to reflect current state of sequencer (number of rows, etc.)
        refreshWindowMouseMoveEvent();
        // redraw notes so and lines
        gui.resetNotesAndLinesDisplayForAllRows();
        // redraw html inputs, such as subdivision and reference line text areas, quantization checkboxes
        gui.initializeSubdivisionTextInputsValuesAndStyles();
        gui.initializeReferenceLineTextInputsValuesAndStyles();
        gui.initializeQuantizationCheckboxes(); // add checkboxes for toggling quantization on each row. these might be replaced with hand-drawn buttons of some sort later for better UI
        // redraw two.js shapes, such as 'add row' and 'clear notes for row' button shapes
        // todo: make methods for these so we don't have to pass in the GUI configurations twice when initializing.
        // todo: clean up first GUI initialization so that we can just call a 'redraw' method the first time as well, 
        //       to avoid duplicated code
        for (let shape of gui.components.shapes.clearNotesForRowButtonShapes) {
            shape.remove()
        }
        gui.components.shapes.clearNotesForRowButtonShapes = []
        gui.components.shapes.clearNotesForRowButtonShapes = gui.initializeButtonPerSequencerRow(gui.configurations.clearRowButtons.topPaddingPerRow, gui.configurations.clearRowButtons.leftPaddingPerRow, gui.configurations.clearRowButtons.height, gui.configurations.clearRowButtons.width); // this is a list of button rectangles, one per row, to clear the notes on that row
        gui.components.shapes.addRowButtonShape.remove();
        gui.components.shapes.addRowButtonShape = gui.initializeRectangleShape(gui.configurations.sequencer.top + (gui.configurations.sequencer.spaceBetweenRows * (sequencer.rows.length - 1)) + gui.configurations.addRowButton.topPadding, gui.configurations.sequencer.left + (gui.configurations.sequencer.width / 2) + gui.configurations.addRowButton.leftPadding - (gui.configurations.addRowButton.width / 2), gui.configurations.addRowButton.height, gui.configurations.addRowButton.width)
        gui.components.shapes.addRowButtonShape.fill = gui.configurations.buttonBehavior.clickedButtonColor
        // update two.js so we can add action listeners to shapes
        gui.two.update()
        // initialize action listeners
        initializeSubdivisionTextInputsActionListeners();
        gui.initializeReferenceLineTextInputsActionListeners();
        gui.addClearNotesForRowButtonsActionListeners();
        initializeQuantizationCheckboxActionListeners();
        initializeAddRowButtonActionListener();
        gui.initializeSequencerRowHandlesActionListeners();
        // initialize, format, and move button icons into place
        initializeIcons(gui.configurations.hideIcons)
        if (gui.selectedRowIndex !== null) {
            // if a row is selected, set variables appropriately for moving it around
            gui.initializeRowSelectionVariablesAndVisuals(gui.selectedRowIndex);
        }
    }

    function initializeSubdivisionTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < gui.sequencer.numberOfRows; rowIndex++) {
            let subdivisionTextInput = gui.components.domElements.textInputs.subdivisionTextInputs[rowIndex]
            subdivisionTextInput.addEventListener('blur', () => {
                let newTextInputValue = subdivisionTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = gui.sequencer.rows[rowIndex].getNumberOfSubdivisions()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = gui.confineNumberToBounds(newTextInputValue, 0, gui.configurations.subdivionLineTextInputs.maximumValue)
                subdivisionTextInput.value = newTextInputValue
                gui.updateNumberOfSubdivisionsForRow(newTextInputValue, rowIndex)
                redrawSequencer();
            })
            gui.addDefaultKeypressEventListenerToTextInput(subdivisionTextInput, false)
        }
    }
}