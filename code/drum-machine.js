/**
 * Start of linked list implementation
 */

class PriorityLinkedListNode {
    constructor(label, priority, data = {}, next = null, previous = null) {
        this.label = label
        this.priority = priority
        this.data = data
        this.next = next
        this.previous = previous
    }
    
    toString() {
        return "{label: '" + this.label + "'; priority: '" + this.priority + "'}"
    }

    hasNext() {
        return this.next !== null
    }
}

class PriorityLinkedList {
    constructor() {
        this.head = null
        this.size = 0
    }

    getSize() {
        return this.size
    }

    clear() {
        this.head = null;
    }

    getLast() {
        let lastNode = this.head;
        if (lastNode) {
            while (lastNode.next) {
                lastNode = lastNode.next
            }
        }
        return lastNode
    }

    getFirst() {
        return this.head;
    }

    toString() {
        let result = ""
        let node = this.head;
        while (node) {
            result += node + ", ";
            node = node.next
        }
        return result
    }

    // this isn't super useful until we implement an array comparison method.. for now [1,2] === [1,2] returns false
    getAllLabelsAsList() {
        let current = this.head
        let result = []
        while (current) {
            result.push(current.label)
            current = current.next
        }
        return result
    }

    // Given a particular priority, determine what index a node with that priority would be inserted at.
    // nodes with priorities that are already in the list will be inserted at the beginning of that priority's
    // nodes, rather than at the end, but that's an arbitrary choice.
    getIndexOfPriority(priority) {
        let index = 0
        if (this.head === null) {
            return index
        } else {
            let node = this.head
            while (node) {
                if (node.priority < priority) {
                    if (node.hasNext()) {
                        index += 1
                        node = node.next
                    } else {
                        index += 1
                        return index
                    }
                } else {
                    return index
                }
            }
        }
    }

    // this method ignores the requirement for the linked list to remain in sorted order.
    // I intend to use this as a helper method -- I will first retrieve the index to insert at
    // based on the new node's priority, then this method will perform the actual insert.
    insertNodeAtIndex(nodeToInsert, insertAtIndex) {
        let size = this.getSize()
        if (size === 0 && insertAtIndex !== 0) {
            throw "You're trying to insert into an empty list at an index other than 0! That can't be done. You tried to insert at index: " + insertAtIndex + "."
        }
        if (insertAtIndex > size + 1) { // for example, list with 2 items is size 2. to insert a 3rd item, pass in index '3'. passing in '4' will throw an error.
            throw "You're trying to insert into a list at index " + insertAtIndex + ", but list is only size " + size + ". You can only insert at an index from 0 to " + (size + 1) + " (inclsuive)."
        }
        if (this.head === null) { // list is empty. we already verified that in this case we are always inserting to index 0. so just set 'nodeToInsert' to be 'head'.
            this.head = nodeToInsert
            this.head.next = null
            this.head.previous = null
        } else { // list is _not_ empty. iterate through nodes until we get to the index we're inserting at, then insert there. 
            if (insertAtIndex === 0) { // insert at index 0 now if that's what we're doing
                // new arrangement: null -> head (nodeToInsert) -> oldHead
                let oldHead = this.head
                this.head = nodeToInsert
                this.head.previous = null
                this.head.next = oldHead
                oldHead.previous = this.head
            } else { // we now know we're not inserting to an empty list, or inserting at index 0.
                // we also know we are either inserting into the middle of the list somewhere, or adding an item to the end (i.e. the provided index is valid).
                let current = this.head
                let counter = 0
                // iterate until we get to the place we want to insert at
                while (counter < insertAtIndex - 1) {
                    counter += 1
                    current = current.next
                }
                // old expected list order: [...] -> current -> current.next -> [...]
                // new expected list order: [...] -> current -> nodeToInsert -> current.next -> [...]
                // aka current -> nodeToInsert -> oldNext
                let oldNext = current.next
                current.next = nodeToInsert
                nodeToInsert.previous = current
                nodeToInsert.next = oldNext
                if (oldNext !== null) {
                    oldNext.previous = nodeToInsert
                }
            }
        }
        this.size += 1
    }

    // insert a node in the right place based on its priority, maintaining the sorted order of the linked list
    insertNode(nodeToInsert) {
        let indexToInsertAt = this.getIndexOfPriority(nodeToInsert.priority)
        this.insertNodeAtIndex(nodeToInsert, indexToInsertAt)
    }

    // get the index of the _first_ node in the list has the given label.
    // if no node in the list has that label, return -1. 
    // this is intended to be used as a helper method that will be called before
    // 'removeNodeAtIndex', so that we can remove the first node with a given label
    // from our list.
    getIndexOfLabel(label) {
        if (this.size === 0) { // empty list, return -1 without needing to search thru.
            return -1
        }
        let index = 0
        let current = this.head
        while (true) {
            if (current.label === label) {
                return index
            } else {
                if (current.hasNext()) {
                    current = current.next
                    index += 1
                } else {
                    return -1
                }
            }
        }
    }

    // remove the node at the specified index.
    // return the node that was removed, so that we can easily re-insert it or insert it into another list if we want to
    removeNodeAtIndex(removeAtIndex) {
        let size = this.getSize()
        if (this.head === null) {
            throw "problem: you're trying to remove a node from an empty list. the list size: " + size + ". you tried to remove index: " + removeAtIndex + "."
        }
        if (removeAtIndex < 0) {
            throw "problem: you're trying to remove a node at an index that is < 0. i'd guess this PROBABLY means you're trying to remove a node with a label that wasn't found in the list (index -1 means specified label was not found). tried to remove at index: " + removeAtIndex
        }
        if (removeAtIndex >= size) {
            throw "problem: you're trying to remove a node at an index that is >= the size of the list. index: " + removeAtIndex + ". list size: " + size + "."
        }
        // at this point we know a few things cause of our pre-checks:
        //   - the list is not empty
        //   - we are trying to remove an index that is in the list (it's not less than zero, and it's not greater than or equal to 'size')
        
        let current = this.head
        let counter = 0

        while (counter < removeAtIndex) {
            if (current.hasNext()) {
                current = current.next
                counter += 1
            } else {
                throw "this is supposed to be an 'unreachable' safety check :( we've gotten to the end of list while trying to remove an item with index: " + removeAtIndex + ". list size is: " + size + ". we never found the right item."
            }
        }
        // now 'counter' should === 'removeAtIndex', and 'current' should be the node to remove!
        // old orientation: current.previous -> current -> current.next
        // new orientation: current.previous -> current.next
        // store nodes adjacent to the one we are removing
        let previous = current.previous
        let next = current.next
        // update pointers of nodes adjacent to the one we're removing, such that the one we're removing is cut out of the list
        if (previous !== null) { // if 'previous' is null, don't bother changing any of its pointers!
            previous.next = next
            // console.log("we're in the prev part. removeAtIndex: " + removeAtIndex + ". current: " + current + ". next: " + next + ". previous: " + previous + ".")
        } else { // if 'previous' _is_ null, 'current' must have been the first element ('head'). so set a new 'head'.
            this.head = next
        }
        if (next !== null) { // if 'next' is null, don't bother changing any of its pointers!
            next.previous = previous
        }
        // disconnext 'current' from the list completely, just for fun / safety
        current.next = null
        current.previous = null
        this.size -= 1
        return current
    }

    // remove the _first_ node that appears in the list with the given label.
    // meaning, if there are multiple nodes in the list with the same label,
    // on the first one of those will be removed by this method!
    removeNode(label) {
        let removeAtIndex = this.getIndexOfLabel(label)
        return this.removeNodeAtIndex(removeAtIndex)
    }
}

function assertEquals(expected, actual, message) {
    if (expected !== actual){
        throw "assertion failed: '" + message + "'. expected: '" + expected + "'; actual '" + actual + "'"
    }
}

// test 'insertNodeAtIndex' and 'getIndexOfPriority' methods (for now just verify results manually in console..)
function testInsertNodeAtIndex() {
    let list = new PriorityLinkedList()
    assertEquals(0, list.getSize(), "assert empty list size is 0")
    let firstInsertedNode = new PriorityLinkedListNode("3", 3)
    list.insertNodeAtIndex(firstInsertedNode, 0)
    assertEquals(1, list.getSize(), "assert list size is as expected")
    let secondInsertedNode = new PriorityLinkedListNode("5", 5)
    list.insertNodeAtIndex(secondInsertedNode, 1)
    assertEquals(2, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfPriority(2), "check index of priority on small list")
    assertEquals(0, list.getIndexOfPriority(3), "check index of priority on small list")
    assertEquals(1, list.getIndexOfPriority(4), "check index of priority on small list")
    let thirdInsertedNode = new PriorityLinkedListNode("1", 1)
    list.insertNodeAtIndex(thirdInsertedNode, 0)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    let fourthInsertedNode = new PriorityLinkedListNode("2", 2)
    list.insertNodeAtIndex(fourthInsertedNode, 1)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    let fifthInsertedNode = new PriorityLinkedListNode("4", 4)
    list.insertNodeAtIndex(fifthInsertedNode, 3)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    let sixthInsertedNode = new PriorityLinkedListNode("6", 6)
    list.insertNodeAtIndex(sixthInsertedNode, 5)
    assertEquals(6, list.getSize(), "assert list size is as expected")
    assertEquals(-1, list.getIndexOfLabel("0"), "assert label is found where expected")
    assertEquals(0, list.getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list.getIndexOfLabel("6"), "assert label is found where expected")
    assertEquals(-1, list.getIndexOfLabel("7"), "assert label is found where expected")
    assertEquals(6, list.getSize(), "check list size after inserting all nodes")
    assertEquals(0, list.getIndexOfPriority(0), "check index of priority on full list")
    assertEquals(0, list.getIndexOfPriority(1), "check index of priority on full list")
    assertEquals(1, list.getIndexOfPriority(2), "check index of priority on full list")
    assertEquals(2, list.getIndexOfPriority(3), "check index of priority on full list")
    assertEquals(3, list.getIndexOfPriority(4), "check index of priority on full list")
    assertEquals(4, list.getIndexOfPriority(5), "check index of priority on full list")
    assertEquals(5, list.getIndexOfPriority(6), "check index of priority on full list")
    assertEquals(6, list.getIndexOfPriority(7), "check index of priority on full list")
}

function testInsertNodeWithPriority() {
    // insert items and check list size as we go
    let list = new PriorityLinkedList()
    assertEquals(0, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfPriority(3), "check index of priority of first element that we are about to insert")
    let firstInsertedNode = new PriorityLinkedListNode("3", 3)
    list.insertNode(firstInsertedNode)
    assertEquals(1, list.getSize(), "assert list size is as expected")
    let secondInsertedNode = new PriorityLinkedListNode("5", 5)
    list.insertNode(secondInsertedNode)
    assertEquals(2, list.getSize(), "assert list size is as expected")
    let thirdInsertedNode = new PriorityLinkedListNode("1", 1)
    list.insertNode(thirdInsertedNode)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    let fourthInsertedNode = new PriorityLinkedListNode("2", 2)
    list.insertNode(fourthInsertedNode)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    let fifthInsertedNode = new PriorityLinkedListNode("4", 4)
    list.insertNode(fifthInsertedNode)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    let sixthInsertedNode = new PriorityLinkedListNode("6", 6)
    list.insertNode(sixthInsertedNode)
    assertEquals(6, list.getSize(), "assert list size is as expected")
    // check final list order (check labels only)
    assertEquals(0, list.getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list.getIndexOfLabel("6"), "assert label is found where expected")
    // test that all .next and .previous are right
    // console.log("checking that all .next and .previous are right. current list order is: " + list)
    // check element 1 (head)
    let current = list.head
    assertEquals("1", current.label, "assert head label is right")
    assertEquals(null, current.previous, "assert head.previous is right")
    assertEquals("2", current.next.label, "assert head.next is right")
    // check element 2
    current = current.next
    assertEquals("2", current.label, "assert label is right")
    assertEquals("1", current.previous.label, "assert .previous is right")
    assertEquals("3", current.next.label, "assert .next is right")
    // check element 3
    current = current.next
    assertEquals("3", current.label, "assert label is right")
    assertEquals("2", current.previous.label, "assert .previous is right")
    assertEquals("4", current.next.label, "assert .next is right")
    // check element 4
    current = current.next
    assertEquals("4", current.label, "assert label is right")
    assertEquals("3", current.previous.label, "assert .previous is right")
    assertEquals("5", current.next.label, "assert .next is right")
    // check element 5
    current = current.next
    assertEquals("5", current.label, "assert label is right")
    assertEquals("4", current.previous.label, "assert .previous is right")
    assertEquals("6", current.next.label, "assert .next is right")
    // check element 6
    current = current.next
    assertEquals("6", current.label, "assert label is right")
    assertEquals("5", current.previous.label, "assert .previous is right")
    assertEquals(null, current.next, "assert .next is right")
    // todo: test inserting multiple nodes with the same priority
    
}

function testRemoveNode() {
    let list = new PriorityLinkedList()
    let node1 = new PriorityLinkedListNode("3", 3)
    let node2 = new PriorityLinkedListNode("5", 5)
    let node3 = new PriorityLinkedListNode("1", 1)
    let node4 = new PriorityLinkedListNode("2", 2)
    let node5 = new PriorityLinkedListNode("4", 4)
    let node6 = new PriorityLinkedListNode("6", 6)
    list.insertNode(node1)
    list.insertNode(node2)
    list.insertNode(node3)
    list.insertNode(node4)
    list.insertNode(node5)
    list.insertNode(node6)
    assertEquals(6, list.getSize(), "assert list size is as expected")
    // check final list order (check labels only)
    assertEquals(0, list.getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list.getIndexOfLabel("6"), "assert label is found where expected")
    // console.log("starting list: " + list)
    // remove first element
    list.removeNode("1")
    // console.log("after removing first element: " + list)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(3, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(4, list.getIndexOfLabel("6"), "assert label is found where expected")
    // remove last element
    list.removeNode("6")
    // console.log("after removing last element: " + list)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(3, list.getIndexOfLabel("5"), "assert label is found where expected")
    // remove a middle element
    list.removeNode("3")
    // console.log("after removing middle element (labelled '3'): " + list)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("5"), "assert label is found where expected")
    // add a double element and test that the first occurrence of it is removed
    let node7 = new PriorityLinkedListNode("4", 6)
    let node8 = new PriorityLinkedListNode("4", 8)
    list.insertNode(node7)
    list.insertNode(node8)
    // console.log("after inserting some duplicalte-label elements (labelled '4'): " + list)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("5"), "assert label is found where expected")
    // remove first '4'
    list.removeNode("4")
    // console.log("after removing first duplicate-label '4': " + list)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("4"), "assert label is found where expected")
    // remove second '4'
    list.removeNode("4")
    // console.log("after removing second duplicate-label '4': " + list)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(2, list.getIndexOfLabel("4"), "assert label is found where expected")
    // remove last '4'
    list.removeNode("4")
    // console.log("after removing second duplicate-label '4': " + list)
    assertEquals(2, list.getSize(), "assert list size is as expected")
    assertEquals(0, list.getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list.getIndexOfLabel("5"), "assert label is found where expected")
    // todo: test that .next and .previous are correct in all of these cases
}

// 'insert' method tests
testInsertNodeAtIndex()
testInsertNodeWithPriority()
// 'remove' method tests
testRemoveNode()

// generate a unique id number.
// just increments a counter by 1 and returns the counter value each time you ask for a new id.
class IdGenerator {
    constructor() {
        this.idCounter = 0
    }

    getNextId() {
        let id = this.idCounter
        this.idCounter += 1
        // console.log("returning generated ID: " + id)
        return id
    }
}

class Sample {
    constructor(file, color) {
        this.file = file
        this.color = color
    }
}

class SampleBank {
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
    }
}

/**
 * End of linked list implementation
 * 
 * Start of drum machine backend implementation
 */

window.onload = () => {

    // Initialize Two.js
    let elem = document.getElementById('draw-shapes');
    let two = new Two({
        width: 500,
        height: 500,
        fullscreen: true,
        type: Two.Types.svg
    }).appendTo(elem);

    // load all sound samples
    const SOUND_FILES_PATH = './sounds/';
    const BASS_DRUM = "bass-drum";
    const HI_HAT_HIGH = 'hi-hat-high';
    const HI_HAT_LOW = 'hi-hat-low';
    const SNARE = 'snare';
    const WAV_EXTENSION = '.wav';
    let samples = {}
    samples[HI_HAT_HIGH] = new Sample(loadSample(HI_HAT_HIGH, SOUND_FILES_PATH + HI_HAT_HIGH + WAV_EXTENSION), '#b58f04')
    samples[HI_HAT_LOW] = new Sample(loadSample(HI_HAT_LOW, SOUND_FILES_PATH + HI_HAT_LOW + WAV_EXTENSION), '#bf3d5e')
    samples[SNARE] = new Sample(loadSample(SNARE, SOUND_FILES_PATH + SNARE + WAV_EXTENSION), '#0e6e21')
    samples[BASS_DRUM] = new Sample(loadSample(BASS_DRUM, SOUND_FILES_PATH + BASS_DRUM + WAV_EXTENSION), '#1b617a')

    let idGenerator = new IdGenerator()
    let sampleNameList = [HI_HAT_HIGH, HI_HAT_LOW, SNARE, BASS_DRUM]
    let sampleBank = new SampleBank(idGenerator, sampleNameList)

    // initialize web audio context
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = new AudioContext();

    // Shim the requestAnimationFrame API, with a setTimeout fallback
    window.requestAnimationFrameShim = (function(){
        return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
    })();

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
     * Drum machine configurations
     */
    let loopLengthInMillis = 1200; // length of the whole drum sequence (loop), in millliseconds
    const LOOK_AHEAD_MILLIS = 20; // number of milliseconds to look ahead when scheduling notes to play

    let sequencer = new Sequencer(4, loopLengthInMillis)
    let sequencerRowLines = []
    let drumTriggerLines = []

    /**
     * Draw sequencer rows
     */
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

    /**
     * Draw sequencer drum triggers (the things that move as time goes on to show where we are in the loop)
     */
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

    /**
     * Draw note bank
     */
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

    /**
     * Draw note trash bin
     */
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
    setNoteTrashBinVisibility(false)

    two.update(); // this initial 'update' creates SVG '_renderer' properties for our shapes that we can add action listeners to, so it needs to go here

    let audioContextStarted = false

    let circleBeingMoved = null
    let circleBeingMovedStartingPositionX = null
    let circleBeingMovedStartingPositionY = null
    let circleBeingMovedOldRow = null
    let circleBeingMovedNewRow = null

    window.onclick = () => {
        if (!audioContextStarted) {
            // console.log("Starting ('resuming') audio context..")
            audioContext.resume()
            audioContextStarted = true
        }
    }

    // set up a test sequence with some notes in it
    sequencer.rows[0].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), 0, 
        {
            lastScheduledOnIteration: -1,
            // frequency: 880,
            sampleName: HI_HAT_HIGH,
        }
    ))
    sequencer.rows[1].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 1, 
        {
            lastScheduledOnIteration: -1,
            // frequency: 880,
            sampleName: HI_HAT_LOW,
        }
    ))
    sequencer.rows[2].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), ((loopLengthInMillis / 4) * 2), 
        {
            lastScheduledOnIteration: -1,
            // frequency: 880,
            sampleName: SNARE,
        }
    ))
    sequencer.rows[3].notesList.insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (loopLengthInMillis / 4) * 3, 
        {
            lastScheduledOnIteration: -1,
            // frequency: 880,
            sampleName: BASS_DRUM
        }
    ))

    let allDrawnCircles = []

    // lifting your mouse anywhere means you're no longer click-dragging
    window.addEventListener('mouseup', (event) => {
        if (circleBeingMoved !== null) {
            /** 
             * need to impement logic here that will determine if the current mouse position is within n pixels of any of our sequencer lines,
             * and if it is within n pixels of one, which one? then remove the circle that is being moved from the row it started on, and add
             * it to the row it is being moved to (the one it is within n pixels of). 
             *
             * also though to be fair, maybe eventually we should have some of that logic be used in mousemove events, and remove / add notes
             * from / to lists while they are still being moved, not just after they get placed. that will probably be a problem for later though.
             */ 
            // if the circle is _not_ being placed in an acceptable new position, put it back to where it came from.
            circleBeingMovedOldRow = circleBeingMoved.guiData.row
            circleBeingMovedNewRow = circleBeingMovedOldRow
            circleNewXPosition = circleBeingMovedStartingPositionX
            circleNewYPosition = circleBeingMovedStartingPositionY
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            placementPadding = 10 // give a little leeway so we don't have to place it _precisely_ on the line. give this many pixels of padding on either side.
            // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
            let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= noteTrashBinHorizontalOffset - placementPadding) && (mouseX <= noteTrashBinHorizontalOffset + noteTrashBinWidth + placementPadding)
            let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= noteTrashBinVerticalOffset - placementPadding) && (mouseY <= noteTrashBinVerticalOffset + noteTrashBinHeight + placementPadding)
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                if (circleBeingMoved.guiData.row >= 0) {
                    // console.log("toss it! throwing note in the trash: " + circleBeingMoved.guiData.label + ", from row: " + circleBeingMoved.guiData.row + ".")
                    circleBeingMoved.remove()
                    removeCircleFromAllDrawnCirclesList(circleBeingMoved.guiData.label)
                    circleBeingMovedNewRow = -3 // placeholder row number, which for now means "put it in the trash"
                    /**
                     * the thing that happens here to delete a note is a bit counter-intuitive..
                     * for a note to make into this inner if statement, it must have come from a
                     * real sequencer row (not the note bank). this means that during our other
                     * logic checks below, we will determine that the note needs to be removed
                     * from whichever row it is currently in, so that it can then be placed into
                     * its new row. BUT, by setting its new row to a negative number, we tell the
                     * logic checks below to also not add it to a new row... this is the same case
                     * we hit when a note taken from the soundbank is not successfully placed onto
                     * an actual row. basically it will just get placed back to its starting position.
                     * BUT, since we are also 'remove()'ing the circle from the renderer above, it will
                     * not show up in its old position. then, we remove the deleted circle from the 
                     * 'allDrawnCircles' list, and set 'circleBeingDrawn' to null at the end of this method
                     * like we always do, and that gets rid of the last pointer to the deleted node,
                     * then it gets garbage collected? need to double check about the garbage collection
                     * to make sure the deleted node isn't being referenced anywhere else.
                     * maybe this whole method needs a refactor.
                     */
                } // else do nothing.. it will just be returned back to the note bank on its own
            }
            // check if the note is being placed onto a sequencer row. if so, determine which, set everything up, etc.
            let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerHorizontalOffset - placementPadding) && (mouseX <= (sequencerHorizontalOffset + sequencerWidth) + placementPadding)
            let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerVerticalOffset - placementPadding) && (mouseY <= sequencerVerticalOffset + ((sequencer.numberOfRows - 1) * spaceBetweenSequencerRows) + placementPadding)
            if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                // if the circle is being placed in an acceptable new position, apply the position change.
                // if we get here, we know the circle is being placed within the vertical and horizontal boundaries of the sequencer.
                // next we want to do a more fine-grained calculation, for whether it is close to one of the sequencer lines.
                // console.log("the circle was placed within the vertical and horizonal boundaries of the sequencer")
                for(let rowIndex = 0; rowIndex < sequencer.numberOfRows; rowIndex++) {
                    // console.log("checking if the circle is being placed on row: " + rowIndex)
                    rowActualVerticalLocation = sequencerVerticalOffset + (rowIndex * spaceBetweenSequencerRows)
                    rowActualLeftBound = sequencerHorizontalOffset
                    rowActualRightBound = sequencerHorizontalOffset + sequencerWidth
                    rowTopLimit = rowActualVerticalLocation - placementPadding
                    rowBottomLimit = rowActualVerticalLocation + placementPadding
                    rowLeftLimit = rowActualLeftBound - placementPadding
                    rowRightLimit = rowActualRightBound + placementPadding
                    if (mouseX >= rowLeftLimit && mouseX <= rowRightLimit && mouseY >= rowTopLimit && mouseY <= rowBottomLimit) {
                        // console.log("would place on row: " + rowIndex)
                        // correct the padding so the circle falls precisely on an actual sequencer line
                        if (mouseX < rowActualLeftBound) { // snap to left side
                            circleNewXPosition = rowActualLeftBound
                            // console.log("new x positon is out of bounds. row actual left bound: " + rowActualLeftBound + ". circle new x: " + circleNewXPosition + ". mouseX: " + mouseX + ".")
                        } else if (mouseX > rowActualRightBound) { // snap to right side
                            circleNewXPosition = rowActualRightBound
                            // console.log("new x positon is out of bounds. row actual right bound: " + rowActualRightBound + ". circle new x: " + circleNewXPosition + ". mouseX: " + mouseX + ".")
                        } else {
                            circleNewXPosition = mouseX
                            // console.log("new x position is in bounds.")
                        }
                        // snap down from top or up from bottom
                        if (mouseY !== rowActualVerticalLocation) {
                            circleNewYPosition = rowActualVerticalLocation
                        } else {
                            circleNewYPosition = mouseY
                        }
                        circleBeingMovedNewRow = rowIndex
                        break; // we found the row that the note will be placed on, so stop iterating throws rows early
                    }
                }
            }
            // console.log("setting position of circle that was being moved. new x: " + circleNewXPosition + ". new y: " + circleNewYPosition)
            circleBeingMoved.translation.x = circleNewXPosition
            circleBeingMoved.translation.y = circleNewYPosition
            circleBeingMoved.guiData.row = circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: change this logic to just update node's priority if it isn't switching rows.
            if (circleBeingMovedOldRow < 0) { // -2 is the 'row' given to notes that are in the note bank! treat them differently than notes that were in a real row
                /**
                 * need a way to determine which sample this note should have.
                 * maybe we can have a linked list that represents the note bank, and have its nodes already instantiated?
                 * then if we pull off a note with row -1, we could add back a note with
                 * the same attributes but a new (incremented) label.
                 */
                node = sampleBank.createNewNodeForSample(circleBeingMoved.guiData.sampleName)
                circleBeingMoved.guiData.label = node.label
            } else {
                // console.log("remove node from row: " + circleBeingMovedOldRow + " with label: " + circleBeingMoved.guiData.label + ".")
                node = sequencer.rows[circleBeingMovedOldRow].notesList.removeNode(circleBeingMoved.guiData.label)
                // console.log("removed node after moving circle: " + node)
            }
            if (circleBeingMovedNewRow >= 0) {
                // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                let newNodeTimestampMillis = loopLengthInMillis * ((circleNewXPosition - sequencerHorizontalOffset) / sequencerWidth)
                // console.log("New timestamp for node that was moved: " + newNodeTimestampMillis)
                node.priority = newNodeTimestampMillis
                // add the moved note to its new sequencer row
                // console.log("insert node into row: " + circleBeingMovedNewRow + " with label: " + circleBeingMoved.guiData.label + ".")
                sequencer.rows[circleBeingMovedNewRow].notesList.insertNode(node, circleBeingMoved.guiData.label)
                if (circleBeingMovedOldRow < 0) { // if the note was taken from the sound bank, refill the sound bank
                    drawNoteBankCircleForSample(circleBeingMoved.guiData.sampleName)
                }
            } // else the new row is < 0, i.e. the note was not successfully moved out of the sound bank, or it is being deleted, so don't add it to any new row
        }
        circleBeingMoved = null
        setNoteTrashBinVisibility(false)
    });

    // lifting your mouse anywhere means you're no longer click-dragging
    window.addEventListener('mousemove', (event) => {
        if (circleBeingMoved !== null) {
            adjustEventCoordinates(event)
            mouseX = event.pageX
            mouseY = event.pageY
            circleBeingMoved.translation.x = mouseX
            circleBeingMoved.translation.y = mouseY
        }
    });

    // draw note bank notes
    for (noteBankSampleName of sampleNameList) {
        drawNoteBankCircleForSample(noteBankSampleName)
    }

    // remove a circle from the 'allDrawnCircles' list, based on its label.
    // this is meant to be used during deletion of notes from the sequencer, with the idea being that deleting
    // them from this list and maybe from a few other places will clear up clutter, and hopefully allow the 
    // deleted circles to get garbage collected.
    function removeCircleFromAllDrawnCirclesList(label){
        let indexOfListItemToRemove = allDrawnCircles.findIndex(elementFromList => elementFromList.guiData.label === label);
        if (indexOfListItemToRemove === -1) { //  we don't expect to reach this case, where a circle with the given label isn't found in the list
            throw "unexpected problem: couldn't find the circle with the given label in the list of all drawn circles, when trying to delete it. the given label was: " + label + ". full list (labels only) (sorry for printing annoying thing): " + allDrawnCircles.map((item) => item.guiData.label) + "."
        }
        allDrawnCircles.splice(indexOfListItemToRemove, 1) // this should go in and delete the element we want to delete!
    }

    // create a circle in the note bank for the sample with the given name.
    // this method figures out where in the note bank the circle should go, what color it gets, etc. based on
    // the sample name, which it maps to relevant info using constants defined elsewhere in the code.
    function drawNoteBankCircleForSample(sampleName) {
        // figure out which index in the 'sampleNameList' the given sample name is. this will be used to determine physical positioning of the circle within the sample bank
        let indexOfSampleInNoteBank = sampleNameList.findIndex(elementFromList => elementFromList === sampleName);
        if (indexOfSampleInNoteBank === -1) { // we don't expect to reach this case, where the given sample isn't found in the sample names list
            throw "unexpected problem: couldn't find the given sample in the sample list when trying to add it to the note bank. was looking for sample name: " + sampleName + ". expected sample name to be one of: " + sampleNameList + "."
        }
        let circle = two.makeCircle(noteBankHorizontalOffset + noteBankPadding + (unplayedCircleRadius / 2), noteBankVerticalOffset + noteBankPadding + (indexOfSampleInNoteBank * unplayedCircleRadius) + (indexOfSampleInNoteBank * spaceBetweenNoteBankNotes), unplayedCircleRadius)
        circle.fill = samples[sampleName].color
        circle.stroke = 'transparent'
        two.update()
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
            // console.log("original position of the circle bing moved: " + circleBeingMovedStartingPositionX + ", " + circleBeingMovedStartingPositionY)
            setNoteTrashBinVisibility(true)
            playNote(circleBeingMoved.guiData.sampleName)
        });
        circle.guiData = {}
        circle.guiData.sampleName = sampleName
        circle.guiData.row = -2 // circle is not in a row yet, use -2 as a placeholder
        circle.guiData.label = (indexOfSampleInNoteBank + 1) * -1 // this is a placeholder value so the notes have _some_ unique label before the real one is generated. I added 1 so that these labels start at -1 instead of at 0
        // console.log("creating preset circle: row: " + circle.guiData.row + ". label: " + circle.guiData.label + ".")
        allDrawnCircles.push(circle)
    }

    // draw all notes that are in the sequencer before the sequencer starts (aka draw notes in the default/test pattern)
    let sequencerRowIndex = 0
    while (sequencerRowIndex < sequencer.numberOfRows) {
        noteToDraw = sequencer.rows[sequencerRowIndex].notesList.head
        while (noteToDraw !== null) {
            let circle = two.makeCircle(sequencerHorizontalOffset + (sequencerWidth * (noteToDraw.priority / sequencer.loopLengthInMillis)), sequencerVerticalOffset + (sequencerRowIndex * spaceBetweenSequencerRows), unplayedCircleRadius)
            circle.fill = samples[noteToDraw.data.sampleName].color
            // console.log("sample name for preset note: " + noteToDraw.data.sampleName + ". color for preset note: " + samples[noteToDraw.data.sampleName].color + ".")
            circle.stroke = 'transparent' // 'black'
            two.update()
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
                // console.log("original position of the circle bing moved: " + circleBeingMovedStartingPositionX + ", " + circleBeingMovedStartingPositionY)
                setNoteTrashBinVisibility(true)
                playNote(circle.guiData.sampleName)
            });
            circle.guiData = {}
            circle.guiData.label = noteToDraw.label
            circle.guiData.row = sequencerRowIndex
            circle.guiData.sampleName = noteToDraw.data.sampleName
            // console.log("creating preset circle: row: " + circle.guiData.row + ". label: " + circle.guiData.label + ".")
            allDrawnCircles.push(circle)
            noteToDraw = noteToDraw.next
        }
        sequencerRowIndex += 1
    }

    requestAnimationFrameShim(draw)

    // get the 'head' of each notes list (one for each row) and store them in a list so we can keep accessing them easily
    let nextNoteToScheduleForEachRow = []
    for (let nextNotesInitializedSoFarCount = 0; nextNotesInitializedSoFarCount < sequencer.numberOfRows; nextNotesInitializedSoFarCount++) {
        nextNoteToScheduleForEachRow.push(sequencer.rows[nextNotesInitializedSoFarCount].notesList.head)
    }

    function draw() {
        // let currentTime = audioContext.currentTime * 1000;
        // console.log("" + audioContext.currentTime * 1000)

        // todo: need to handle a weird case: if the next scheduled note gets deleted, what do we do? :|
        // hm maybe we can mark deleted nodes as deleted, then if a node is deleted at this point,
        // we can just call getNodeWithPriority for the current time, then get that node instead? makes sense to me

        // let currentTimeWithinCurrentLoop = currentTime % loopLengthInMillis

        drumTriggersXPosition = sequencerHorizontalOffset + (sequencerWidth * ((audioContext.currentTime * 1000 % loopLengthInMillis) / loopLengthInMillis))

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

        /**
         * there's currently a bad bug, where putting a note at the front of a sequence causes all other notes not to play.
         * no clue why, need to figure it out.
         */

        // iterate through each sequencer, scheduling upcoming notes for all of them
        for (let sequencerRowIndex = 0; sequencerRowIndex < sequencer.numberOfRows; sequencerRowIndex++) {
            if (nextNoteToScheduleForEachRow[sequencerRowIndex] === null) {
                // if nextNoteToSchedule is null, the list was empty at some point, so keep polling for a note to be added to it.
                // or we reached the last note, which is fine, just go back to the beginning of the sequence
                nextNoteToScheduleForEachRow[sequencerRowIndex] = sequencer.rows[sequencerRowIndex].notesList.head
            }

            if (nextNoteToScheduleForEachRow[sequencerRowIndex] !== null) { // still will be null if note list is still empty
                nextNoteToScheduleForEachRow[sequencerRowIndex] = scheduleNotes(nextNoteToScheduleForEachRow[sequencerRowIndex], sequencerRowIndex, audioContext.currentTime * 1000)
            }
        }

        two.update()
        requestAnimationFrameShim(draw);
    }

    function setNoteTrashBinVisibility(visible) {
        if (visible) {
            // console.log("showing note trash bin")
            noteTrashBinContainer.stroke = trashBinColor
        } else {
            // console.log("hiding note trash bin")
            noteTrashBinContainer.stroke = 'transparent'
        }
    }

    function scheduleNotes(nextNoteToSchedule, sequencerRowIndex, currentTime) {
        let currentTimeWithinCurrentLoop = currentTime % loopLengthInMillis
        // console.log("ct: " + currentTime + " ctwcl: " + currentTimeWithinCurrentLoop + " llim: " + loopLengthInMillis + ".")
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
            // console.log("schedule end. next note to schedule priority: " + nextNoteToSchedule.priority + ". current time within current loop: " + currentTimeWithinCurrentLoop + ". end time of notes to schedule: " + endTimeOfNotesToSchedule + ". note was last scheduled on iteration: " + nextNoteToSchedule.data.lastScheduledOnIteration + ". current iteration is: " + numberOfLoopsSoFar + ".")
            /**
             * todo: this top scheduler is the one with the bug where placing a note at the beginning of a row causes it to play right away. fix that.
             * ok I think I fixed that bug, I think it was that there was no start limit on the time window in the above 'if' statement, only an end limit,
             * so all old not-scheduled-yet notes were being scheduled as well, or something like that. i added a front limit to the check, then notes started
             * getting dropped (they wouldn't be scheduled..). I figured this was due to the time window being too short, so it passes before we can get to a
             * note to schedule it, or something like, so I raised the look-ahead time window length. that seems to have fixed the issue but i'll keep an eye
             * on it. it seems some notes can still get dropped when the drum machine window is minized and you are doing other things.
             * okay so this bug wasn't fixed. and it seems to be fixed now. i made a bunch of changes to try to fix it, but the version of the code i was using
             * seems to have been cached by the browser, so when i was testing the different fixes, none of them worked, but then when i cleared the cache, as
             * far as i can tell, the bug was fixed.. so i can't currently reproduce it, but i also am not sure what change actually fixed it.. so for now
             * i'll keep an eye out for if it happens again, but the bug seems to be fixed.. i wish i knew which change fixed it though lol. whatever. 
             * i guess i just have to get over it.
             */
            // console.log("iterating over node (end): " + nextNoteToSchedule)
            if (numberOfLoopsSoFar > nextNoteToSchedule.data.lastScheduledOnIteration) {
                scheduleNote(actualStartTimeOfCurrentLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
            }
            nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar // record the last iteration that the note was played on to avoid duplicate scheduling within the same iteration
            nextNoteToSchedule = nextNoteToSchedule.next
        }

        // this will be the second part: if the look-ahead window went past the end of the loop, schedule notes from the beginning
        // of the loop to the end of leftover look-ahead window time.
        let endTimeToScheduleUpToFromBeginningOfLoop = endTimeOfNotesToSchedule - loopLengthInMillis // calulate leftover time to schedule for from beginning of loop, e.g. from 0 to 7 millis from above example
        let actualStartTimeOfNextLoop = actualStartTimeOfCurrentLoop + loopLengthInMillis
        if (endTimeToScheduleUpToFromBeginningOfLoop >= 0) {
            // console.log("" + endTimeToScheduleUpToFromBeginningOfLoop)
            //console.log("dealing with a look-ahead window that wraps around to the beginning of the loop now..")
            nextNoteToSchedule = sequencer.rows[sequencerRowIndex].notesList.head
            while (nextNoteToSchedule !== null && nextNoteToSchedule.priority <= endTimeToScheduleUpToFromBeginningOfLoop) {
                // keep iterating through notes and scheduling them as long as they are within the timeframe to schedule notes for
                // console.log("schedule beginning. next note to schedule priority: " + nextNoteToSchedule.priority + ". current time within current loop: " + currentTimeWithinCurrentLoop + ". end time of notes to schedule: " + endTimeOfNotesToSchedule + ". note was last scheduled on iteration: " + nextNoteToSchedule.data.lastScheduledOnIteration + ". current iteration is: " + numberOfLoopsSoFar + ".")
                // todo: determine whether this should be scheduled at current loop start time or next loop start time..
                // console.log("iterating over node (beginning): " + nextNoteToSchedule)
                if (numberOfLoopsSoFar + 1 > nextNoteToSchedule.data.lastScheduledOnIteration) {
                    scheduleNote(actualStartTimeOfNextLoop + nextNoteToSchedule.priority, nextNoteToSchedule.data.sampleName)
                }
                nextNoteToSchedule.data.lastScheduledOnIteration = numberOfLoopsSoFar + 1
                nextNoteToSchedule = nextNoteToSchedule.next
            }
        }
        // console.log("new next note to schedule: " + nextNoteToSchedule + ". time in current loop: " + currentTimeWithinCurrentLoop)
        return nextNoteToSchedule
    }

    function scheduleNote(startTime, sampleName){
        // adjustedStartTime = (Math.floor(currentTime / loopLengthInMillis) * loopLengthInMillis) + note.priority
        // console.log("scheduling a note. start time: " + startTime)
        // scheduleOscillatorNote(frequency, startTime / 1000, .075)
        scheduleSound(samples[sampleName].file, startTime / 1000, .5)
    }

    // schedule an oscillator note to play at the specified time
    function scheduleOscillatorNote(frequency, time, noteLength, gain=1) {
        let oscillator = audioContext.createOscillator();
            
        // set gain (volume). 1 is default, .1 is 10 percent
        gainNode = audioContext.createGain();
        gainNode.gain.value = gain;
        gainNode.connect(audioContext.destination);
        oscillator.connect(gainNode);
        
        oscillator.frequency.value = frequency;

        oscillator.start(time);
        oscillator.stop(time + noteLength);
    }

    // play the sample with the given name right away (don't worry about scheduling it for some time in the future)
    function playNote(sampleName) {
        playSound(samples[sampleName].file, .5)
    }

    function playSound(sample, gain=1, playbackRate=1) {
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

}