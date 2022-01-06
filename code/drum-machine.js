/**
 * This file contains the main logic and function definitions for running and updating the sequencer, its on-screen display, etc.
 */

window.onload = () => {

    // Initialize Two.js library
    let two = initializeTwoJs(document.getElementById('draw-shapes'))

    // initialize sound file constants
    const SOUND_FILES_PATH = './sounds/';
    const BASS_DRUM = "bass-drum";
    const HI_HAT_CLOSED = 'hi-hat-closed';
    const HI_HAT_OPEN = 'hi-hat-open';
    const SNARE = 'snare';
    const WOODBLOCK = 'woodblock';
    const WAV_EXTENSION = '.wav';

    // load all sound files
    let samples = {}
    samples[WOODBLOCK] = new SequencerNoteType(loadSample(WOODBLOCK, SOUND_FILES_PATH + WOODBLOCK + WAV_EXTENSION), '#bd3b07')
    samples[HI_HAT_CLOSED] = new SequencerNoteType(loadSample(HI_HAT_CLOSED, SOUND_FILES_PATH + HI_HAT_CLOSED + WAV_EXTENSION), '#cf6311') // or try #b58f04 , this was yellow before
    samples[HI_HAT_OPEN] = new SequencerNoteType(loadSample(HI_HAT_OPEN, SOUND_FILES_PATH + HI_HAT_OPEN + WAV_EXTENSION), '#b8961c') // or try #bf3d5e , this was red before
    samples[SNARE] = new SequencerNoteType(loadSample(SNARE, SOUND_FILES_PATH + SNARE + WAV_EXTENSION), '#0e6e21')
    samples[BASS_DRUM] = new SequencerNoteType(loadSample(BASS_DRUM, SOUND_FILES_PATH + BASS_DRUM + WAV_EXTENSION), '#1b617a')

    // initialize the list of sample names we will use. the order of this list determines the order of sounds on the sound bank
    let sampleNameList = [WOODBLOCK, HI_HAT_CLOSED, HI_HAT_OPEN, SNARE, BASS_DRUM]

    // initialize ID generator for node / note labels, and node generator for notes taken from the sample bank.
    let idGenerator = new IdGenerator() // we will use this same ID generator everywhere we need IDs, to make sure we track which IDs have already been generated
    let sampleBankNodeGenerator = new SampleBankNodeGenerator(idGenerator, sampleNameList) // generates a new sequencer list node whenever we pull a note off the sound bank

    // initialize web audio context
    setUpAudioAndAnimationForWebAudioApi()
    let audioContext = new AudioContext();

    // wait until the first click before resuming the audio context (this is required by Chrome browser)
    let audioContextStarted = false
    window.onclick = () => {
        if (!audioContextStarted) {
            audioContext.resume()
            audioContextStarted = true
        }
    }

    /**
     * drum machine configurations
     */
     let loopLengthInMillis = 1500; // length of the whole drum sequence (loop), in millliseconds
     const LOOK_AHEAD_MILLIS = 20; // number of milliseconds to look ahead when scheduling notes to play. note bigger value means that there is a longer delay for sounds to stop after the 'pause' button is hit.
    /**
     * gui settings: sequencer
     */
    let sequencerVerticalOffset = 100
    let sequencerHorizontalOffset = 150
    let sequencerWidth = 400
    let spaceBetweenSequencerRows = 80
    let drumTriggerHeight = 20
    let unplayedCircleRadius = 8
    let playedCircleRadius = 10
    let movingCircleRadius = 9
    /**
     * gui settings: sample bank
     */
    let noteBankVerticalOffset = 135
    let noteBankHorizontalOffset = 40
    let spaceBetweenNoteBankNotes = 40
    let numberOfNotesInNoteBank = sampleNameList.length
    let noteBankPadding = 20
    /**
     * gui settings: note trash bin
     */
    let noteTrashBinVerticalOffset = 380
    let noteTrashBinHorizontalOffset = 40
    let noteTrashBinWidth = 48
    let noteTrashBinHeight = 48
    /**
     * gui settings: colors
     */
    let sequencerAndToolsLineColor = '#707070'
    let sequencerAndToolsLineWidth = 3
    let trashBinColor = 'red'
    /**
     * gui settings: subdivision lines
     */
    let subdivisionLineHeight = 20
    let subdivisionLineColor = sequencerAndToolsLineColor // 'black'
    /**
     * gui settings: mouse movement, note placing
     */
    let placementPadding = 20 // give this many pixels of padding on either side of things when we're placing, so we don't have to place them _precisely_ on the line, the trash bin, etc.

    // initialize sequencer data structure
    let sequencer = new Sequencer(6, loopLengthInMillis)
    sequencer.rows[0].setNumberOfSubdivisions(8)
    sequencer.rows[0].setQuantization(true)
    sequencer.rows[1].setNumberOfSubdivisions(4)
    sequencer.rows[1].setQuantization(true)
    sequencer.rows[2].setNumberOfSubdivisions(2)
    sequencer.rows[3].setNumberOfSubdivisions(0)
    sequencer.rows[4].setNumberOfSubdivisions(5)
    sequencer.rows[4].setQuantization(true)
    sequencer.rows[5].setNumberOfSubdivisions(7)
    sequencer.rows[5].setQuantization(true)

    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects)
    let sequencerRowLines = initializeSequencerRowLines() // list of sequencer row lines
    let subdivisionLineLists = initializeSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
    let drumTriggerLines = initializeDrumTriggerLines() // list of lines that move to represent the current time within the loop
    let noteBankContainer = initializeNoteBankContainer() // a rectangle that goes around the note bank
    let noteTrashBinContainer = initializeNoteTrashBinContainer() // a rectangle that acts as a trash can for deleting notes
    setNoteTrashBinVisibility(false) // trash bin only gets shown when we're moving a note

    two.update(); // this initial 'update' creates SVG '_renderer' properties for our shapes that we can add action listeners to, so it needs to go here

    // create variables which will be used to track info about the note that is being clicked and dragged
    let circleBeingMoved = null
    let circleBeingMovedStartingPositionX = null
    let circleBeingMovedStartingPositionY = null
    let circleBeingMovedOldRow = null
    let circleBeingMovedNewRow = null
    
    // create constants that will be used to denote special sequencer 'row' numbers, to indicate special places notes can go such as the note bank or the trash bin
    const HAS_NO_ROW_NUMBER = -1 // code for 'not in any row'
    const NOTE_BANK_ROW_NUMBER = -2
    const NOTE_TRASH_BIN_ROW_NUMBER = -3

    // set up a initial example drum sequence
    initializeDefaultSequencerPattern()

    // keep a list of all the circles (i.e. notes) that have been drawn on the screen
    let allDrawnCircles = []

    // draw the circles (i.e. notes) that are in the note bank
    for (noteBankSampleName of sampleNameList) {
        drawNoteBankCircleForSample(noteBankSampleName)
    }

    // draw all notes that are in the sequencer before the sequencer starts (aka the notes of the initial example drum sequence)
    for(let sequencerRowIndex = 0; sequencerRowIndex < sequencer.numberOfRows; sequencerRowIndex++) {
        noteToDraw = sequencer.rows[sequencerRowIndex].notesList.head
        while (noteToDraw !== null) {
            let xPosition = sequencerHorizontalOffset + (sequencerWidth * (noteToDraw.priority / sequencer.loopLengthInMillis))
            let yPosition = sequencerVerticalOffset + (sequencerRowIndex * spaceBetweenSequencerRows)
            let sampleName = noteToDraw.data.sampleName
            let row = sequencerRowIndex
            let label = noteToDraw.label
            drawNewNoteCircle(xPosition, yPosition, sampleName, label, row)
            noteToDraw = noteToDraw.next
        }
    }

    // get the next note that needs to be scheduled for each row (will start as list 'head', and update as we go)
    let nextNoteToScheduleForEachRow = []
    for (let nextNotesInitializedSoFarCount = 0; nextNotesInitializedSoFarCount < sequencer.numberOfRows; nextNotesInitializedSoFarCount++) {
        nextNoteToScheduleForEachRow.push(sequencer.rows[nextNotesInitializedSoFarCount].notesList.head)
    }

    // clicking on a circle sets 'circleBeingMoved' to it. circle being moved will follow mouse movements (i.e. click-drag).
    window.addEventListener('mousemove', (event) => {
        if (circleBeingMoved !== null) {
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            // start with default note movement behavior, for when the note doesn't fall within range of the trash bin, a sequencer line, etc.
            circleBeingMoved.translation.x = mouseX
            circleBeingMoved.translation.y = mouseY
            circleBeingMovedNewRow = HAS_NO_ROW_NUMBER // start with "it's not colliding with anything", and update the value from there if we find a collision
            /**
             * adding stuff here for new 'snap to grid on move' behavior.
             * this will be the first part of making it so that notes being moved 'snap' into place when they are close to the trash bin or a sequencer line.
             * this will also be used for 'snapping' notes to subdivision lines (i.e. quantizing them) during placement onto quantized sequencer rows.
             * todo: add 'update sequence on move' behavior, so that the sequence will be constantly updated as notes are removed / moved around 
             * (i.e. the sequence will update in real time even before the note being moved is released).
             */
            // check if the note is within range to be placed in the trash bin. if so, move the circle to the center of the trash bin.
            centerOfTrashBinX = noteTrashBinHorizontalOffset + (noteTrashBinWidth / 2)
            centerOfTrashBinY = noteTrashBinVerticalOffset + (noteTrashBinHeight / 2)
            let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= noteTrashBinHorizontalOffset - placementPadding) && (mouseX <= noteTrashBinHorizontalOffset + noteTrashBinWidth + placementPadding)
            let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= noteTrashBinVerticalOffset - placementPadding) && (mouseY <= noteTrashBinVerticalOffset + noteTrashBinHeight + placementPadding)
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                circleBeingMoved.translation.x = centerOfTrashBinX
                circleBeingMoved.translation.y = centerOfTrashBinY
                circleBeingMovedNewRow = NOTE_TRASH_BIN_ROW_NUMBER
            }
            // check if the note is in range to be placed onto a sequencer row. if so, determine which row, and move the circle onto the line where it would be placed
            let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerHorizontalOffset - placementPadding) && (mouseX <= (sequencerHorizontalOffset + sequencerWidth) + placementPadding)
            let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerVerticalOffset - placementPadding) && (mouseY <= sequencerVerticalOffset + ((sequencer.numberOfRows - 1) * spaceBetweenSequencerRows) + placementPadding)
            if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                // if we get here, we know the circle is within the vertical and horizontal boundaries of the sequencer.
                // next we want to do a more fine-grained calculation, for whether it is in range to be placed onto one of the sequencer lines.
                for(let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
                    rowActualVerticalLocation = sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows)
                    rowActualLeftBound = sequencerHorizontalOffset
                    rowActualRightBound = sequencerHorizontalOffset + sequencerWidth
                    rowTopLimit = rowActualVerticalLocation - placementPadding
                    rowBottomLimit = rowActualVerticalLocation + placementPadding
                    rowLeftLimit = rowActualLeftBound - placementPadding
                    rowRightLimit = rowActualRightBound + placementPadding
                    if (mouseX >= rowLeftLimit && mouseX <= rowRightLimit && mouseY >= rowTopLimit && mouseY <= rowBottomLimit) {
                        // correct the padding so the circle falls precisely on an actual sequencer line once mouse is released
                        if (sequencer.rows[rowIndex].quantized === true) {
                            // determine which subdivision we are closest to
                            circleBeingMoved.translation.x = getXPositionOfClosestSubdivisionLine(mouseX, sequencer.rows[rowIndex].getNumberOfSubdivisions())
                        } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                            circleBeingMoved.translation.x = confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                        }
                        // quantization only affects x position. y position will always just be on line, so always put it there.
                        circleBeingMoved.translation.y = confineNumberToBounds(mouseY, rowActualVerticalLocation, rowActualVerticalLocation)
                        circleBeingMovedNewRow = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
                    }
                }
            }
        }
    });

    // lifting your mouse anywhere means you're no longer click-dragging
    /**
     * todo: clean this up to get rid of redundancy after implementing 'snap-to' behavior in window 'mousemove'
     */
    window.addEventListener('mouseup', (event) => {
        if (circleBeingMoved !== null) {
            /**
             * this is the workflow for determining where to put a circle that we were click-dragging once we release the mouse.
             * how this workflow works (todo: double check that this is all correct):
             * - in the circle.mousedown event, we: 
             *   - note down initial information about circle starting state before being moved
             * - in the window.mousemove event, we:
             *   - check for circle collision with the trash bin. if colliding, cricle's new row is -3.
             *   - check for collision with a sequencer row. if colliding, new row is >= 0.
             *   - if colliding with nothing, new row is -1.
             * - in this window.mouseup event, how we handle states:
             *   - if the note isn't colliding with a sequencer row or the trash bin, put it back wherever it came from, with no change.
             *   - if the note is on a row, remove it from wherever it came from, and add it wherever it was placed (even if new and old row are the same)
             *   - if the note is in the trash bin, throw it away, unless it came from the note bank, in which case we just but it back onto the note bank.
             *   - to do all of this, we will manually change the values of some of these variables around, then make changes using the following set of rules:
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
             *       - old row < 0, new row >= 0: takes a note from the note bank and adds it to a new row, without removing it from an old row.
             */
            // note down starting state, current state
            circleNewXPosition = circleBeingMovedStartingPositionX // note, circle starting position was recorded when we frist clicked the circle
            circleNewYPosition = circleBeingMovedStartingPositionY
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            // check for collisions with things (sequencer rows, the trash bin, etc.)and make adjustments accordingly, so that everything will be handled as explained in the block comment above
            if (circleBeingMovedNewRow >= 0) { // this means the note is being put onto a new sequencer row
                circleNewXPosition = circleBeingMoved.translation.x // the note should have already been 'snapped' to its new row in the 'mousemove' event, so just commit to that new location
                circleNewYPosition = circleBeingMoved.translation.y
            } else if (circleBeingMovedNewRow === HAS_NO_ROW_NUMBER) { // if the note isn't being put onto any row, just put it back wherever it came from
                circleNewXPosition = circleBeingMovedStartingPositionX
                circleNewYPosition = circleBeingMovedStartingPositionY
                circleBeingMovedNewRow = circleBeingMovedOldRow // replace the 'has no row' constant value with the old row number that this was taken from (i.e. just put it back where it came from!)
            } else if (circleBeingMovedNewRow === NOTE_TRASH_BIN_ROW_NUMBER) { // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
                if (circleBeingMovedOldRow === NOTE_BANK_ROW_NUMBER) { // if the note being thrown away came from the note bank, just put it back in the note bank.
                    circleBeingMovedNewRow = NOTE_BANK_ROW_NUMBER
                } else { // only bother throwing away things that came from a row (throwing away note bank notes is pointless)
                    circleBeingMoved.remove() // remove the circle from the Two.js display
                    removeCircleFromAllDrawnCirclesList(circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles
                    // if the deleted note is the 'next note to schedule', we should increment that 'next note to schedule' to its .next (i.e. we should skip the deleted note)
                    if (nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row] !== null && nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row].label ===  circleBeingMoved.guiData.label) {
                        nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row] = nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row].next
                    }
                }
            }
            // we are done checking for collisions with things, so now move on to updating data
            circleBeingMoved.translation.x = circleNewXPosition
            circleBeingMoved.translation.y = circleNewYPosition
            circleBeingMoved.guiData.row = circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
            if (circleBeingMovedOldRow >= 0) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                /**
                 * we need to update 'next note to schedule' here in the following case: if 'next note to schedule' is the moved note.
                 * if we didn't specifically handle this case, then if 'next note to schedule' was the moved note, it would still play.
                 * this may not seem bad at first, but the old (removed) note has a null .next value, so the rest of the notes in the 
                 * old row would no longer play if we didn't fix this.
                 * a fix is to set 'next note to schedule' to its .next if the next note's label matches the removed note's label,
                 * _before_ removing the moved note from its old row.
                 */
                 if (nextNoteToScheduleForEachRow[circleBeingMovedOldRow] !== null && nextNoteToScheduleForEachRow[circleBeingMovedOldRow].label === circleBeingMoved.guiData.label) {
                    nextNoteToScheduleForEachRow[circleBeingMovedOldRow] = nextNoteToScheduleForEachRow[circleBeingMovedOldRow].next
                }
                node = sequencer.rows[circleBeingMovedOldRow].notesList.removeNode(circleBeingMoved.guiData.label)
            }
            // add the moved note to its new sequencer row.
            if (circleBeingMovedNewRow >= 0) {
                if (node === null) { // this should just mean the circle was pulled from the note bank, so we need to create a node for it
                    if (circleBeingMovedOldRow >= 0) { // should be an unreachable case, just checking for safety
                        throw "unexpected case: node was null but 'circleBeingMovedOldRow' was not < 0. circleBeingMovedOldRow: " + circleBeingMovedNewRow + ". node: " + node + "."
                    }
                    // create a new node for the sample that this note bank circle was for. note bank circles have a sample in their GUI data, 
                    // but no real node that can be added to the drum sequencer's data structure, so we need to create one.
                    node = sampleBankNodeGenerator.createNewNodeForSample(circleBeingMoved.guiData.sampleName)
                    circleBeingMoved.guiData.label = node.label // the newly generated node will also have a real generated ID (label), use that
                    drawNoteBankCircleForSample(circleBeingMoved.guiData.sampleName) // if the note was taken from the sound bank, refill the sound bank
                }
                // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                let newNodeTimestampMillis = loopLengthInMillis * ((circleNewXPosition - sequencerHorizontalOffset) / sequencerWidth)
                node.priority = newNodeTimestampMillis
                // add the moved note to its new sequencer row
                sequencer.rows[circleBeingMovedNewRow].notesList.insertNode(node, circleBeingMoved.guiData.label)
                /**
                 * we need to update 'next note to schedule' here in the following case:
                 * [current time] -> [inserted note] -> ['next note to schedule']
                 * if we didn't specifcally handle this case, we wouldn't play the newly inserted node.
                 * a way to fix is to call 'next note to schedule' .prev if .prev.label === inserted node .label.
                 */
                if (nextNoteToScheduleForEachRow[circleBeingMovedNewRow] !== null && nextNoteToScheduleForEachRow[circleBeingMovedNewRow].previous !== null && nextNoteToScheduleForEachRow[circleBeingMovedNewRow].previous.label === circleBeingMoved.guiData.label) {
                    nextNoteToScheduleForEachRow[circleBeingMovedNewRow] = nextNoteToScheduleForEachRow[circleBeingMovedNewRow].previous
                }
                node.data.lastScheduledOnIteration = -1 // mark note as 'not played yet on current iteration'
            }
        }
        circleBeingMoved = null
        setNoteTrashBinVisibility(false)
    });

    // run any miscellaneous unit tests needed before starting main update loop
    testConfineNumberToBounds()

    // start main recursive update loop, where all state updates will happen
    requestAnimationFrameShim(draw)

    /**
     * end of main logic, start of function definitions.
     */

    // this method is the 'update' loop that will keep updating the page. after first invocation, this method basically calls itself recursively forever.
    function draw() {
        let currentTime = audioContext.currentTime * 1000;

        let currentTimeWithinCurrentLoop = currentTime % loopLengthInMillis

        drumTriggersXPosition = sequencerHorizontalOffset + (sequencerWidth * (currentTimeWithinCurrentLoop / loopLengthInMillis))

        for (drumTriggerLine of drumTriggerLines) {
            drumTriggerLine.position.x = drumTriggersXPosition
        }

        // make circles get bigger when they play.
        for (circle of allDrawnCircles) {
            let radiusToSetUnplayedCircleTo = unplayedCircleRadius
            if (circleBeingMoved !== null && circleBeingMoved.guiData.label === circle.guiData.label) {
                // if we are moving this circle, make its unplayed radius slightly bigger than normal
                radiusToSetUnplayedCircleTo = movingCircleRadius;
            }
            if (circle.translation.x <= drumTriggersXPosition - 15 || circle.translation.x >= drumTriggersXPosition + 15) {
                circle.radius = radiusToSetUnplayedCircleTo
            } else {
                circle.radius = playedCircleRadius
            }
        }

        // iterate through each sequencer, scheduling upcoming notes for all of them
        for (let sequencerRowIndex = 0; sequencerRowIndex < sequencer.numberOfRows; sequencerRowIndex++) {
            if (nextNoteToScheduleForEachRow[sequencerRowIndex] === null) {
                // if nextNoteToSchedule is null, the list was empty at some point, so keep polling for a note to be added to it.
                // or we reached the last note, which is fine, just go back to the beginning of the sequence.
                nextNoteToScheduleForEachRow[sequencerRowIndex] = sequencer.rows[sequencerRowIndex].notesList.head
            }

            if (nextNoteToScheduleForEachRow[sequencerRowIndex] !== null) { // will always be null if the row's note list is empty
                nextNoteToScheduleForEachRow[sequencerRowIndex] = scheduleNotesForCurrentTime(nextNoteToScheduleForEachRow[sequencerRowIndex], sequencerRowIndex, currentTime)
            }
        }

        two.update() // update the GUI display
        requestAnimationFrameShim(draw); // call animation frame update with this 'draw' method again
    }

    function scheduleNotesForCurrentTime(nextNoteToSchedule, sequencerRowIndex, currentTime) {
        let currentTimeWithinCurrentLoop = currentTime % loopLengthInMillis
        let numberOfLoopsSoFar = Math.floor(currentTime / loopLengthInMillis)
        let actualStartTimeOfCurrentLoop = numberOfLoopsSoFar * loopLengthInMillis

        /**
         * At the end of the loop sequence, the look-ahead window may wrap back around to the beginning of the loop.
         * e.g. if there are 3 millis left in the loop, and the look-ahead window is 10 millis long, we will want to schedule
         * all notes that fall in the last 3 millis of the loop, as well as in the first 7 millis.
         * For this reason, scheduling notes will be broken into two steps:
         * (1) schedule notes from current time to the end of look-ahead window or to the end of the loop, whichever comes first
         * (2) if the look-ahead window wraps back around to the beginning of the loop, schedule notes from the beginning of 
         *     the loop to the end of the look-ahead window.
         * This also means the look-ahead window won't work right if the length of the loop is shorter than the look-ahead time,
         * but that is an easy restriction to add, and also if look-ahead window is short (such as 10 millis), we won't want to
         * make a loop shorter than 10 millis anyway, so no one will notice or care about that restriction.
         */
        // this will be the first part: schedule notes from the current time, to whichever of these comes first:
        //   - the end of the look-ahead window
        //   - the end of the loop
        let endTimeOfNotesToSchedule = currentTimeWithinCurrentLoop + LOOK_AHEAD_MILLIS // no need to trim this to the end of the loop, since there won't be any notes scheduled after the end anyway
        // keep iterating until the end of the list (nextNoteToSchedule will be 'null') or until nextNoteToSchedule is after 'end of notes to schedule'
        // what should we do if nextNoteToSchedule is _before_ 'beginning of notes to schedule'?
        while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeOfNotesToSchedule) {
            // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for.
            // don't schedule a note unless it hasn't been scheduled on this loop iteration and it goes after the current time (i.e. don't schedule notes in the past, just skip over them)
            if (nextNoteToSchedule.priority >= currentTimeWithinCurrentLoop && numberOfLoopsSoFar > nextNoteToSchedule.data.lastScheduledOnIteration) {
                scheduleDrumSample(actualStartTimeOfCurrentLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar // record the last iteration that the note was played on to avoid duplicate scheduling within the same iteration
            }
            nextNoteToSchedule = nextNoteToSchedule.next
        }

        // this will be the second part: if the look-ahead window went past the end of the loop, schedule notes from the beginning
        // of the loop to the end of leftover look-ahead window time.
        let endTimeToScheduleUpToFromBeginningOfLoop = endTimeOfNotesToSchedule - loopLengthInMillis // calulate leftover time to schedule for from beginning of loop, e.g. from 0 to 7 millis from above example
        let actualStartTimeOfNextLoop = actualStartTimeOfCurrentLoop + loopLengthInMillis
        let numberOfLoopsSoFarPlusOne = numberOfLoopsSoFar + 1
        if (endTimeToScheduleUpToFromBeginningOfLoop >= 0) {
            nextNoteToSchedule = sequencer.rows[sequencerRowIndex].notesList.head
            while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeToScheduleUpToFromBeginningOfLoop) {
                // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for
                if (numberOfLoopsSoFarPlusOne > nextNoteToSchedule.data.lastScheduledOnIteration) {
                    scheduleDrumSample(actualStartTimeOfNextLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                    nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFarPlusOne
                }
                nextNoteToSchedule = nextNoteToSchedule.next
            }
        }
        return nextNoteToSchedule
    }

    function scheduleDrumSample(startTime, sampleName){
        scheduleSound(samples[sampleName].file, startTime / 1000, .5)
    }

    // schedule a sample to play at the specified time
    function scheduleSound(sample, time, gain=1, playbackRate=1) {
        let sound = audioContext.createBufferSource(); // creates a sound source
        sound.buffer = sample; // tell the sound source which sample to play
        sound.playbackRate.value = playbackRate; // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed

        // set gain (volume). 1 is default, .1 is 10 percent
        gainNode = audioContext.createGain();
        gainNode.gain.value = gain;
        gainNode.connect(audioContext.destination);
        sound.connect(gainNode); // connect the sound to the context's destination (the speakers)

        sound.start(time);
    }

    // play the sample with the given name right away (don't worry about scheduling it for some time in the future)
    function playDrumSampleNow(sampleName) {
        playSoundNow(samples[sampleName].file, .5)
    }

    function playSoundNow(sample, gain=1, playbackRate=1) {
        let sound = audioContext.createBufferSource(); // creates a sound source
        sound.buffer = sample; // tell the sound source which sample to play
        sound.playbackRate.value = playbackRate; // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed

        // set gain (volume). 1 is default, .1 is 10 percent
        gainNode = audioContext.createGain();
        gainNode.gain.value = gain;
        gainNode.connect(audioContext.destination);
        sound.connect(gainNode); // connect the sound to the context's destination (the speakers)

        sound.start();
    }

    // load a sample from a file. to load from a local file, this script needs to be running on a server.
    function loadSample(sampleName, url) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
      
        // Decode asynchronously
        request.onload = function() {
            audioContext.decodeAudioData(request.response, function(buffer) {
            samples[sampleName].file = buffer; // once we get a response, write the returned data to the corresponding attribute in our 'samples' object
          }, (error) => {
              console.log("Error caught when attempting to load file with URL: '" + url + "'. Error: '" + error + "'.")
          });
        }
        request.send();
    }

    // for a given mouse x coordinate and number of subdivisions, return the x coordinate
    // of the subdivision line that is closest to the mouse position. in other words,
    // quantize the mouse x position to the nearest subdivision line.
    // this will be used for 'snapping' notes to subdivision lines when moving them on 
    // quantized sequencer rows.
    function getXPositionOfClosestSubdivisionLine(mouseX, numberOfSubdivisions) {
        let sequencerLeftEdge = sequencerHorizontalOffset
        let sequencerRightEdge = sequencerHorizontalOffset + sequencerWidth
        let widthOfEachSubdivision = sequencerWidth / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencer / widthOfEachSubdivision)
        let mouseIsCloserToRightSubdivisionThanLeft = (mouseXWithinSequencer % widthOfEachSubdivision) > (widthOfEachSubdivision / 2)
        let subdivisionToSnapTo = subdivisionNumberToLeftOfMouse
        if (mouseIsCloserToRightSubdivisionThanLeft) {
            subdivisionToSnapTo += 1
        }
        return sequencerLeftEdge + (widthOfEachSubdivision * confineNumberToBounds(subdivisionToSnapTo, 0, numberOfSubdivisions - 1))
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

    // set up a default initial drum sequence with some notes in it
    function initializeDefaultSequencerPattern(){
        sequencer.rows[0].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), 0, 
        {
            lastScheduledOnIteration: -1,
            sampleName: HI_HAT_CLOSED,
        }
        ))
        sequencer.rows[1].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 1, 
            {
                lastScheduledOnIteration: -1,
                sampleName: HI_HAT_OPEN,
            }
        ))
        sequencer.rows[2].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), ((loopLengthInMillis / 4) * 2), 
            {
                lastScheduledOnIteration: -1,
                sampleName: SNARE,
            }
        ))
        sequencer.rows[3].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 3, 
            {
                lastScheduledOnIteration: -1,
                sampleName: BASS_DRUM
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
        let xPosition = noteBankHorizontalOffset + noteBankPadding + (unplayedCircleRadius / 2)
        let yPosition = noteBankVerticalOffset + noteBankPadding + (indexOfSampleInNoteBank * unplayedCircleRadius) + (indexOfSampleInNoteBank * spaceBetweenNoteBankNotes)
        let row = NOTE_BANK_ROW_NUMBER // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
        /**
         * the top note in the note bank will have label '-1', next one down will be '-2', etc.
         * these negative number labels will still be unique to a particular circle in the note bank,
         * and these IDs will be replaced with a real, normal label (a generated ID) once each note
         * bank circle is taken fom the note bank and placed onto a real row.
         */
        let label = (indexOfSampleInNoteBank + 1) * -1
        drawNewNoteCircle(xPosition, yPosition, sampleName, label, row)
    }

    // create a new circle (i.e. note) on the screen, with the specified x and y position. color is determined by sample name. 
    // values given for sample name, label, and row number are stored in the circle object to help the GUI keep track of things.
    // add the newly created circle to the list of all drawn cricles.
    function drawNewNoteCircle(xPosition, yPosition, sampleName, label, row) {
        // initialize the new circle and set its colors
        let circle = two.makeCircle(xPosition, yPosition, unplayedCircleRadius)
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
            circleBeingMoved = circle
            circleBeingMovedStartingPositionX = circleBeingMoved.translation.x
            circleBeingMovedStartingPositionY = circleBeingMoved.translation.y
            circleBeingMovedOldRow = circleBeingMoved.guiData.row
            circleBeingMovedNewRow = circleBeingMovedOldRow
            setNoteTrashBinVisibility(true)
            playDrumSampleNow(circleBeingMoved.guiData.sampleName)
        });

        // add info to the circle object that the gui uses to keep track of things
        circle.guiData = {}
        circle.guiData.sampleName = sampleName
        circle.guiData.row = row
        circle.guiData.label = label

        // add circle to list of all drawn circles
        allDrawnCircles.push(circle)
    }

    // remove a circle from the 'allDrawnCircles' list, based on its label.
    // this is meant to be used during deletion of notes from the sequencer, with the idea being that deleting
    // them from this list and maybe from a few other places will clear up clutter, and hopefully allow the 
    // deleted circles to get garbage-collected.
    function removeCircleFromAllDrawnCirclesList(label){
        let indexOfListItemToRemove = allDrawnCircles.findIndex(elementFromList => elementFromList.guiData.label === label);
        if (indexOfListItemToRemove === -1) { //  we don't expect to reach this case, where a circle with the given label isn't found in the list
            throw "unexpected problem: couldn't find the circle with the given label in the list of all drawn circles, when trying to delete it. the given label was: " + label + ". full list (labels only) (sorry for printing annoying thing): " + allDrawnCircles.map((item) => item.guiData.label) + "."
        }
        allDrawnCircles.splice(indexOfListItemToRemove, 1) // this should go in and delete the element we want to delete!
    }

    // draw lines for sequencer rows. return a list of the drawn lines. these will be Two.js 'path' objects.
    function initializeSequencerRowLines() {
        let sequencerRowLines = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            let sequencerRowLine = two.makePath(
                [
                    new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset + (rowsDrawn * spaceBetweenSequencerRows)),
                    new Two.Anchor(sequencerHorizontalOffset + sequencerWidth, sequencerVerticalOffset + (rowsDrawn * spaceBetweenSequencerRows)),
                ], 
                false
            );
            sequencerRowLine.linewidth = sequencerAndToolsLineWidth;
            sequencerRowLine.stroke = sequencerAndToolsLineColor
    
            sequencerRowLines.push(sequencerRowLine)
        }
        return sequencerRowLines
    }

    // add 'subdivision lines' to each sequencer row. these lines divide each row into the given number of evenly-sized sections.
    // in other words, if a row's 'subdivision count' is 5, that row will be divided into 5 even chunks (it will have 5 subdivision
    // lines). subdivision lines pretty much represent 'beats', so a line that is subdivided into 5 sections shows 5 beats.
    function initializeSubdivisionLines() {
        let allSubdivisionLineLists = []
        let subdivisionLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            if (sequencer.rows[rowsDrawn].getNumberOfSubdivisions() <= 0) {
                continue; // don't draw subdivisions for this row if it has 0 or fewer subdivisions
            }
            let xIncrementBetweenSubdivisions = sequencerWidth / sequencer.rows[rowsDrawn].getNumberOfSubdivisions()
            for (let subdivisionsDrawnForRow = 0; subdivisionsDrawnForRow < sequencer.rows[rowsDrawn].getNumberOfSubdivisions(); subdivisionsDrawnForRow++) {
                let subdivisionLine = two.makePath(
                    [
                        new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), sequencerVerticalOffset - 1 + (rowsDrawn * spaceBetweenSequencerRows)),
                        new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), sequencerVerticalOffset + (rowsDrawn * spaceBetweenSequencerRows) + subdivisionLineHeight),
                    ], 
                    false
                );
                subdivisionLine.linewidth = sequencerAndToolsLineWidth;
                subdivisionLine.stroke = subdivisionLineColor

                subdivisionLinesForRow.push(subdivisionLine) // keep a list of all subdivision lines for the current row
            }

            allSubdivisionLineLists.push(subdivisionLinesForRow) // keep a list of all rows' subdivision line lists
        }
        return allSubdivisionLineLists
    }

    // draw lines for the 'drum triggers' for each sequencer row.
    // these are the little lines above each sequencer line that track the current time within the loop.
    // return a list of the drawn lines. these will be Two.js 'path' objects.
    function initializeDrumTriggerLines() {
        let drumTriggerLines = []
        for (let drumTriggersDrawn = 0; drumTriggersDrawn < sequencer.numberOfRows; drumTriggersDrawn++) {
            let triggerLine = two.makePath(
                [
                    new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset + 1 + (drumTriggersDrawn * spaceBetweenSequencerRows)),
                    new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset - drumTriggerHeight + (drumTriggersDrawn * spaceBetweenSequencerRows)),
                ], 
                false
            );
            triggerLine.linewidth = sequencerAndToolsLineWidth;
            triggerLine.stroke = sequencerAndToolsLineColor
    
            drumTriggerLines.push(triggerLine)
        }
        return drumTriggerLines
    }

    // draw the physical note bank container on the screen. for now that's just a rectangle.
    // return the note bank shape. this will be a Two.js path object.
    function initializeNoteBankContainer() {
        let noteBankContainer = two.makePath(
            [
                new Two.Anchor(noteBankHorizontalOffset, noteBankVerticalOffset),
                new Two.Anchor(noteBankHorizontalOffset + unplayedCircleRadius + (noteBankPadding * 2), noteBankVerticalOffset),
                new Two.Anchor(noteBankHorizontalOffset + unplayedCircleRadius + (noteBankPadding * 2), noteBankVerticalOffset + (unplayedCircleRadius * (numberOfNotesInNoteBank - 1)) + ((numberOfNotesInNoteBank - 1) * spaceBetweenNoteBankNotes) + (noteBankPadding * 2)),
                new Two.Anchor(noteBankHorizontalOffset, noteBankVerticalOffset + (unplayedCircleRadius * (numberOfNotesInNoteBank - 1)) + ((numberOfNotesInNoteBank - 1) * spaceBetweenNoteBankNotes) + (noteBankPadding * 2)),
            ], 
            false
        );
        noteBankContainer.linewidth = sequencerAndToolsLineWidth;
        noteBankContainer.stroke = sequencerAndToolsLineColor
        noteBankContainer.fill = 'transparent'
        return noteBankContainer
    }

    // draw the 'trash bin' for throwing out (deleting) notes. for now it's just
    // a red rectangle, will make it something better for user experience later.
    function initializeNoteTrashBinContainer() {
        let noteTrashBinContainer = two.makePath(
            [
                new Two.Anchor(noteTrashBinHorizontalOffset, noteTrashBinVerticalOffset),
                new Two.Anchor(noteTrashBinHorizontalOffset + noteTrashBinWidth, noteTrashBinVerticalOffset),
                new Two.Anchor(noteTrashBinHorizontalOffset + noteTrashBinWidth, noteTrashBinVerticalOffset + noteTrashBinHeight),
                new Two.Anchor(noteTrashBinHorizontalOffset, noteTrashBinVerticalOffset + noteTrashBinHeight),
            ],
            false
        );
        noteTrashBinContainer.linewidth = sequencerAndToolsLineWidth
        noteTrashBinContainer.stroke = 'transparent'
        noteTrashBinContainer.fill = 'transparent'
        return noteTrashBinContainer
    }

    // show or hide the note trash bin (show if visible === true, hide otherwise)
    function setNoteTrashBinVisibility(visible) {
        if (visible) {
            noteTrashBinContainer.stroke = trashBinColor
        } else {
            noteTrashBinContainer.stroke = 'transparent'
        }
    }

    // given a number and an upper and lower bound, confine the number to be between the bounds.
    // if the number if below the lower bound, return the lower bound.
    // if it is above the upper bound, return the upper bound.
    // if it is between the bounds, return the number unchanged.
    function confineNumberToBounds(number, lowerBound, upperBound) {
        if (number < lowerBound) {
            return lowerBound
        } else if (number > upperBound) {
            return upperBound
        } else {
            return number
        }
    }

    // quick happy-path unit test for confineNumberToBounds()
    function testConfineNumberToBounds() {
        assertEquals(5, confineNumberToBounds(4, 5, 10), "number below lower bound")
        assertEquals(5, confineNumberToBounds(5, 5, 10), "number same as lower bound")
        assertEquals(6, confineNumberToBounds(6, 5, 10), "number between the bounds")
        assertEquals(10, confineNumberToBounds(10, 5, 10), "number same as upper bound")
        assertEquals(10, confineNumberToBounds(11, 5, 10), "number above upper bound")
    }
}