/**
 * This file contains the main logic and function definitions for running and updating the sequencer, its on-screen display, etc.
 */

window.onload = () => {

    // Store DOM elements we use, so that we can access them without having to pull them from the DOM each time
    let domElements = {
        divs: {
            drawShapes: document.getElementById('draw-shapes'),
            tempoTextInputs: document.getElementById('tempo-text-inputs'),
            subdivisionTextInputs: document.getElementById('subdivision-text-inputs')
        },
        textInputs: {
            loopLengthMillis: document.getElementById('text-input-loop-length-millis'),
        }
    }

    // Initialize Two.js library
    let two = initializeTwoJs(domElements.divs.drawShapes)

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
    let _audioContext = new AudioContext();
    let webAudioDriver = new WebAudioDriver(_audioContext);

    // wait until the first click before resuming the audio context (this is required by Chrome browser)
    window.onclick = () => {
        _audioContext.resume()
    }

    /**
     * drum machine configurations
     */
     let loopLengthInMillis = 1500; // length of the whole drum sequence (loop), in millliseconds
     const LOOK_AHEAD_MILLIS = 50; // number of milliseconds to look ahead when scheduling notes to play. note bigger value means that there is a longer delay for sounds to stop after the 'pause' button is hit.
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
     * gui settings: pause button
     */
    let pauseButtonVerticalOffset = 74
    let pauseButtonHorizontalOffset = 40
    let pauseButtonWidth = 48
    let pauseButtonHeight = 48
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
    let referenceLineColor = '#ababab' // meant to be slightly lighter than the subdivision line color
    /**
     * gui settings: mouse movement, note placing
     */
    let placementPadding = 20 // give this many pixels of padding on either side of things when we're placing, so we don't have to place them _precisely_ on the line, the trash bin, etc.
    /**
     * tempo text input settings
     */
    domElements.divs.tempoTextInputs.style.left = "477px"
    domElements.divs.tempoTextInputs.style.top = "25px"
    let maximumAllowedLoopLengthInMillis = 99999 // this number is chosen to match the width of the text input. if we make the input wider we can allow for bigger numbers. fractional numbers less than this could still go over the width of the box.
    /**
     * subdivision text input settings
     */
    let subdivisionTextInputHorizontalPadding = 10
    let subdivisionTextInputVerticalPadding = 0 // centered on sequencer line (old value): -17
    let referenceLineTextInputVerticalPadding = -35
    let maximumAllowedNumberOfSubdivisions = 1000


    // initialize sequencer data structure
    let sequencer = new Sequencer([webAudioDriver], 6, loopLengthInMillis, LOOK_AHEAD_MILLIS, samples)
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

    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects)
    let referenceLineLists = initializeAllReferenceLines() // list of lists, storing 'reference' lines for each sequencer row (one list of reference lines per row)
    let sequencerRowLines = initializeAllSequencerRowLines() // list of sequencer row lines
    let subdivisionLineLists = initializeAllSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
    let drumTriggerLines = initializeDrumTriggerLines() // list of lines that move to represent the current time within the loop
    let noteBankContainer = initializeNoteBankContainer() // a rectangle that goes around the note bank
    let noteTrashBinContainer = initializeNoteTrashBinContainer() // a rectangle that acts as a trash can for deleting notes
    let pauseButton = initializePauseButton() // a rectangle that will act as the pause button for now
    setNoteTrashBinVisibility(false) // trash bin only gets shown when we're moving a note

    two.update(); // this initial 'update' creates SVG '_renderer' properties for our shapes that we can add action listeners to, so it needs to go here

    initializeTempoTextInputValuesAndStyles();
    initializeTempoTextInputActionListeners();

    // start putting together some subdivision text input proof-of-concept stuff here
    let subdivisionTextInputs = []
    initializeSubdivisionTextInputsValuesAndStyles();
    initializeSubdivisionTextInputsActionListeners();

    let referenceLineTextInputs = []
    initializeReferenceLineTextInputsValuesAndStyles();
    initializeReferenceLineTextInputsActionListeners();

    // add checkboxes for toggling quantization on each row. these might be replaced with hand-drawn buttons of some sort later for better UI
    let quantizationCheckboxes = []
    initializeQuantizationCheckboxes();
    initializeQuantizationCheckboxActionListeners();

    addPauseButtonActionListeners()

    // create variables which will be used to track info about the note that is being clicked and dragged
    let circleBeingMoved = null
    let circleBeingMovedStartingPositionX = null
    let circleBeingMovedStartingPositionY = null
    let circleBeingMovedOldRow = null
    let circleBeingMovedNewRow = null
    let circleBeingMovedOldBeatNumber = null
    let circleBeingMovedNewBeatNumber = null
    
    // create constants that will be used to denote special sequencer 'row' numbers, to indicate special places notes can go such as the note bank or the trash bin
    const HAS_NO_ROW_NUMBER = -1 // code for 'not in any row'
    const NOTE_BANK_ROW_NUMBER = -2
    const NOTE_TRASH_BIN_ROW_NUMBER = -3

    // create constants that denote special beat numbers
    const NOTE_IS_NOT_QUANTIZED = -1

    // create constants that denote special 'lastPlayedOnIteration' values
    const NOTE_HAS_NEVER_BEEN_PLAYED = -1

    // set up a initial example drum sequence
    initializeDefaultSequencerPattern()

    // keep a list of all the circles (i.e. notes) that have been drawn on the screen
    let allDrawnCircles = []

    drawAllNoteBankCircles()
    drawNotesToReflectSequencerCurrentState()

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
                            circleBeingMovedNewBeatNumber = getIndexOfClosestSubdivisionLine(mouseX, sequencer.rows[rowIndex].getNumberOfSubdivisions())
                            circleBeingMoved.translation.x = getXPositionOfSubdivisionLine(circleBeingMovedNewBeatNumber, sequencer.rows[rowIndex].getNumberOfSubdivisions())
                        } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                            circleBeingMoved.translation.x = confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                            circleBeingMovedNewBeatNumber = NOTE_IS_NOT_QUANTIZED
                        }
                        // quantization has a more complicated effect on x position than y. y position will always just be on line, so always just put it there.
                        circleBeingMoved.translation.y = rowActualVerticalLocation;
                        circleBeingMovedNewRow = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
                    }
                }
            }
        }
    });

    // lifting your mouse anywhere means you're no longer click-dragging
    window.addEventListener('mouseup', (event) => {
        if (circleBeingMoved !== null) {
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
            // note down starting state, current state.
            circleNewXPosition = circleBeingMovedStartingPositionX // note, circle starting position was recorded when we frist clicked the circle.
            circleNewYPosition = circleBeingMovedStartingPositionY // if the circle is not colliding with a row etc., it will be put back to its old place, so start with the 'old place' values.
            circleNewBeatNumber = circleBeingMovedOldBeatNumber
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            // check for collisions with things (sequencer rows, the trash bin, etc.)and make adjustments accordingly, so that everything will be handled as explained in the block comment above
            if (circleBeingMovedNewRow >= 0) { // this means the note is being put onto a new sequencer row
                circleNewXPosition = circleBeingMoved.translation.x // the note should have already been 'snapped' to its new row in the 'mousemove' event, so just commit to that new location
                circleNewYPosition = circleBeingMoved.translation.y
                circleNewBeatNumber = circleBeingMovedNewBeatNumber
            } else if (circleBeingMovedNewRow === HAS_NO_ROW_NUMBER) { // if the note isn't being put onto any row, just put it back wherever it came from
                circleNewXPosition = circleBeingMovedStartingPositionX
                circleNewYPosition = circleBeingMovedStartingPositionY
                circleBeingMovedNewRow = circleBeingMovedOldRow // replace the 'has no row' constant value with the old row number that this was taken from (i.e. just put it back where it came from!)
                circleNewBeatNumber = circleBeingMovedOldBeatNumber
            } else if (circleBeingMovedNewRow === NOTE_TRASH_BIN_ROW_NUMBER) { // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
                if (circleBeingMovedOldRow === NOTE_BANK_ROW_NUMBER) { // if the note being thrown away came from the note bank, just put it back in the note bank.
                    circleBeingMovedNewRow = NOTE_BANK_ROW_NUMBER
                } else { // only bother throwing away things that came from a row (throwing away note bank notes is pointless)
                    removeCircleFromDisplay(circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles and from the two.js canvas
                }
            }
            // we are done checking for collisions with things and updating 'old row' and 'new row' values, so now move on to updating the sequencer
            circleBeingMoved.translation.x = circleNewXPosition
            circleBeingMoved.translation.y = circleNewYPosition
            circleBeingMoved.guiData.row = circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
            if (circleBeingMovedOldRow >= 0) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                node = sequencer.rows[circleBeingMovedOldRow].removeNode(circleBeingMoved.guiData.label)
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
                sequencer.rows[circleBeingMovedNewRow].insertNode(node, circleBeingMoved.guiData.label)
                node.data.lastScheduledOnIteration = NOTE_HAS_NEVER_BEEN_PLAYED // mark note as 'not played yet on current iteration'
                node.data.beat = circleNewBeatNumber
                circleBeingMoved.guiData.beat = circleNewBeatNumber
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
     * initialize some variables that will be used for timekeeping, managing of pauses, etc.
     */
    /**
     * how should time tracking / pausing be managed?
     * how time tracking worked previously, before adding the ability to pause:
     *   - we tracked 'current time' in millis
     *   - we calculated 'start time of current loop': Math.floor('current time' / 'loop length')
     *   - we know the time at which each note should play within the loop, so if a note
     *     needed to play, we scheduled it for its real time:
     *     'start time of current loop' + 'time this note should play within loop'
     * how should time work, if we want to be able to pause?
     * the tricky thing is that we want to unpause from wherever we paused (i.e. could need to resume half way through a loop), and still have the scheduler work correctly.
     *   - we track 'current time' in millis
     *   - we track 'most recent unpause time'
     *   - we track 'most recent pause-time within loop' (as in, whether most recent pause happened half way thru a loop, towards the end of it, etc., but in millis)
     *   - we calculate 'current time within current loop', account for all the pause-related stuff we tracking (see the code below for how)
     *   - we calculate 'theoretical start time of current loop, calculating for pauses': basically just 'actual current time' - 'current time within current loop'
     *   - once we have 'theoretical start time of current loop' and 'current time within current loop', we have enough info to schedule notes exactly the way we did
     *     before, and pausing / unpausing will be account for. we can also do little things like tell the scheduler to run only if the sequencer is unpaused, etc.
     */
    let currentTime = 0 // current time since audio context was started, in millis
    let mostRecentUnpauseTime = 0 // raw time in millis for when we most recently unpaused the sequencer
    let mostRecentPauseTimeWithinLoop = 0 // when we last paused, how far into the loop were we? as in, if we paused half way thru a loop, this will be millis representing half way thru the loop
    let currentTimeWithinCurrentLoop = 0 // how many millis into the current loop are we?
    let theoreticalStartTimeOfCurrentLoop = 0 // calculate what time the current loop started at (or would have started at in theory, if we account for pauses)
    let paused = false // store whether sequencer is paused or not

    pause();

    /**
     * end of main logic, start of function definitions.
     */

    // this method is the 'update' loop that will keep updating the page. after first invocation, this method basically calls itself recursively forever.
    function draw() {
        currentTime = webAudioDriver.getCurrentTimeInMilliseconds()

        if (paused) {
            currentTimeWithinCurrentLoop = mostRecentPauseTimeWithinLoop // updated for the sake of the on-screen drum trigger lines
        } else {
            currentTimeWithinCurrentLoop = (currentTime - mostRecentUnpauseTime + mostRecentPauseTimeWithinLoop) % loopLengthInMillis
            theoreticalStartTimeOfCurrentLoop = (currentTime - currentTimeWithinCurrentLoop) // no need to update if we are currently paused
        }

        drumTriggersXPosition = sequencerHorizontalOffset + (sequencerWidth * (currentTimeWithinCurrentLoop / loopLengthInMillis))

        for (let drumTriggerLine of drumTriggerLines) {
            drumTriggerLine.position.x = drumTriggersXPosition
        }

        // make circles get bigger when they play.
        for (let circle of allDrawnCircles) {
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

        // iterate through each sequencer row, scheduling upcoming notes for all of them
        if (!paused) {
            sequencer.scheduleAllUpcomingNotes(currentTime, currentTimeWithinCurrentLoop, theoreticalStartTimeOfCurrentLoop)
        }

        two.update() // update the GUI display
        requestAnimationFrameShim(draw); // call animation frame update with this 'draw' method again
    }

    // load a sample from a file. to load from a local file, this script needs to be running on a server.
    function loadSample(sampleName, url) {
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

    function initializeCheckbox(verticalPosition, horizontalPosition) {
        let checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.style.position = "absolute";
        checkbox.style.top = "" + verticalPosition + "px";
        checkbox.style.left = "" + horizontalPosition + "px";
        checkbox.style.width = "20px"
        checkbox.style.height = "20px"
        checkbox.style.outline = "20px"
        domElements.divs.subdivisionTextInputs.appendChild(checkbox);
        checkbox.style.cursor = "pointer"
        return checkbox
    }

    function initializeQuantizationCheckboxes() {
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let verticalPosition = sequencerVerticalOffset + (spaceBetweenSequencerRows * rowIndex) + subdivisionTextInputVerticalPadding + 4
            let horizontalPosition = sequencerHorizontalOffset + sequencerWidth + 73
            let checkbox = initializeCheckbox(verticalPosition, horizontalPosition)
            if (sequencer.rows[rowIndex].quantized) {
                checkbox.checked = true;
            }
            quantizationCheckboxes.push(checkbox)
        }
    }

    function initializeQuantizationCheckboxActionListeners() {
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let checkbox = quantizationCheckboxes[rowIndex]
            checkbox.addEventListener('click', (event) => {
                if (sequencer.rows[rowIndex].getNumberOfSubdivisions() === 0) {
                    // you can't quantize a row if it has 0 subdivisions, so automatically change the value to 1 in this case
                    updateNumberOfSubdivisionsForRow(1, rowIndex)
                }
                sequencer.rows[rowIndex].setQuantization(checkbox.checked)
                removeAllCirclesFromDisplay()
                drawAllNoteBankCircles()
                drawNotesToReflectSequencerCurrentState()
            });
        }
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
        let sequencerLeftEdge = sequencerHorizontalOffset
        let widthOfEachSubdivision = sequencerWidth / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencer / widthOfEachSubdivision)
        let mouseIsCloserToRightSubdivisionThanLeft = (mouseXWithinSequencer % widthOfEachSubdivision) > (widthOfEachSubdivision / 2)
        let subdivisionToSnapTo = subdivisionNumberToLeftOfMouse
        if (mouseIsCloserToRightSubdivisionThanLeft) {
            subdivisionToSnapTo += 1
        }
        return confineNumberToBounds(subdivisionToSnapTo, 0, numberOfSubdivisions - 1)
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
        let sequencerLeftEdge = sequencerHorizontalOffset
        let widthOfEachSubdivision = sequencerWidth / numberOfSubdivisions
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

    // set up a default initial drum sequence with some notes in it.
    function initializeDefaultSequencerPattern(){
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), 0, 
        {
            lastScheduledOnIteration: NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: HI_HAT_CLOSED,
            beat: 0,
        }
        ))
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 8) * 3, 
        {
            lastScheduledOnIteration: NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: WOODBLOCK,
            beat: 3,
        }
        ))
        sequencer.rows[1].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 1, 
            {
                lastScheduledOnIteration: NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: HI_HAT_OPEN,
                beat: 1,
            }
        ))
        sequencer.rows[2].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), ((loopLengthInMillis / 4) * 2), 
            {
                lastScheduledOnIteration: NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: SNARE,
                beat: NOTE_IS_NOT_QUANTIZED,
            }
        ))
        sequencer.rows[3].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 3, 
            {
                lastScheduledOnIteration: NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: BASS_DRUM,
                beat: NOTE_IS_NOT_QUANTIZED,
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
                let xPosition = sequencerHorizontalOffset + (sequencerWidth * (noteToDraw.priority / sequencer.loopLengthInMillis))
                let yPosition = sequencerVerticalOffset + (sequencerRowIndex * spaceBetweenSequencerRows)
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
        let xPosition = noteBankHorizontalOffset + noteBankPadding + (unplayedCircleRadius / 2)
        let yPosition = noteBankVerticalOffset + noteBankPadding + (indexOfSampleInNoteBank * unplayedCircleRadius) + (indexOfSampleInNoteBank * spaceBetweenNoteBankNotes)
        let row = NOTE_BANK_ROW_NUMBER // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
        /**
         * the top note in the note bank will have label '-1', next one down will be '-2', etc.
         * these negative number labels will still be unique to a particular circle in the note bank,
         * and these IDs will be replaced with a real, normal label (a generated ID) once each note
         * bank circle is taken fom the note bank and placed onto a real row.
         */
        let label = (indexOfSampleInNoteBank + 1) * -1 // see block comment above for info about '-1' here
        drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, NOTE_IS_NOT_QUANTIZED)
    }

    // create a new circle (i.e. note) on the screen, with the specified x and y position. color is determined by sample name. 
    // values given for sample name, label, and row number are stored in the circle object to help the GUI keep track of things.
    // add the newly created circle to the list of all drawn cricles.
    function drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat) {
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
            circleBeingMovedOldBeatNumber = circleBeingMoved.guiData.beat
            circleBeingMovedNewBeatNumber = circleBeingMovedOldBeatNumber
            setNoteTrashBinVisibility(true)
            sequencer.playDrumSampleNow(circleBeingMoved.guiData.sampleName)
        });

        // add info to the circle object that the gui uses to keep track of things
        circle.guiData = {}
        circle.guiData.sampleName = sampleName
        circle.guiData.row = row
        circle.guiData.label = label
        circle.guiData.beat = beat

        // add circle to list of all drawn circles
        allDrawnCircles.push(circle)
    }

    // remove a circle from the 'allDrawnCircles' list and two.js canvas, based on its label.
    // this is meant to be used during deletion of notes from the sequencer, with the idea being that deleting
    // them from this list and maybe from a few other places will clear up clutter, and hopefully allow the 
    // deleted circles to get garbage-collected.
    // note that this method _only_ deletes circles from the _display_, not from the underlying sequencer data
    // structure, that needs to be handled somewhere else separately.
    function removeCircleFromDisplay(label){
        let indexOfListItemToRemove = allDrawnCircles.findIndex(elementFromList => elementFromList.guiData.label === label);
        if (indexOfListItemToRemove === -1) { //  we don't expect to reach this case, where a circle with the given label isn't found in the list
            throw "unexpected problem: couldn't find the circle with the given label in the list of all drawn circles, when trying to delete it. the given label was: " + label + ". full list (labels only): " + allDrawnCircles.map((item) => item.guiData.label) + "."
        }
        let listOfOneRemovedElement = allDrawnCircles.splice(indexOfListItemToRemove, 1) // this should go in and delete the element we want to delete!
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
        let allDrawnCirclesCopy = [...allDrawnCircles] // make a copy of the drawn circles list so we can iterate through its circles while also removing the items from the original list
        for (let note of allDrawnCirclesCopy) {
            removeCircleFromDisplay(note.guiData.label)
        }
    }

    // draw lines for sequencer rows. return a list of the drawn lines. these will be Two.js 'path' objects.
    function initializeAllSequencerRowLines() {
        let sequencerRowLines = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            let sequencerRowLine = initializeSequencerRowLine(rowsDrawn)
            sequencerRowLines.push(sequencerRowLine)
        }
        return sequencerRowLines
    }

    function initializeSequencerRowLine(rowIndex) {
        let sequencerRowLine = two.makePath(
            [
                new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows)),
                new Two.Anchor(sequencerHorizontalOffset + sequencerWidth, sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows)),
            ], 
            false
        );
        sequencerRowLine.linewidth = sequencerAndToolsLineWidth;
        sequencerRowLine.stroke = sequencerAndToolsLineColor
        return sequencerRowLine
    }

    function removeSequencerRowLine(rowIndex) {
        sequencerRowLines[rowIndex].remove();
        sequencerRowLines[rowIndex] = null;
    }

    function removeDrumTriggerLine(rowIndex) {
        drumTriggerLines[rowIndex].remove();
        drumTriggerLines[rowIndex] = null;
    }

    // add 'subdivision lines' to each sequencer row. these lines divide each row into the given number of evenly-sized sections.
    // in other words, if a row's 'subdivision count' is 5, that row will be divided into 5 even chunks (it will have 5 subdivision
    // lines). subdivision lines pretty much represent 'beats', so a line that is subdivided into 5 sections shows 5 beats.
    function initializeAllSubdivisionLines() {
        let allSubdivisionLineLists = []
        let subdivisionLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            subdivisionLinesForRow = initializeSubdivisionLinesForRow(rowsDrawn)
            allSubdivisionLineLists.push(subdivisionLinesForRow) // keep a list of all rows' subdivision line lists
        }
        return allSubdivisionLineLists
    }

    // draw subdivision lines for a single sequencer row, with the given row index.
    // return a list of two.js 'path' objects representing each subdivision line for the sequncer row with the given index.
    function initializeSubdivisionLinesForRow(rowIndex) {
        let subdivisionLinesForRow = []
        if (sequencer.rows[rowIndex].getNumberOfSubdivisions() <= 0) {
            return [] // don't draw subdivisions for this row if it has 0 or fewer subdivisions
        }
        let xIncrementBetweenSubdivisions = sequencerWidth / sequencer.rows[rowIndex].getNumberOfSubdivisions()
        for (let subdivisionsDrawnForRow = 0; subdivisionsDrawnForRow < sequencer.rows[rowIndex].getNumberOfSubdivisions(); subdivisionsDrawnForRow++) {
            let subdivisionLine = two.makePath(
                [
                    new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), sequencerVerticalOffset - 1 + (rowIndex * spaceBetweenSequencerRows)),
                    new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows) + subdivisionLineHeight),
                ], 
                false
            );
            subdivisionLine.linewidth = sequencerAndToolsLineWidth;
            subdivisionLine.stroke = subdivisionLineColor

            subdivisionLinesForRow.push(subdivisionLine) // keep a list of all subdivision lines for the current row
        }
        return subdivisionLinesForRow
    }

    // given the index of a sequencer row, remove all subdivision lines from the display for that row.
    // the current intent of this is to delete them all so that they can be re-drawn afterwards (such as
    // when the number of subdivisions in a particular row is changed).
    function removeSubdivisionLinesForRow(rowIndex) {
        for (subdivisionLine of subdivisionLineLists[rowIndex]) {
            subdivisionLine.remove()
        }
        subdivisionLineLists[rowIndex] = []
    }

    function removeReferenceLinesForRow(rowIndex) {
        for (referenceLine of referenceLineLists[rowIndex]) {
            referenceLine.remove()
        }
        referenceLineLists[rowIndex] = []
    }

    function initializeAllReferenceLines() {
        let allReferenceLineLists = []
        let referenceLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            referenceLinesForRow = initializeReferenceLinesForRow(rowsDrawn)
            allReferenceLineLists.push(referenceLinesForRow) // keep a list of all rows' reference line lists
        }
        return allReferenceLineLists
    }

    function initializeReferenceLinesForRow(rowIndex) {
        let referenceLinesForRow = []
        if (sequencer.rows[rowIndex].getNumberOfReferenceLines() <= 0) {
            return [] // don't draw reference lines for this row if it has 0 or fewer
        }
        let xIncrementBetweenLines = sequencerWidth / sequencer.rows[rowIndex].getNumberOfReferenceLines()
        for (let linesDrawnForRow = 0; linesDrawnForRow < sequencer.rows[rowIndex].getNumberOfReferenceLines(); linesDrawnForRow++) {
            let referenceLine = two.makePath(
                [
                    new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenLines * linesDrawnForRow), sequencerVerticalOffset - 1 + (rowIndex * spaceBetweenSequencerRows)),
                    new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenLines * linesDrawnForRow), sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows) - subdivisionLineHeight),
                ], 
                false
            );
            referenceLine.linewidth = sequencerAndToolsLineWidth;
            referenceLine.stroke = referenceLineColor

            referenceLinesForRow.push(referenceLine) // keep a list of all reference lines for the current row
        }
        return referenceLinesForRow
    }

    function removeReferenceLinesForRow(rowIndex) {
        for (referenceLine of referenceLineLists[rowIndex]) {
            referenceLine.remove()
        }
        referenceLineLists[rowIndex] = []
    }

    // draw lines for the 'drum triggers' for each sequencer row.
    // these are the little lines above each sequencer line that track the current time within the loop.
    // return a list of the drawn lines. these will be Two.js 'path' objects.
    function initializeDrumTriggerLines() {
        let drumTriggerLines = []
        for (let drumTriggersDrawn = 0; drumTriggersDrawn < sequencer.numberOfRows; drumTriggersDrawn++) {
            let triggerLine = initializeDrumTriggerLineForRow(drumTriggersDrawn)
            drumTriggerLines.push(triggerLine)
        }
        return drumTriggerLines
    }

    function initializeDrumTriggerLineForRow(rowIndex) {
        let triggerLine = two.makePath(
            [
                new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset + drumTriggerHeight + (rowIndex * spaceBetweenSequencerRows)),
                new Two.Anchor(sequencerHorizontalOffset, sequencerVerticalOffset - drumTriggerHeight + (rowIndex * spaceBetweenSequencerRows)),
            ], 
            false
        );
        triggerLine.linewidth = sequencerAndToolsLineWidth;
        triggerLine.stroke = 'black'

        return triggerLine
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

    function initializePauseButton() {
        let pauseButton = two.makePath(
            [
                new Two.Anchor(pauseButtonHorizontalOffset, pauseButtonVerticalOffset),
                new Two.Anchor(pauseButtonHorizontalOffset + pauseButtonWidth, pauseButtonVerticalOffset),
                new Two.Anchor(pauseButtonHorizontalOffset + pauseButtonWidth, pauseButtonVerticalOffset + pauseButtonHeight),
                new Two.Anchor(pauseButtonHorizontalOffset, pauseButtonVerticalOffset + pauseButtonHeight),
            ],
            false
        );
        pauseButton.linewidth = sequencerAndToolsLineWidth
        pauseButton.stroke = sequencerAndToolsLineColor
        pauseButton.fill = 'transparent'
        return pauseButton
    }

    function addPauseButtonActionListeners() {
        pauseButton._renderer.elem.addEventListener('click', (event) => {
            togglePaused()
        })
    }

    // show or hide the note trash bin (show if visible === true, hide otherwise)
    function setNoteTrashBinVisibility(visible) {
        if (visible) {
            noteTrashBinContainer.stroke = trashBinColor
        } else {
            noteTrashBinContainer.stroke = 'transparent'
        }
    }

    // toggle whether the sequencer is 'paused' or not. this method gets called when we click the pause button
    function togglePaused() {
        if (paused) { // unpause 
            unpause()
        } else { // pause
            pause()
        }
    }

    function pause() {
        if (!paused) {
            paused = true
            mostRecentPauseTimeWithinLoop = currentTimeWithinCurrentLoop
            pauseButton.fill = "#bfbfbf"
        }
    }

    function unpause() {
        if (paused) {
            paused = false
            mostRecentUnpauseTime = currentTime
            pauseButton.fill = "transparent"
        }
    }

    // restart the sequence, as in move the drum trigger back to the beginning of the sequence
    function restartSequencer() {
        mostRecentPauseTimeWithinLoop = 0
        for (let i = 0; i < sequencer.rows.length; i++) {
            sequencer.resetNextNoteToScheduleForRow(i); // reset next note to schedule to each note list's 'head'
        }
    }

    function initializeTempoTextInputValuesAndStyles() {
        domElements.textInputs.loopLengthMillis.value = loopLengthInMillis
        domElements.textInputs.loopLengthMillis.style.borderColor = sequencerAndToolsLineColor
    }

    function initializeTempoTextInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'loop length in millis' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        domElements.textInputs.loopLengthMillis.addEventListener('blur', (event) => {
            let newTextInputValue = domElements.textInputs.loopLengthMillis.value.trim() // remove whitespace from beginning and end of input then store it
            if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                newTextInputValue = loopLengthInMillis
            }
            newTextInputValue = parseFloat(newTextInputValue) // do we allow floats rather than ints?? i think we could. it probably barely makes a difference though
            // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input
            newTextInputValue = confineNumberToBounds(newTextInputValue, LOOK_AHEAD_MILLIS, maximumAllowedLoopLengthInMillis)
            domElements.textInputs.loopLengthMillis.value = newTextInputValue
            updateSequencerLoopLength(newTextInputValue)
        })
    }

    function updateSequencerLoopLength(newLoopLengthInMillis) {
        if (loopLengthInMillis === newLoopLengthInMillis) { // save a little effort by skipping update if it isn't needed
            return
        }
        /**
         * note down current state before changing tempo
         */
        let oldLoopLengthInMillis = loopLengthInMillis
        let wasPaused = paused
        /**
         * update states
         */
        loopLengthInMillis = newLoopLengthInMillis
        pause()
        sequencer.setLoopLengthInMillis(loopLengthInMillis)
        // scale the 'current time within loop' up or down, such that we have progressed the same percent through the loop 
        // (i.e. keep progressing the sequence from the same place it was in before changing tempo, now just faster or slower)
        mostRecentPauseTimeWithinLoop = (newLoopLengthInMillis / oldLoopLengthInMillis) * mostRecentPauseTimeWithinLoop
        // only unpause if the sequencer wasn't paused before
        if (!wasPaused) {
            unpause()
        }
    }

    function initializeSubdivisionTextInputsValuesAndStyles() {
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let textArea = document.createElement("textarea");
            textArea.cols = "3"
            textArea.rows = "1"
            textArea.style.position = "absolute"
            textArea.style.top = "" + (sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows) + subdivisionTextInputVerticalPadding) + "px"
            textArea.style.left = "" + (sequencerHorizontalOffset + sequencerWidth + subdivisionTextInputHorizontalPadding) + "px"
            textArea.style.borderColor = sequencerAndToolsLineColor
            textArea.value = sequencer.rows[rowIndex].getNumberOfSubdivisions()
            domElements.divs.subdivisionTextInputs.appendChild(textArea);
            // note for later: the opposite of appendChild is removeChild
            subdivisionTextInputs.push(textArea)
            // textArea.disabled = "true" // todo: get rid of this line once the subdivision text inputs are functioning
        }
    }

    function initializeSubdivisionTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
            let subdivisionTextInput = subdivisionTextInputs[rowIndex]
            subdivisionTextInput.addEventListener('blur', (event) => {
                let newTextInputValue = subdivisionTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = sequencer.rows[rowIndex].getNumberOfSubdivisions()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = confineNumberToBounds(newTextInputValue, 0, maximumAllowedNumberOfSubdivisions)
                subdivisionTextInput.value = newTextInputValue
                updateNumberOfSubdivisionsForRow(newTextInputValue, rowIndex)
            })
        }
    }

    function initializeReferenceLineTextInputsValuesAndStyles() {
        for (let rowIndex = 0; rowIndex < sequencer.rows.length; rowIndex++) {
            let textArea = document.createElement("textarea");
            textArea.cols = "3"
            textArea.rows = "1"
            textArea.style.position = "absolute"
            textArea.style.top = "" + (sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows) + referenceLineTextInputVerticalPadding) + "px"
            textArea.style.left = "" + (sequencerHorizontalOffset + sequencerWidth + subdivisionTextInputHorizontalPadding) + "px"
            textArea.style.borderColor = referenceLineColor
            textArea.value = sequencer.rows[rowIndex].getNumberOfReferenceLines()
            domElements.divs.subdivisionTextInputs.appendChild(textArea);
            // note for later: the opposite of appendChild is removeChild
            referenceLineTextInputs.push(textArea)
            // textArea.disabled = "true" // todo: get rid of this line once the subdivision text inputs are functioning
        }
    }

    function initializeReferenceLineTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
            let referenceLineTextInput = referenceLineTextInputs[rowIndex]
            referenceLineTextInput.addEventListener('blur', (event) => {
                let newTextInputValue = referenceLineTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = sequencer.rows[rowIndex].getNumberOfReferenceLines()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = confineNumberToBounds(newTextInputValue, 0, maximumAllowedNumberOfSubdivisions)
                referenceLineTextInput.value = newTextInputValue
                updateNumberOfReferenceLinesForRow(newTextInputValue, rowIndex)
            })
        }
    }

    function updateNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        // update quantization toggle checkbox, quantization settings: you can't quantize a row if it has 0 subdivisions.
        if (newNumberOfSubdivisions === 0) {
            quantizationCheckboxes[rowIndex].checked = false
            sequencer.rows[rowIndex].quantized = false
        }

        // first delete all existing notes from the display for the changed row,
        // because now they may be out of date or some of them may have been deleted,
        // and the simplest thing to do may just be to delete them all then redraw
        // the current state of the sequencer for the changed row.
        /**
         * found a problem with deleting only a single row. shapes are layered on-screen in the order they are 
         * drawn (newer on top), so re-drawing only one row including its subdivision lines means if we move a 
         * circle from another line onto the row with newly drawn subdivision lines, the note will show up 
         * behind the subdivision lines. it isn't simple to change layer ordering in two.js, so instead of
         * re-drawing single rows, we will redraw the entire sequencer's notes whenever a big change 
         * happens, since it is simpler. also since notes are scheduled ahead of time, the extra computation
         * shouldn't affect the timing of the drums at all.
         */
        removeAllCirclesFromDisplay()
        // now update the sequencer data structure to reflect the new number of subdivisions.
        // call the sequencer's 'update subdivisions for row' method
        sequencer.setNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex)
        // next we will delete the subdivision lines for the changed row
        removeSubdivisionLinesForRow(rowIndex)
        removeDrumTriggerLine(rowIndex)
        // then we will draw the new subdivision lines for the changed row
        subdivisionLineLists[rowIndex] = initializeSubdivisionLinesForRow(rowIndex)
        drumTriggerLines[rowIndex] = initializeDrumTriggerLineForRow(rowIndex)
        // then we will add the notes from the sequencer data structure to the display, so the display accurately reflects the current state of the sequencer.
        drawAllNoteBankCircles()
        drawNotesToReflectSequencerCurrentState()
        subdivisionTextInputs[rowIndex].value = newNumberOfSubdivisions
    }

    function updateNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex) {
        // first delete all existing notes from the display for the changed row,
        // because now they may be out of date or some of them may have been deleted,
        // and the simplest thing to do may just be to delete them all then redraw
        // the current state of the sequencer for the changed row.
        // the same applies for the subdivion lines and the sequencer row line as well,
        // since we want those to be in front of the reference lines, which we are
        // redrawing now.
        removeAllCirclesFromDisplay()
        // now update the sequencer data structure to reflect the new number of reference lines.
        // call the sequencer's 'update number of reference lines for row' method
        sequencer.setNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex)
        // next we will delete all lines for the changed row
        removeSubdivisionLinesForRow(rowIndex)
        removeReferenceLinesForRow(rowIndex)
        removeSequencerRowLine(rowIndex)
        removeDrumTriggerLine(rowIndex)
        // then we will draw all the lines for the changed row, starting with reference lines since they need to be the bottom layer
        referenceLineLists[rowIndex] = initializeReferenceLinesForRow(rowIndex)
        subdivisionLineLists[rowIndex] = initializeSubdivisionLinesForRow(rowIndex)
        sequencerRowLines[rowIndex] = initializeSequencerRowLine(rowIndex)
        drumTriggerLines[rowIndex] = initializeDrumTriggerLineForRow(rowIndex)
        // then we will add the notes from the sequencer data structure to the display, so the display accurately reflects the current state of the sequencer.
        drawAllNoteBankCircles()
        drawNotesToReflectSequencerCurrentState()
        referenceLineTextInputs[rowIndex].value = newNumberOfReferenceLines
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