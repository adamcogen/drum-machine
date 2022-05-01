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

// a drum sequencer, which is made up of multiple rows that can have notes placed onto them.
class Sequencer {
    constructor(audioContext, numberOfRows = 4, loopLengthInMillis = 1000, lookAheadMillis = 50, samples = []) {
        this.audioContext = audioContext
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

    scheduleDrumSample(startTime, sampleName){
        this.scheduleSound(this.samples[sampleName].file, startTime / 1000, .5)
    }

    // schedule a sample to play at the specified time
    scheduleSound(sample, time, gain=1, playbackRate=1) {
        let sound = this.audioContext.createBufferSource(); // creates a sound source
        sound.buffer = sample; // tell the sound source which sample to play
        sound.playbackRate.value = playbackRate; // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed

        // set gain (volume). 1 is default, .1 is 10 percent
        let gainNode = this.audioContext.createGain();
        gainNode.gain.value = gain;
        gainNode.connect(this.audioContext.destination);
        sound.connect(gainNode); // connect the sound to the context's destination (the speakers)

        sound.start(time);
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
    }

    // reset the 'next note to schedule' to notesList.head
    resetNextNoteToSchedule() {
        this.nextNoteToSchedule = this._notesList.head
        return this.nextNoteToSchedule
    }

    getNumberOfSubdivisions() {
        return this.subdivisions
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
                    // just adjust note priorities
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
                        this._notesList.removeNode(note.label)
                        note = nextNoteToCheck // manually skip to the note after the deleted note (which now has a null .next value)
                    } else {
                        note.priority = (note.data.beat * newLengthOfOneSubdivision)
                        note = note.next
                    }
                }
            }
        }
        this.subdivisions = newNumberOfSubdivisions
    }

    // set whether this row should be quantized or not.
    // 'quantize' is a boolean. true and the row will be quantized,
    // otherwise it will not be.
    // todo: much work to be done here to allow for setting the quantization of a row with notes already on it.
    setQuantization(quantize) {
        this.quantized = quantize
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