/**
 * This file contains class definitions for note bank node generator, sequencer, sequencer row, 
 * id generator, and any other small miscellaneous classes used in the drum machine implementation.
 */

// class used to generate unique id numbers.
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

    // update loop length in millis. the bulk of the logic for this is handled at the row level, so just iterate through all rows
    // updating their loop length, then update the value of the 'loop length' variable we have stored in the main sequencer.
    setLoopLengthInMillis(newLoopLengthInMillis) {
        for (let row of this.rows) {
            row.setLoopLengthInMillis(newLoopLengthInMillis)
        }
        this.loopLengthInMillis = newLoopLengthInMillis
    }
}

// a drum sequencer row. each drum sequencer can have any number of rows, which can have notes placed onto them.
class SequencerRow {
    constructor(loopLengthInMillis) {
        this.loopLengthInMillis = loopLengthInMillis
        this.notesList = new PriorityLinkedList()
        this.subdivisions = 0
        this.quantized = false
    }

    getNumberOfSubdivisions() {
        return this.subdivisions
    }

    // must be an integer 
    // (non-integer values would have cycles that are longer than one loop length, 
    // support for that isn't planned in this drum machine)
    // todo: much work to be done to allow for changing the number of subdivisions in a quantized row with notes already on it
    setNumberOfSubdivisions(value) {
        this.subdivisions = value
    }

    // set whether this row should be quantized or not.
    // 'quantize' is a boolean. true and the row will be quantized,
    // otherwise it will not be.
    // todo: much work to be done here to allow for setting the quantization of a row with notes already on it.
    setQuantization(quantize) {
        this.quantized = quantize
    }

    setLoopLengthInMillis(newLoopLengthInMillis) {
        let currentNode = this.notesList.head
        while (currentNode) {
            // todo: consider using the 'beat number' variable stored in each node when scaling, if it's available
            currentNode.priority = (newLoopLengthInMillis / this.loopLengthInMillis) * currentNode.priority // 'scale' the priority (timestamp) of each node to the new tempo, so that ordering and timing are maintained, but the loop is just faster or slower as appropriate
            currentNode.data.lastScheduledOnIteration = -1 // the 'number of iterations so far' calculation relies on loop length, so it becomes wrong when we change that value. so let's just reset the number we have stored here to prevent it from being misinterpreted.
            currentNode = currentNode.next
        }
        this.loopLengthInMillis = newLoopLengthInMillis
    }
}