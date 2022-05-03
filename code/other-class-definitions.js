/**
 * This file contains class definitions for note bank node generator, sequencer, sequencer row, 
 * id generator, and any other small miscellaneous classes used in the drum machine implementation.
 */

// class used to generate unique id numbers.
// just increments a counter by 1 and returns the counter value each time you ask for a new id.
// could add capacity for a larger number of IDs by using base36, i.e. adding letters to IDs, not
// just numbers. Could also consider padding with a specified number of 0s and returning as a string
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

// store info about a particular type of sequencer note type (i.e. a particular drum sound), 
// such as its sound file and its color in the sequencer's GUI.
class SequencerNoteType {
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
                sampleName: sampleName,
                beat: -1,
            })
        } else {
            throw "requested a sample name from the sample bank that doesn't exist! requested sample name: " + sampleName + ". sample list: " + sampleList + "."
        }
    }

}

/**
 * This is an interface for audio drivers / audio contexts.
 * Subclasses can be implemented to allow for uniform interactions with multiple
 * different audio drivers (my current plan is to create a WebAudioDriver for the
 * WebAudio API, and eventually a MidiAudioDriver, which will support outputting 
 * live MIDI). This way the sequencer will be able to iterate through a list of 
 * multiple different audio drivers, and make the same method calls to each of
 * them in order to output sound in multiple ways or to multiple sources at the
 * same time. 
 */
class BaseAudioDriver {
    constructor(scheduleSoundsAheadOfTime = false) {
        this.scheduleSoundsAheadOfTime = scheduleSoundsAheadOfTime; // define the expected usage pattern for playing sounds with this audio driver.
    }

    scheduleSound(soundData, time) {
        throw "Method 'scheduleSound' from BaseAudioDriver needs to be implemented before being invoked."
    }

    playSoundNow(soundData) {
        throw "Method 'playSoundNow' from BaseAudioDriver needs to be implemented before being invoked."
    }

    getCurrentTimeInMilliseconds(){
        throw "Method 'getCurrentTimeInMilliseconds' from BaseAudioDriver needs to be implemented before being invoked."
    }
}

/**
 * Basic audio driver for Javascript WebAudio context.
 * 
 * Expected format of soundData: a JSON object
 * soundData = {
 *   file: , // a WebAudio buffer containing a sound file
 *   playbackRate: , // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed
 *   gain: , // set gain (volume). 1 is default, .1 is 10 percent
 * }
 * 
 */
class WebAudioDriver extends BaseAudioDriver {
    constructor(webAudioContext){
        super(true);
        this.webAudioContext = webAudioContext;
    }

    // schedule a sound to play at the specified time in milliseconds
    scheduleSound(soundData, time) {
        let sound = this._setUpWebAudioContextSoundBufferSource(soundData)
        /**
         * we previously multipled the WebAudio context's raw time by 1,000 to convert it from seconds to milliseconds.
         * Now we will convert the time back into seconds, which is the format that the WebAudio API is expecting.
         */
        sound.start(time / 1000);
    }

    // make a sound to play immediately
    playSoundNow(soundData) {
        let sound = this._setUpWebAudioContextSoundBufferSource(soundData)
        sound.start();
    }

    // Set up and return the WebAudio API resource necessary for playing a sound
    _setUpWebAudioContextSoundBufferSource(soundData) {
        let sound = this.webAudioContext.createBufferSource(); // creates a sound source
        sound.buffer = soundData.file; // tell the sound source which file to play
        sound.playbackRate.value = soundData.playbackRate; // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed

        // set gain (volume). 1 is default, .1 is 10 percent
        let gainNode = this.webAudioContext.createGain();
        gainNode.gain.value = soundData.gain;
        gainNode.connect(this.webAudioContext.destination);
        sound.connect(gainNode); // connect the sound to the context's destination (the speakers)

        return sound
    }

    // return the current time according to the WebAudio context
    getCurrentTimeInMilliseconds() {
        /**
         * we mutliply the WebAudio context's raw time by 1,000 to convert it from seconds to milliseconds,
         * just as a matter of preference. That seems more intelligible to me than using seconds. 
         * this means that we will also need to divide any given time by 1,000 when we go to schedule it,
         * so that it is back in the format that the WebAudio API is expecting.
         */ 
        return this.webAudioContext.currentTime * 1000;
    }
}

// to do: implement MIDI audio driver. depending on how midi support matches up with the way the WebAudio API works, 
// in the worst case this MIDI driver should be able to work decently as a 'play sounds now' audio driver, rather
// than scheduling them ahead of time. need to look into this.
class MidiAudioDriver extends BaseAudioDriver {}

// a drum sequencer, which is made up of multiple rows that can have notes placed onto them.
class Sequencer {
    constructor(audioDrivers, numberOfRows = 4, loopLengthInMillis = 1000, lookAheadMillis = 50, samples = []) {
        this.audioDrivers = audioDrivers
        this.numberOfRows = numberOfRows
        this.loopLengthInMillis = loopLengthInMillis
        this.rows = this.initializeEmptySequencerRows()
        this.lookAheadMillis = lookAheadMillis
        this.samples = samples
    }

    initializeEmptySequencerRows() {
        let rows = []
        let rowCount = 0
        while (rowCount < this.numberOfRows) {
            let row = new SequencerRow(this.loopLengthInMillis)
            rows.push(row)
            rowCount++
        }
        return rows
    }

    getNextNoteToScheduleForRow(rowIndex) {
        return this.rows[rowIndex].nextNoteToSchedule
    }

    // potential problem: we are passing in an actual note here. that could be bad. what if we scheduled a note that isn't even in the row? 
    // maybe this isn't an issue, but potential fixes could be to pass in a note index instead of a note, or perform a check to make sure
    // the given note exists in the row, and throw if it doesn't. it might not matter too much though, since this method will only be
    // called internally, so maybe we could just assume it will always be given sensible inputs :-)
    setNextNoteToScheduleForRow(rowIndex, note) {
        this.rows[rowIndex].nextNoteToSchedule = note
    }

    // for the given row index, set 'next note to schedule' back to the head of the notes list
    resetNextNoteToScheduleForRow(rowIndex) {
        this.rows[rowIndex].resetNextNoteToSchedule()
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

    setNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        this.rows[rowIndex].setNumberOfSubdivisions(newNumberOfSubdivisions)
    }

    setNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex) {
        this.rows[rowIndex].setNumberOfReferenceLines(newNumberOfReferenceLines)
    }

    // update loop length in millis. the bulk of the logic for this is handled at the row level, so just iterate through all rows
    // updating their loop length, then update the value of the 'loop length' variable we have stored in the main sequencer.
    setLoopLengthInMillis(newLoopLengthInMillis) {
        for (let row of this.rows) {
            row.setLoopLengthInMillis(newLoopLengthInMillis)
        }
        this.loopLengthInMillis = newLoopLengthInMillis
    }

    scheduleAllUpcomingNotes(currentTime, currentTimeWithinCurrentLoop, theoreticalStartTimeOfCurrentLoop) {
        for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
            if (this.getNextNoteToScheduleForRow(rowIndex) === null) {
                // if nextNoteToSchedule is null, the list was empty at some point, so keep polling for a note to be added to it.
                // or we reached the last note, which is fine, just go back to the beginning of the sequence.
                this.resetNextNoteToScheduleForRow(rowIndex)
            }

            if (this.getNextNoteToScheduleForRow(rowIndex) !== null) { // will always be null if (and only if) the row's note list is empty
                let nextNoteToScheduleForRow = this.scheduleNotesForCurrentTime(this.getNextNoteToScheduleForRow(rowIndex), rowIndex, currentTime, currentTimeWithinCurrentLoop, theoreticalStartTimeOfCurrentLoop)
                this.setNextNoteToScheduleForRow(rowIndex, nextNoteToScheduleForRow)
            }
        }
    }

    scheduleNotesForCurrentTime(nextNoteToSchedule, sequencerRowIndex, currentTime, currentTimeWithinCurrentLoop, actualStartTimeOfCurrentLoop) {
        let numberOfLoopsSoFar = Math.floor(currentTime / this.loopLengthInMillis) // mostly used to make sure we don't schedule the same note twice. this number doesn't account for pauses, but i think that's fine. todo: make sure that's fine

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
        let endTimeOfNotesToSchedule = currentTimeWithinCurrentLoop + this.lookAheadMillis // no need to trim this to the end of the loop, since there won't be any notes scheduled after the end anyway
        // keep iterating until the end of the list (nextNoteToSchedule will be 'null') or until nextNoteToSchedule is after 'end of notes to schedule'
        // what should we do if nextNoteToSchedule is _before_ 'beginning of notes to schedule'?
        while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeOfNotesToSchedule) {
            // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for.
            // don't schedule a note unless it hasn't been scheduled on this loop iteration and it goes after the current time (i.e. don't schedule notes in the past, just skip over them)
            if (nextNoteToSchedule.priority >= currentTimeWithinCurrentLoop && numberOfLoopsSoFar > nextNoteToSchedule.data.lastScheduledOnIteration) {
                this.scheduleDrumSample(actualStartTimeOfCurrentLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar // record the last iteration that the note was played on to avoid duplicate scheduling within the same iteration
            }
            nextNoteToSchedule = nextNoteToSchedule.next
        }

        // this will be the second part: if the look-ahead window went past the end of the loop, schedule notes from the beginning
        // of the loop to the end of leftover look-ahead window time.
        let endTimeToScheduleUpToFromBeginningOfLoop = endTimeOfNotesToSchedule - this.loopLengthInMillis // calulate leftover time to schedule for from beginning of loop, e.g. from 0 to 7 millis from above example
        let actualStartTimeOfNextLoop = actualStartTimeOfCurrentLoop + this.loopLengthInMillis
        let numberOfLoopsSoFarPlusOne = numberOfLoopsSoFar + 1
        if (endTimeToScheduleUpToFromBeginningOfLoop >= 0) {
            nextNoteToSchedule = this.rows[sequencerRowIndex]._notesList.head
            while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeToScheduleUpToFromBeginningOfLoop) {
                // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for
                if (numberOfLoopsSoFarPlusOne > nextNoteToSchedule.data.lastScheduledOnIteration) {
                    this.scheduleDrumSample(actualStartTimeOfNextLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                    nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFarPlusOne
                }
                nextNoteToSchedule = nextNoteToSchedule.next
            }
        }
        return nextNoteToSchedule
    }

    // play the sample with the given name right away (don't worry about scheduling it for some time in the future)
    playDrumSampleNow(sampleName) {
        // initialize sound data JSON object
        let soundData = {
            file: this.samples[sampleName].file,
            playbackRate: 1, 
            gain: .5,
        }

        // for each audio driver, play the sound now
        for (let audioDriver of this.audioDrivers) {
            audioDriver.playSoundNow(soundData)
        }
    }

    // schedule the sample with the given name to play at the specified time in millis
    scheduleDrumSample(startTime, sampleName){
        // initialize sound data JSON object
        let soundData = {
            file: this.samples[sampleName].file,
            playbackRate: 1, 
            gain: .5,
        }

        // for each 'schedule sounds ahead of time' audio driver, schedule the sound at the speicifed time
        for (let audioDriver of this.audioDrivers) {
            if (audioDriver.scheduleSoundsAheadOfTime) {
                audioDriver.scheduleSound(soundData, startTime)
            }
        }
    }

}

// a drum sequencer row. each drum sequencer can have any number of rows, which can have notes placed onto them.
class SequencerRow {
    constructor(loopLengthInMillis) {
        this.loopLengthInMillis = loopLengthInMillis
        this._notesList = new PriorityLinkedList()
        this.nextNoteToSchedule = this.resetNextNoteToSchedule() // get the next note that needs to be scheduled (will start as list 'head', and update as we go)
        this.subdivisions = 0
        this.quantized = false
        this.referenceLines = 0
    }

    // reset the 'next note to schedule' to notesList.head
    resetNextNoteToSchedule() {
        this.nextNoteToSchedule = this._notesList.head
        return this.nextNoteToSchedule
    }

    getNumberOfSubdivisions() {
        return this.subdivisions
    }

    getNumberOfReferenceLines() {
        return this.referenceLines
    }

    /**
     * remove a node from this sequencer row safely, including management of any 
     * changes that are needed so that 'next note to schedule' is updated correctly.
     */
    removeNode(labelOfNodeToRemove) {
        /**
         * if the deleted note is the 'next note to schedule', we should increment that 'next note to schedule' to its .next 
         * (i.e. we should skip the deleted note)
         * 
         * more detailed explanation:
         * we need to update 'next note to schedule' here in the following case: if 'next note to schedule' is the removed note.
         * if we didn't specifically handle this case, then if 'next note to schedule' was the removed note, it would still play.
         * this may not seem too bad at first, but the old (removed) note has a null .next value, so the rest of the notes in the 
         * row would no longer play if we didn't fix this.
         * a fix is to set 'next note to schedule' to its .next if the next note's label matches the removed note's label,
         * _before_ removing the moved note from its row.
         */
        if (this.nextNoteToSchedule !== null && this.nextNoteToSchedule.label === labelOfNodeToRemove) {
            this.nextNoteToSchedule = this.nextNoteToSchedule.next
        }

        let node = this._notesList.removeNode(labelOfNodeToRemove)
        return node
    }

    /**
     * insert a new node into this sequencer row safely, including management of any 
     * changes that are needed so that 'next note to schedule' is updated correctly.
     */
    insertNode(newNode, newNodeLabel) {
        this._notesList.insertNode(newNode, newNodeLabel)
        /**
         * we need to update 'next note to schedule' here in the following case:
         * [current time] -> [inserted note] -> ['next note to schedule']
         * if we didn't specifcally handle this case, we wouldn't play the newly inserted node.
         * a way to fix is to call 'next note to schedule' .prev if .prev.label === inserted node .label.
         */
        if (this.nextNoteToSchedule !== null && this.nextNoteToSchedule.previous !== null && this.nextNoteToSchedule.previous.label === newNodeLabel) {
            this.nextNoteToSchedule = this.nextNoteToSchedule.previous
        }
    }

    // must be an integer 
    // (non-integer values would have cycles that are longer than one loop length, 
    // support for that isn't planned in this drum machine)
    // todo: much work to be done to allow for changing the number of subdivisions in a quantized row with notes already on it
    /**
     * for the first iteration of the logic to adjust the number of subdivisions for quantized rows, we will just keep all notes' 
     * beat numbers the same, and update their timestampts accordingly. if the new number of subdivisions is fewer than there were 
     * previously, we'll delete any notes that got "cut off" -- i.e. if we are changing the number of subdivisions from 5 to 3, notes
     * on beats 4 and 5 will just be deleted.
     * i thought of a better way to handle updating number of subdivisions than this, which I will implement later.
     * the new way will be that we will just take old note timestamps, and quantize them to the new subdivisions.
     * whatever time the existing notes are at, we will snap them to the closest new subdivision. that way seems
     * like it will make sense. also, maybe we can de-dup things, so any notes with the same sample that fall on 
     * the same beat after doing this will be de-duped and only one will remain for each sample? need to think 
     * about it more, maybe de-duping isn't necessary.
     */
    setNumberOfSubdivisions(newNumberOfSubdivisions) {
        if (newNumberOfSubdivisions === this.subdivisions) {
            return // if new number of subdivisions === current number of subdivisions, do nothing
        }
        if (this.quantized) { // if the row is quantized, we should adjust the existing notes to be quantized to the new subdivisions
            let newLengthOfOneSubdivision = (this.loopLengthInMillis / newNumberOfSubdivisions)
            if (newNumberOfSubdivisions > this.subdivisions) {
                // adding more subdivisions: keep existing 'beat' numbers of each note the same, just we'll just add more subdivisions after them, and adjust note priorities.
                let note = this._notesList.head
                while(note) {
                    // just adjust note priorities. to do: this means the updated note priorities won't by applied to 'next note to schedule' until the next iteration. that's not ideal!
                    note.priority = (note.data.beat * newLengthOfOneSubdivision)
                    note = note.next
                }
            } else if (newNumberOfSubdivisions < this.subdivisions) {
                // taking subdivisions away: need to decide on behavior here, but maybe we just cut off the notes with 'beat' number higher than the last new subdivision?
                let note = this._notesList.head
                while(note) {
                    // adjust note priorities, and remove notes if their 'beat' value no longer exists for the new number of subdivisions
                    if (note.data.beat >= newNumberOfSubdivisions) {
                        let nextNoteToCheck = note.next
                        this.removeNode(note.label)
                        note = nextNoteToCheck // manually skip to the note after the deleted note (which now has a null .next value)
                    } else {
                        // to do: updated priority won't be applied to 'next note to schedule' until the next iteration here:
                        note.priority = (note.data.beat * newLengthOfOneSubdivision)
                        note = note.next
                    }
                }
            }
        }
        this.subdivisions = newNumberOfSubdivisions
    }

    setNumberOfReferenceLines(newNumberOfReferenceLines) {
        this.referenceLines = newNumberOfReferenceLines
    }

    // set whether this row should be quantized or not.
    // 'quantize' is a boolean. true and the row will be quantized,
    // otherwise it will not be.
    // todo: much work to be done here to allow for setting the quantization of a row with notes already on it.
    setQuantization(quantize) {
        this.quantized = quantize
        /**
         * if quantization has just been turned on, we need to quantize a previous un-quantized row.
         * this will mean snapping notes that were previously unquantized, onto the grid.
         * if quantization has been turned off, no need to change anything besides the row's 
         * quantization setting -- no notes need to be moved, they just won't snap to the
         * grid the next time the user tries to move them. although maybe we _do_ want to 
         * change the 'beat' number that is stored in each note once we turn off quantization.
         */
        if (this.quantized) { // if quantization has just been turned on..
            /**
             * how should we handle quantization? we should be able to rely on note priorities alone, right?
             * - based on a note's priority, find out which beat it is closest to.
             *   - does this mean a note can wrap back around to the other side of the sequencer when it gets quantized (jump from end 
             *     of row to beginning on-screen)? i'd say yes, that makes sense to do. although it may appear counter-intuitive to the
             *     user. i'll have to see once I implement it. I'd say the view of the loop as a line is slightly counter-intuitive on
             *     the whole, because things can be evenly spaced out but look un-even. for example if there are 4 evenly spaced notes, 
             *     there will be empty space at the end of the row (between beats 4 and 1) and no empty space at the beginning of it
             *     (between the start of the measure and beat 1). i think this is just a result of how the drum machine is set up.
             * - snap the note into that position by updating it's priority and also give it a beat number to match it's new position.
             * - to preserve the sorted nature of the notes list, we will remove all nodes from the list, make adjustments to them, then
             *   insert them again. there is definitely a better way to do that but this will work for now, can improve later if needed.
             *   could be made cleaner by adding a "re-sort list" method to the data structure, or a "new from array of nodes" constructor.
             *   some thought / decisions to be made there about which usage pattern should be encouraged.
             */
            let note = this._notesList.head;
            let allExistingNotes = []
            while (note) {
                allExistingNotes.push(note)
                note = note.next
            }
            this._notesList.clear()
            for (note of allExistingNotes) {
                let closestBeatToNote = this._getClosestBeatNumberForPriority(note.priority);
                note.data.beat = closestBeatToNote
                let newPriorityOfNote = this._getPriorityForBeatNumber(closestBeatToNote);
                note.priority = newPriorityOfNote;
                this._notesList.insertNode(note)
            }
        } else { // quantization has just been turned off
            // set each note's beat number to a value indicating: 'this note is not quantized'
            const NOTE_IS_NOT_QUANTIZED = -1; // to do: this constant value is also used by the GUI logic. I need to find a better (single / shared / common) place to define this value
            let note = this._notesList.head
            while (note) {
                note.data.beat = NOTE_IS_NOT_QUANTIZED;
                note = note.next
            }
        }
    }

    /**
     * when we turn quantization on for a row that was previously un-quantized, we need each note in that row to snap onto a beat.
     * this method calculates which beat number a note at a given priority should snap to.
     * remember that 'priority' here refers to the time in milliseconds that the note should play wihtin each loop.
     */
    _getClosestBeatNumberForPriority(priority) {
        let lengthOfEachBeatInMilliseconds = this.loopLengthInMillis / this.getNumberOfSubdivisions();
        let numberOfBeatsBeforeNote = Math.floor(priority / lengthOfEachBeatInMilliseconds);
        let noteIsCloserToRightBeatThanLeft = (priority % lengthOfEachBeatInMilliseconds) > (lengthOfEachBeatInMilliseconds / 2);
        let closestBeat = numberOfBeatsBeforeNote;
        if (noteIsCloserToRightBeatThanLeft) {
            closestBeat += 1;
        }
        return closestBeat % this.getNumberOfSubdivisions() // modulo operator is used here so that we wrap around to the beggining if we're close enough to end of the loop
    }

    /**
     * when we turn quantization on for a row that was previously un-quantized, we need each note in that row to snap onto a beat.
     * this method calculates what priority a note should have, given what beat number the note falls on.
     * remember that 'priority' here refers to the time in milliseconds that the note should play wihtin each loop.
     */
    _getPriorityForBeatNumber(beatNumber) {
        let lengthOfEachBeatInMilliseconds = this.loopLengthInMillis / this.getNumberOfSubdivisions();
        return beatNumber * lengthOfEachBeatInMilliseconds;
    }

    setLoopLengthInMillis(newLoopLengthInMillis) {
        let currentNode = this._notesList.head
        while (currentNode) {
            // todo: consider using the 'beat number' variable stored in each node when scaling, if it's available
            currentNode.priority = (newLoopLengthInMillis / this.loopLengthInMillis) * currentNode.priority // 'scale' the priority (timestamp) of each node to the new tempo, so that ordering and timing are maintained, but the loop is just faster or slower as appropriate
            currentNode.data.lastScheduledOnIteration = -1 // the 'number of iterations so far' calculation relies on loop length, so it becomes wrong when we change that value. so let's just reset the number we have stored here to prevent it from being misinterpreted.
            currentNode = currentNode.next
        }
        this.loopLengthInMillis = newLoopLengthInMillis
    }
}