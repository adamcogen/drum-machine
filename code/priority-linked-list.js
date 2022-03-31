/**
 * This file contains the implementation and tests for the data structure that stores
 * all the notes of the drum sequencer.
 * 
 * how it works:
 * 
 * basically, this is a specialized data structure that will be used as the backend
 * for the drum sequencer. it is going to be a linked list, where you can insert or 
 * remove one node at a time, and the list will automatically maintain a sorted order.
 * I am calling it a 'priority linked list' for now for lack of a better name, but it
 * will probably end up being more specialized than that by the time it's done.
 * 
 * the list will be sorted based on the numerical value of each node's 'priority' property,
 * which will be set when node constructor is called (could also add an 'update and re-sort'
 * method at some point).
 * 
 * for now, the list allows for multiple nodes with the same priority. the newest node with
 * the same priority will appear before the older nodes with the same priority in the list
 * (i.e. when priorities are the same, nodes will be sorted from new to old).
 * 
 * each node will also have a 'label', which is what will be used for the 'remove' method:
 * you will remove a particular node by specifying the label of that node. multiple nodes
 * with the same label will be handled similar to multiple nodes with the same priority,
 * in that the most recently-added node with a given label is the one that will be removed
 * first. 
 * 
 * for the purposes of the drum machine, 'priority' values will be times in milliseconds,
 * so each linked list store a list of notes in a drum sequence, sorted by time.
 * each node's 'label' will map to a label given to a note on the GUI, so each GUI
 * note can be mapped to its representation in the data structure using its 'label'.
 * 
 * this data structure may also end up having some specialty methods useful for particular
 * features of the drum machine that are eventually added, such as the ability to shift
 * the priorities of all nodes by a certain number, splice the list in a certain way, etc.
 */

/**
 * Implement priority linked list 'node'.
 * Priority linked list will be made up of a bunch of these 'nodes', with each pointing to the next one 
 * in the list (and also pointing to the previous one in the list, which makes 'remove' operations easier).
 * see block comment above for info about 'priority' and 'label' attributes.
 * the 'data' attribute is just a hash that can store arbitrary information, 
 * to help make this data structure more flexible in its usefulness.
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

/**
 * Implement the priority linked list.
 * This basically stores the first 'node' in the list, called 'head',
 * keeps track of how many nodes are in the list (its 'size'), and
 * implements a few useful methods, such as 'insert' and 'remove'.
 */
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
    // nodes, rather than at the end, but that's an arbitrary choice. i.e. if priorities are the same, the 
    // nodes with same priorities will be sorted from newest to oldest in the list.
    _getIndexOfPriority(priority) {
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
    _insertNodeAtIndex(nodeToInsert, insertAtIndex) {
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
        let indexToInsertAt = this._getIndexOfPriority(nodeToInsert.priority)
        this._insertNodeAtIndex(nodeToInsert, indexToInsertAt)
    }

    // get the index of the _first_ node in the list has the given label.
    // if no node in the list has that label, return -1. 
    // this is intended to be used as a helper method that will be called before
    // 'removeNodeAtIndex', so that we can remove the _first_ node with a given label
    // from our list.
    _getIndexOfLabel(label) {
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
    // return the node that was removed, so that we can easily re-insert it or insert it into another list if we want to.
    _removeNodeAtIndex(removeAtIndex) {
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
    // only the first one of those will be removed by this method!
    removeNode(label) {
        let removeAtIndex = this._getIndexOfLabel(label)
        return this._removeNodeAtIndex(removeAtIndex)
    }
}

/**
 * Implement some basic unit test coverage for the priority linked list so we know it works
 */

// basic 'assert equals' method, which throws the given message if the two given values arent equal (===) to each other
function assertEquals(expected, actual, message) {
    if (expected !== actual){
        throw "assertion failed: '" + message + "'. expected: '" + expected + "'; actual '" + actual + "'"
    }
}

// test 'insertNodeAtIndex' and 'getIndexOfPriority' methods (for now just verify results manually in console..)
function _testInsertNodeAtIndex() {
    let list = new PriorityLinkedList()
    assertEquals(0, list.getSize(), "assert empty list size is 0")
    let firstInsertedNode = new PriorityLinkedListNode("3", 3)
    list._insertNodeAtIndex(firstInsertedNode, 0)
    assertEquals(1, list.getSize(), "assert list size is as expected")
    let secondInsertedNode = new PriorityLinkedListNode("5", 5)
    list._insertNodeAtIndex(secondInsertedNode, 1)
    assertEquals(2, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfPriority(2), "check index of priority on small list")
    assertEquals(0, list._getIndexOfPriority(3), "check index of priority on small list")
    assertEquals(1, list._getIndexOfPriority(4), "check index of priority on small list")
    let thirdInsertedNode = new PriorityLinkedListNode("1", 1)
    list._insertNodeAtIndex(thirdInsertedNode, 0)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    let fourthInsertedNode = new PriorityLinkedListNode("2", 2)
    list._insertNodeAtIndex(fourthInsertedNode, 1)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    let fifthInsertedNode = new PriorityLinkedListNode("4", 4)
    list._insertNodeAtIndex(fifthInsertedNode, 3)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    let sixthInsertedNode = new PriorityLinkedListNode("6", 6)
    list._insertNodeAtIndex(sixthInsertedNode, 5)
    assertEquals(6, list.getSize(), "assert list size is as expected")
    assertEquals(-1, list._getIndexOfLabel("0"), "assert label is found where expected")
    assertEquals(0, list._getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list._getIndexOfLabel("6"), "assert label is found where expected")
    assertEquals(-1, list._getIndexOfLabel("7"), "assert label is found where expected")
    assertEquals(6, list.getSize(), "check list size after inserting all nodes")
    assertEquals(0, list._getIndexOfPriority(0), "check index of priority on full list")
    assertEquals(0, list._getIndexOfPriority(1), "check index of priority on full list")
    assertEquals(1, list._getIndexOfPriority(2), "check index of priority on full list")
    assertEquals(2, list._getIndexOfPriority(3), "check index of priority on full list")
    assertEquals(3, list._getIndexOfPriority(4), "check index of priority on full list")
    assertEquals(4, list._getIndexOfPriority(5), "check index of priority on full list")
    assertEquals(5, list._getIndexOfPriority(6), "check index of priority on full list")
    assertEquals(6, list._getIndexOfPriority(7), "check index of priority on full list")
}

function _testInsertNodeWithPriority() {
    // insert items and check list size as we go
    let list = new PriorityLinkedList()
    assertEquals(0, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfPriority(3), "check index of priority of first element that we are about to insert")
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
    assertEquals(0, list._getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list._getIndexOfLabel("6"), "assert label is found where expected")
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

function _testRemoveNode() {
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
    assertEquals(0, list._getIndexOfLabel("1"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(3, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(4, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(5, list._getIndexOfLabel("6"), "assert label is found where expected")
    // console.log("starting list: " + list)
    // remove first element
    list.removeNode("1")
    // console.log("after removing first element: " + list)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(3, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(4, list._getIndexOfLabel("6"), "assert label is found where expected")
    // remove last element
    list.removeNode("6")
    // console.log("after removing last element: " + list)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("3"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(3, list._getIndexOfLabel("5"), "assert label is found where expected")
    // remove a middle element
    list.removeNode("3")
    // console.log("after removing middle element (labelled '3'): " + list)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("5"), "assert label is found where expected")
    // add a double element and test that the first occurrence of it is removed
    let node7 = new PriorityLinkedListNode("4", 6)
    let node8 = new PriorityLinkedListNode("4", 8)
    list.insertNode(node7)
    list.insertNode(node8)
    // console.log("after inserting some duplicalte-label elements (labelled '4'): " + list)
    assertEquals(5, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("4"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("5"), "assert label is found where expected")
    // remove first '4'
    list.removeNode("4")
    // console.log("after removing first duplicate-label '4': " + list)
    assertEquals(4, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("4"), "assert label is found where expected")
    // remove second '4'
    list.removeNode("4")
    // console.log("after removing second duplicate-label '4': " + list)
    assertEquals(3, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("5"), "assert label is found where expected")
    assertEquals(2, list._getIndexOfLabel("4"), "assert label is found where expected")
    // remove last '4'
    list.removeNode("4")
    // console.log("after removing second duplicate-label '4': " + list)
    assertEquals(2, list.getSize(), "assert list size is as expected")
    assertEquals(0, list._getIndexOfLabel("2"), "assert label is found where expected")
    assertEquals(1, list._getIndexOfLabel("5"), "assert label is found where expected")
    // todo: test that .next and .previous are correct in all of these cases
}

/**
 * Run priority linked list unit tests
 */

// 'insert' method tests
_testInsertNodeAtIndex()
_testInsertNodeWithPriority()
// 'remove' method tests
_testRemoveNode()