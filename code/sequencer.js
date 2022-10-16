/**
 * This file contains the sequencer and sequencer row classes.
 * The sequencer manages time, scheduling of notes, etc.
 */

// a drum sequencer, which is made up of multiple rows that can have notes placed onto them.
class Sequencer {
    // create constants to denote special beat numbers
    static get NOTE_IS_NOT_QUANTIZED() { return -1 }

    // create constants to denote special 'lastPlayedOnIteration' values
    static get NOTE_HAS_NEVER_BEEN_PLAYED() { return -1 }

    constructor(audioDrivers, numberOfRows = 4, loopLengthInMillis = 1000, lookAheadMillis = 50, samples = []) {
        this.audioDrivers = audioDrivers
        this.numberOfRows = numberOfRows
        this.loopLengthInMillis = loopLengthInMillis
        this.rows = this.initializeEmptySequencerRows()
        this.lookAheadMillis = lookAheadMillis
        this.samples = samples
        /**
         * set up time-keeping / pause-related variables.
         * we will probably eventually need to manage multiple timekeepers 
         * at once, one for each audio driver.. for now just start with one.
         * 
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
        this.currentTime = this.audioDrivers[0].getCurrentTimeInMilliseconds // current time since audio context was started, in millis
        this.timekeeping = {
            mostRecentUnpauseTime: 0, // raw time in millis for when we most recently unpaused the sequencer
            mostRecentPauseTimeWithinLoop: 0, // when we last paused, how far into the loop were we? as in, if we paused half way thru a loop, this will be millis representing half way thru the loop
            currentTimeWithinCurrentLoop: 0, // how many millis into the current loop are we?
            theoreticalStartTimeOfCurrentLoop: 0 // calculate what time the current loop started at (or would have started at in theory, if we account for pauses)
        }
        this.paused = false; // store whether sequencer is paused or not
        this.pause(); // start the sequencer paused
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

    pause() {
        this.paused = true;
        this.timekeeping.mostRecentPauseTimeWithinLoop = this.timekeeping.currentTimeWithinCurrentLoop
    }

    unpause() {
        this.paused = false;
        this.timekeeping.mostRecentUnpauseTime = this.currentTime
    }

    /**
     * this is the main update method for the sequencer.
     * it should be called as often as possible, i.e. constantly, within the main update loop of the drum machine. 
     * when it runs, it will manage updating all time-keeping variables and will schedule upcoming notes.
     */
    update() {
        this.currentTime = this.audioDrivers[0].getCurrentTimeInMilliseconds()
        if (this.paused) {
            this.timekeeping.currentTimeWithinCurrentLoop = this.timekeeping.mostRecentPauseTimeWithinLoop // updated for the sake of the on-screen time tracking lines
        } else {
            this.timekeeping.currentTimeWithinCurrentLoop = (this.currentTime - this.timekeeping.mostRecentUnpauseTime + this.timekeeping.mostRecentPauseTimeWithinLoop) % this.loopLengthInMillis
            this.timekeeping.theoreticalStartTimeOfCurrentLoop = (this.currentTime - this.timekeeping.currentTimeWithinCurrentLoop) // put this here because no need to update it if we are currently paused
            this.scheduleAllUpcomingNotes(this.currentTime, this.timekeeping.currentTimeWithinCurrentLoop, this.timekeeping.theoreticalStartTimeOfCurrentLoop) // schedule notes
        }
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
    addEmptyRow() {
        let row = new SequencerRow(this.loopLengthInMillis)
        this.rows.push(row)
        this.numberOfRows++
    }

    // delete a particular drum sequencer row, at the the specified index
    removeRowAtIndex(index) {
        if (index < 0 || index >= this.numberOfRows) {
            throw "index of row to remove was not valid. must be >= 0 and < " + this.numberOfRows + ", but was " + index + ".";
        }
        let removedRow = this.deleteArrayElementAtIndex(this.rows, index)[0];
        this.numberOfRows--;
        return removedRow;
    }

    // insert the given sequencer row at the specified index.
    // this does support inserting a new element at the end of the list.
    insertRowAtIndex(sequencerRowObjectToInsert, index) {
        if (index < 0 || index > this.numberOfRows) {
            throw "index of row to insert was not valid. must be >= 0 and <= " + this.numberOfRows + ", but was " + index + ".";
        }
        this.insertArrayElementAtIndex(this.rows, sequencerRowObjectToInsert, index);
        this.numberOfRows++;
    }

    // move an existing row to a new place in the drum sequencer, i.e. changing the order of the existing rows.
    // remove the row from its old place and insert it at its new place. this is different than switching the rows.
    // row order is maintained, just one element is pulled out and put somewhere else.
    moveRowToNewIndex(rowToMoveIndex, newIndex) {
        let removedRow = this.removeRowAtIndex(rowToMoveIndex);
        this.insertRowAtIndex(removedRow, newIndex);
    }

    // switch two existing sequencer rows with each other.
    switchRows(oldIndex, newIndex) {
        // perform input validation checks
        if (oldIndex < 0 || oldIndex >= this.numberOfRows) {
            throw "starting index of row to move was not valid. must be >= 0 and < " + this.numberOfRows + ", but was " + oldIndex + ".";
        }
        if (newIndex < 0 || newIndex >= this.numberOfRows) {
            throw "new index to move row to was not valid. must be >= 0 and < " + this.numberOfRows + ", but was " + newIndex + ".";
        }
        if (oldIndex === newIndex) {
            return;
        }
        let temp = this.rows[oldIndex]
        this.rows[oldIndex] = this.rows[newIndex]
        this.rows[newIndex] = temp
    }

    setNumberOfRows(newNumberOfRows) {
        if (newNumberOfRows > this.rows.length) {
            while (this.rows.length != newNumberOfRows) {
                this.addEmptyRow()
            }
        } else if (newNumberOfRows < this.rows.length) { 
            while (this.rows.length != newNumberOfRows) {
                this.removeRowAtIndex(this.rows.length - 1)
            }
        } else { // newNumberOfRows === this.rows.length
            return;
        }
    }

    // helper function for working with arrays
    // todo: check -- does this return an empty list if there is no element with the given index?
    deleteArrayElementAtIndex(array, indexOfElementToDelete) {
        let listOfOneRemovedElement = array.splice(indexOfElementToDelete, 1) // this should go in and delete the element we want to delete!
        return listOfOneRemovedElement
    }

    // insert an element into an array at the given index.
    insertArrayElementAtIndex(array, element, indexToInsertElementAt) {
        array.splice(indexToInsertElementAt, 0, element)
    }

    // todo: add getters and setters for class fields. setters will take a bit of logic to adjust everything whenever we make changes to values.

    setNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        this.rows[rowIndex].setNumberOfSubdivisions(newNumberOfSubdivisions)
    }

    setNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex) {
        this.rows[rowIndex].setNumberOfReferenceLines(newNumberOfReferenceLines)
    }

    setQuantizationForRow(quantize, rowIndex) {
        this.rows[rowIndex].setQuantization(quantize);
    }

    // update loop length in millis. the bulk of the logic for this is handled at the row level, so just iterate through all rows
    // updating their loop length, then update the value of the 'loop length' variable we have stored in the main sequencer.
    setLoopLengthInMillis(newLoopLengthInMillis) {
        let oldLoopLengthInMillis = this.loopLengthInMillis
        for (let row of this.rows) {
            row.setLoopLengthInMillis(newLoopLengthInMillis)
        }
        this.loopLengthInMillis = newLoopLengthInMillis
        // scale the 'current time within loop' up or down, such that we have progressed the same percent through the loop 
        // (i.e. keep progressing the sequence from the same place it was in before changing tempo, now just faster or slower)
        this.timekeeping.mostRecentPauseTimeWithinLoop = (newLoopLengthInMillis / oldLoopLengthInMillis) * this.timekeeping.mostRecentPauseTimeWithinLoop
    }

    // iterate through each sequencer row, scheduling upcoming notes for all of them
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
                this.scheduleDrumSample(actualStartTimeOfCurrentLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName, nextNoteToSchedule.data.volume)
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
                    this.scheduleDrumSample(actualStartTimeOfNextLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName, nextNoteToSchedule.data.volume)
                    nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFarPlusOne
                }
                nextNoteToSchedule = nextNoteToSchedule.next
            }
        }
        return nextNoteToSchedule
    }

    // play the sample with the given name right away (don't worry about scheduling it for some time in the future)
    playDrumSampleNow(sampleName, sampleGain=.5) {
        // initialize sound data JSON object
        let soundData = {
            file: this.samples[sampleName].file,
            playbackRate: 1, 
            gain: sampleGain,
        }

        // for each audio driver, play the sound now
        for (let audioDriver of this.audioDrivers) {
            audioDriver.playSoundNow(soundData)
        }
    }

    // schedule the sample with the given name to play at the specified time in millis
    scheduleDrumSample(startTime, sampleName, sampleGain=.5){
        // initialize sound data JSON object
        let soundData = {
            file: this.samples[sampleName].file,
            playbackRate: 1, 
            gain: sampleGain,
        }

        // for each 'schedule sounds ahead of time' audio driver, schedule the sound at the speicifed time
        for (let audioDriver of this.audioDrivers) {
            if (audioDriver.scheduleSoundsAheadOfTime) {
                audioDriver.scheduleSound(soundData, startTime)
            }
        }
    }

    // restart the sequencer
    restart() {
        this.timekeeping.mostRecentPauseTimeWithinLoop = 0
        this.timekeeping.mostRecentUnpauseTime = this.currentTime
        this.timekeeping.currentTimeWithinCurrentLoop = 0
        this.timekeeping.theoreticalStartTimeOfCurrentLoop = 0
        for (let row of this.rows) {
            row.resetNextNoteToSchedule()
            row.markAllNotesAsNeverBeenScheduled()
        }
    }

    // delete all the notes from the sequencer
    clear() {
        for (let row of this.rows) {
            row.clear()
        }
    }

    clearRow(rowIndex) {
        this.rows[rowIndex].clear()
    }

    // serialize this sequencer object's pattern to a JSON string, from which it can later be recreated.
    // only the data that is needed to reconstruct the sequencer pattern will be serialized. everything 
    // else (such as audio drivers, look-ahead configuration, or anything else like that) will be kept
    // as whatever was used to construct the sequencer instance that 'deserialize' is being called on.
    serialize() {
        return JSON.stringify({
            "loopLength": this.loopLengthInMillis,
            "rows": this.rows.map( (row) => row._serialize() ),
        })
    }

    // deserialize a sequencer object from a JSON string. 
    // only the data that is needed to reconstruct the sequencer pattern will be deserialized. everything 
    // else (such as audio drivers, look-ahead configuration, or anything else like that) will be kept
    // as whatever was used to construct the sequencer instance that 'deserialize' is being called on.
    deserialize(json, sampleBankNodeGenerator) {
        let deserializedObject = JSON.parse(json);
        this.setLoopLengthInMillis(deserializedObject.loopLength)
        this.setNumberOfRows(deserializedObject.rows.length)
        for (let rowIndex = 0; rowIndex < this.numberOfRows; rowIndex++) {
            let deserializedRowObject = JSON.parse(deserializedObject.rows[rowIndex])
            let numberOfSubdivisionsForRow = deserializedRowObject.subdivisions;
            let quantizeRow = deserializedRowObject.quantized;
            this.setNumberOfSubdivisionsForRow(numberOfSubdivisionsForRow, rowIndex);
            this.setQuantizationForRow(quantizeRow, rowIndex);
            this.setNumberOfReferenceLinesForRow(deserializedRowObject.referenceLines, rowIndex);
            for (let deserializedNote of deserializedRowObject.notes) {
                let sequencerNode = sampleBankNodeGenerator.createNewNodeForSample(deserializedNote.sample)
                if (quantizeRow) {
                    sequencerNode.data.beat = deserializedNote.beat;
                    sequencerNode.priority = (this.loopLengthInMillis / numberOfSubdivisionsForRow) * sequencerNode.data.beat // calculate the time that the note should play at, given its beat number
                } else {
                    sequencerNode.beat = Sequencer.NOTE_IS_NOT_QUANTIZED
                    sequencerNode.priority = deserializedNote.priority;
                }
                sequencerNode.data.volume = deserializedNote.volume;
                this.rows[rowIndex].insertNode(sequencerNode, sequencerNode.label)
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

    // serialize the sequencer row so that it can be recreated later. this method is 'private' (starts with _) and there is no corresponding deserialize
    // method because this method is only meant to be called from within the Sequencer.serialize() method. this method alone is not sufficient to recreate
    // a sequencer row from scratch, it just stores relevant info that is distinct to each row within a particular sequencer pattern.
    _serialize() {
        let notes = [];
        let currentNode = this._notesList.head;
        while (currentNode !== null) {
            let note = { // store basic info that is always required to define every note
                "sample": currentNode.data.sampleName,
            }
            if (this.quantized) { // for quantized rows, store note time as a beat number
                note["beat"] = currentNode.data.beat
            } else { // for unquantized rows, store note time as raw time in milliseconds (the 'priorty' property of a node)
                note["priority"] = currentNode.priority
            }
            note["volume"] = currentNode.data.volume;
            notes.push(note)
            currentNode = currentNode.next
        }
        return JSON.stringify({
            "quantized": this.quantized,
            "subdivisions": this.subdivisions,
            "referenceLines": this.referenceLines,
            "notes": notes,
        })
    }

    // reset the 'next note to schedule' to notesList.head
    resetNextNoteToSchedule() {
        this.nextNoteToSchedule = this._notesList.head
        return this.nextNoteToSchedule
    }

    markAllNotesAsNeverBeenScheduled() {
        const NOTE_HAS_NEVER_BEEN_PLAYED = -1 // need to move this definition somewhere else -- either a shared place or define it in the sequencer only
        let note = this._notesList.head
        while (note !== null) {
            // reset 'last scheduled on iteration' for every note, so that notes will play even if we aren't technically on a new loop (such as after restarting the sequencer)
            note.data.lastScheduledOnIteration = NOTE_HAS_NEVER_BEEN_PLAYED;
            note = note.next
        }
    }

    // delete all the notes from this row
    clear() {
        this._notesList.clear()
        this.resetNextNoteToSchedule()
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
    // 'quantize' is a boolean. true and the row will be quantized, otherwise it will not be.
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