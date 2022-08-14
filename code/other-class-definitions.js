/**
 * This file contains class definitions for note bank node generator, ID generator, 
 * and any other small miscellaneous classes used in the drum machine implementation.
 */

// class used to generate unique ID numbers.
// just increments a counter by 1 and returns the counter value each time you ask for a new ID.
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
        let sampleIndex = this.sampleNameList.indexOf(sampleName);
        if (sampleIndex != -1) {
            return new PriorityLinkedListNode(this.idGenerator.getNextId(), -1, {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: sampleName,
                beat: Sequencer.NOTE_IS_NOT_QUANTIZED,
            })
        } else {
            throw "requested a sample name from the sample bank that doesn't exist! requested sample name: " + sampleName + ". sample list: " + this.sampleNameList + "."
        }
    }

}