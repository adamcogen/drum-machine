window.onload = () => {

    // Initialize Two.js library
    let two = initializeTwoJs(document.getElementById('draw-shapes'))

    // initialize sound file constants
    const SOUND_FILES_PATH = './sounds/';
    const BASS_DRUM = "bass-drum";
    const HI_HAT_CLOSED = 'hi-hat-closed';
    const HI_HAT_OPEN = 'hi-hat-open';
    const SNARE = 'snare';
    const WAV_EXTENSION = '.wav';

    // load all sound files
    let samples = {}
    samples[HI_HAT_CLOSED] = new DrumSoundInfo(loadSample(HI_HAT_CLOSED, SOUND_FILES_PATH + HI_HAT_CLOSED + WAV_EXTENSION), '#bd3b07') // #b58f04 , this was yellow before
    samples[HI_HAT_OPEN] = new DrumSoundInfo(loadSample(HI_HAT_OPEN, SOUND_FILES_PATH + HI_HAT_OPEN + WAV_EXTENSION), '#b8961c') // #bf3d5e , this was red before
    samples[SNARE] = new DrumSoundInfo(loadSample(SNARE, SOUND_FILES_PATH + SNARE + WAV_EXTENSION), '#0e6e21')
    samples[BASS_DRUM] = new DrumSoundInfo(loadSample(BASS_DRUM, SOUND_FILES_PATH + BASS_DRUM + WAV_EXTENSION), '#1b617a')

    // initialize the list of sample names we will use. the order of this list determines the order of sounds on the sound bank
    let sampleNameList = [HI_HAT_CLOSED, HI_HAT_OPEN, SNARE, BASS_DRUM]

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
     let loopLengthInMillis = 1200; // length of the whole drum sequence (loop), in millliseconds
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
    let numberOfNotesInNoteBank = 4
    let noteBankPadding = 20
    /**
     * gui settings: note trash bin
     */
    let noteTrashBinVerticalOffset = 340
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

    // initialize sequencer data structure
    let sequencer = new Sequencer(4, loopLengthInMillis)
    sequencer.rows[0].setNumberOfSubdivisions(8)
    sequencer.rows[1].setNumberOfSubdivisions(4)
    sequencer.rows[2].setNumberOfSubdivisions(2)
    sequencer.rows[3].setNumberOfSubdivisions(0)

    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects)
    let sequencerRowLines = initializeSequencerRowLines() // list of sequencer row lines
    let subdivionLineLists = initializeSubdivionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivion lines per row)
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
            circleBeingMoved.translation.x = mouseX
            circleBeingMoved.translation.y = mouseY
        }
    });

    // lifting your mouse anywhere means you're no longer click-dragging
    window.addEventListener('mouseup', (event) => {
        if (circleBeingMoved !== null) {
            /**
             * this is the workflow for determining where to put a circle that we were click-dragging once we release the mouse.
             * how this workflow works:
             * - note down initial information about circle starting state and current state.
             * - check for collision with the trash bin. if colliding, new row is < 0.
             * - check for collision with a sequencer row. if colliding, new row is > 0.
             * - how to handle states:
             *   - if the note isn't colliding with a row or the trash bin, put it back where it came from, no change.
             *   - if old row is >= 0, remove the note from its old row
             *   - of old row is < 0, do NOT remove the note from its old row
             *   - if new row is >= 0, place the note into its new row
             *   - if new row < 0, do NOT place the note into a new row
             *   - this means: 
             *     - old row >= 0, new row < 0: is a delete operation. delete a note from its old row, without adding it back anywhere.
             *     - old row >= 0, new row >= 0: is a move-note operation. move note from one row to another or to a new place in the same row.
             *     - old row < 0, new row < 0: means a note was removed from the note bank but didn't end up on a row. there will be no change.
             *     - old row < 0, new row >= 0: takes a note from the note bank and adds it to a new row, without removing it from an old row.
             */
            // note down starting state, current state
            circleBeingMovedOldRow = circleBeingMoved.guiData.row
            circleBeingMovedNewRow = circleBeingMovedOldRow // we will determine whether we need a new value for this later
            circleNewXPosition = circleBeingMovedStartingPositionX // note, circle starting position was recorded when we frist clicked the circle
            circleNewYPosition = circleBeingMovedStartingPositionY
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            placementPadding = 10 // give this many pixels of padding on either side so we don't have to place the circle _precisely_ on its new line
            // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
            let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= noteTrashBinHorizontalOffset - placementPadding) && (mouseX <= noteTrashBinHorizontalOffset + noteTrashBinWidth + placementPadding)
            let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= noteTrashBinVerticalOffset - placementPadding) && (mouseY <= noteTrashBinVerticalOffset + noteTrashBinHeight + placementPadding)
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                if (circleBeingMoved.guiData.row >= 0) { // only bother throwing away things that came from a row. throwing away note bank notes is pointless
                    circleBeingMoved.remove() // remove the circle from the Two.js display
                    removeCircleFromAllDrawnCirclesList(circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles
                    // if the deleted note is the 'next note to schedule', we should increment that 'next note to schedule' to its .next (i.e. we should skip the deleted note)
                    if (nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row] !== null && nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row].label ===  circleBeingMoved.guiData.label) {
                        nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row] = nextNoteToScheduleForEachRow[circleBeingMoved.guiData.row].next
                    }
                    circleBeingMovedNewRow = -3 // set a placeholder row number reserved for notes in the trash
                }
            }
            // check if the note is being placed onto a sequencer row. if so, determine which row, and add it to the row line and data structure, etc.
            let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerHorizontalOffset - placementPadding) && (mouseX <= (sequencerHorizontalOffset + sequencerWidth) + placementPadding)
            let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerVerticalOffset - placementPadding) && (mouseY <= sequencerVerticalOffset + ((sequencer.numberOfRows - 1) * spaceBetweenSequencerRows) + placementPadding)
            if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                // if we get here, we know the circle is being placed within the vertical and horizontal boundaries of the sequencer.
                // next we want to do a more fine-grained calculation, for whether it is close to one of the sequencer lines.
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
                        circleNewXPosition = confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                        circleNewYPosition = confineNumberToBounds(mouseY, rowActualVerticalLocation, rowActualVerticalLocation)
                        circleBeingMovedNewRow = rowIndex
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
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
                node = sequencer.rows[circleBeingMovedOldRow].notesList.removeNode(circleBeingMoved.guiData.label)
                /**
                 * todo: consider whether we need to update 'next note to schedule' here in some cases.
                 * i think we do..
                 * i think that if 'next note to schedule' is the removed note, it will still play.
                 * easy fix should be to set 'next note to schedule' to its .next if the next note's label matches the removed note's label.
                 */
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
                 * todo: consider whether we need to update 'next note to schedule' here in some cases.
                 * i think we do..
                 * [current time] -> [inserted note] -> ['next note to schedule']
                 * need to test, but i think in this case, we won't play the newly inserted node.
                 * a way to fix could be to call 'next note to schedule' .prev if .prev.label === inserted node .label?
                 * we also need to deal with making sure the note isn't played twice. does scheduler handle that? maybe
                 */
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
                // or we reached the last note, which is fine, just go back to the beginning of the sequence
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

        // this will be the first part: schedule notes from the current time, to whichver of these comes first:
        //   - the end of the look-ahead window
        //   - the end of the loop
        let endTimeOfNotesToSchedule = currentTimeWithinCurrentLoop + LOOK_AHEAD_MILLIS // no need to trim this to the end of the loop, since there won't be any notes scheduled after the end anyway
        while (nextNoteToSchedule !== null && nextNoteToSchedule.priority >= currentTimeWithinCurrentLoop && nextNoteToSchedule.priority <= endTimeOfNotesToSchedule) {
            // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for
            if (numberOfLoopsSoFar > nextNoteToSchedule.data.lastScheduledOnIteration) {
                scheduleDrumSample(actualStartTimeOfCurrentLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
            }
            nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar // record the last iteration that the note was played on to avoid duplicate scheduling within the same iteration
            nextNoteToSchedule = nextNoteToSchedule.next
        }

        // this will be the second part: if the look-ahead window went past the end of the loop, schedule notes from the beginning
        // of the loop to the end of leftover look-ahead window time.
        let endTimeToScheduleUpToFromBeginningOfLoop = endTimeOfNotesToSchedule - loopLengthInMillis // calulate leftover time to schedule for from beginning of loop, e.g. from 0 to 7 millis from above example
        let actualStartTimeOfNextLoop = actualStartTimeOfCurrentLoop + loopLengthInMillis
        if (endTimeToScheduleUpToFromBeginningOfLoop >= 0) {
            nextNoteToSchedule = sequencer.rows[sequencerRowIndex].notesList.head
            while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeToScheduleUpToFromBeginningOfLoop) {
                // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for
                if (numberOfLoopsSoFar + 1 > nextNoteToSchedule.data.lastScheduledOnIteration) {
                    scheduleDrumSample(actualStartTimeOfNextLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                }
                nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar + 1
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
        let row = -2 // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
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

    // add 'subdivion lines' to each sequencer row. these lines divide each row into the given number of evenly-sized sections.
    // in other words, if a row's 'subdivision count' is 5, that row will be divided into 5 even chunks (it will have 5 subdivision
    // lines). subdivision lines pretty much represent 'beats', so a line that is subdivided into 5 sections shows 5 beats.
    function initializeSubdivionLines() {
        let allSubdivisionLineLists = []
        let subdivisionLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < sequencer.numberOfRows; rowsDrawn++) {
            if (sequencer.rows[rowsDrawn].getNumberOfSubdivions() <= 0) {
                continue; // don't draw subdivions for this row if it has 0 or fewer subdivisions
            }
            let xIncrementBetweenSubdivisions = sequencerWidth / sequencer.rows[rowsDrawn].getNumberOfSubdivions()
            for (let subdivionsDrawnForRow = 0; subdivionsDrawnForRow < sequencer.rows[rowsDrawn].getNumberOfSubdivions(); subdivionsDrawnForRow++) {
                let subdivionLine = two.makePath(
                    [
                        new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivionsDrawnForRow), sequencerVerticalOffset - 1 + (rowsDrawn * spaceBetweenSequencerRows)),
                        new Two.Anchor(sequencerHorizontalOffset + (xIncrementBetweenSubdivisions * subdivionsDrawnForRow), sequencerVerticalOffset + (rowsDrawn * spaceBetweenSequencerRows) + subdivisionLineHeight),
                    ], 
                    false
                );
                subdivionLine.linewidth = sequencerAndToolsLineWidth;
                subdivionLine.stroke = subdivisionLineColor

                subdivisionLinesForRow.push(subdivionLine) // keep a list of all subdivision lines for the current row
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

/**
 * Class definitions for note bank, sequencer, id generator, etc.
 */

// generate a unique id number.
// just increments a counter by 1 and returns the counter value each time you ask for a new id.
// could add capacity for a larger number of IDs by using hex, or just including letters in IDs
// as well. could also consider padding with a specified number of 0s and returning as a string
// if we wanted ID generation to be a little more uniform. none of that matters for now.
class IdGenerator {
    constructor() {
        this.idCounter = 0
    }

    getNextId() {
        let id = this.idCounter
        this.idCounter += 1
        return id
    }
}

// store info about a particular drum sound (i.e. sample), such as its file and its color
class DrumSoundInfo {
    constructor(file, color) {
        this.file = file
        this.color = color
    }
}

// class to generate new nodes for notes that have been pulled off the sample bank
// to be placed onto the sequencer. this class also accepts an ID generator so we
// can keep track of which IDs have already been used as node labels in the drum
// sequencer.
class SampleBankNodeGenerator {
    constructor(idGenerator, sampleNameList = []) {
        this.idGenerator = idGenerator
        this.sampleNameList = sampleNameList
    }

    createNewNodeForSample(sampleName) {
        if (this.sampleNameList.includes(sampleName)) {
            return new PriorityLinkedListNode(this.idGenerator.getNextId(), -1, {
                lastScheduledOnIteration: -1,
                sampleName: sampleName
            })
        } else {
            throw "requested a sample name from the sample bank that doesn't exist! requested sample name: " + sampleName + ". sample list: " + sampleList + "."
        }
    }

}

// a drum sequencer, which is made up of multiple rows that can have notes placed onto them.
class Sequencer {
    constructor(numberOfRows = 4, loopLengthInMillis = 1000, sampleBank = []) {
        this.numberOfRows = numberOfRows
        this.loopLengthInMillis = loopLengthInMillis
        this.rows = this.initializeEmptySequencerRows()
        this.sampleBank = sampleBank
    }

    initializeEmptySequencerRows(){
        let rows = []
        let rowCount = 0
        while (rowCount < this.numberOfRows) {
            let row = new SequencerRow(this.loopLengthInMillis)
            rows.push(row)
            rowCount++
        }
        return rows
    }

    // add a new empty row to the end of the drum sequencer
    addRow() {
        // todo: implement this
    }

    // delete a particular drum sequencer row, at the the specified index
    deleteRowAtIndex() {
        // todo: implement this
    }

    // move an existing row to a new place in the drum sequencer, i.e. changing the order of the existing rows.
    changeRowIndex() {
        // todo: implement this
    }

    // todo: add getters and setters for class fields. setters will take a bit of logic to adjust everything whenever we make changes to values.
}

// a drum sequencer row. each drum sequencer can have any number of rows, which can have notes placed onto them.
class SequencerRow {
    constructor(loopLengthInMillis) {
        this.loopLengthInMillis = loopLengthInMillis
        this.notesList = new PriorityLinkedList()
        this.subdivision = 0
    }

    getNumberOfSubdivions() {
        return this.subdivision
    }

    // must be an integer 
    // (non-integer values would have cycles that are longer than one loop length, 
    // support for that isn't planned in this drum machine)
    setNumberOfSubdivisions(value) {
        this.subdivision = value
    }
}