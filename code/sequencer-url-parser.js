const DELIMETER_BETWEEN_NODE_PROPERTIES = ","
const DELIMETER_BETTWEEN_NODES = ";"
const DELIMETER_BETWEEN_ROWS = "|"

/**
 * This class will be used for converting sequencer objects to and from strings.
 * The plan is to allow sequencer state / configuration to be saved and loaded
 * from a URL string, by converting the sequencer into a known format and setting
 * location.hash to the appropriate string in the url. that way you can load a
 * configuration by sending a link with that configuration specified in the URL.
 * the plan is also to have the URL automatically update as changes are made to
 * the sequencer. 
 * this can also eventually be used to implement a simple 'undo' button strategy,
 * since we will be able to quickly note down the full state of the drum machine.
 * we can keep a list of each unique state encountered, and revert to that state
 * as a way of 'undo'ing. that can be done later though once basic URL save and
 * load logic works.
 * 
 * note also that this isn't just json format because it is meant to be the 
 * smallest number of characters possible, since it will be part of a URL. 
 * this requirement might change later, at which point some sort of json 
 * might be used instead.
 * 
 * this class is unfinished and not used anywhere yet.
 */
class SequencerUrlParser {
    /**
     * need to work out sequencer URL format.
     * 
     * 2100|5,4;6,2;7,3;|100,400,500;300,220,340;
     */
    // convertUrlStringToSequencerObject(string, idGenerator) {}

    /**
     * LOAD SEQUENCER FROM URL
     */

    convertUrlStringToSequencerObject(string, sequencer, idGenerator) {
        throw "this method is unfinished";
        sequencer.clear();
        let rows = string.split(DELIMETER_BETWEEN_ROWS)
        let loopLengthInMillis = rows[0];
        sequencer.setLoopLengthInMillis(loopLengthInMillis)
        let allRowsInfo = rows[1].split(DELIMETER_BETTWEEN_NODES);
        sequencer.setNumberOfRows(allRowsInfo.length)
        for (let rowIndex = 0; rowIndex < allRowsInfo.length; rowIndex++) {
            rowInfo = allRowsInfo[rowIndex].split(DELIMETER_BETWEEN_NODE_PROPERTIES);
            sequencer.rows[rowIndex].setNumberOfSubdivisions(rowInfo[0])
            sequencer.rows[rowIndex].setNumberOfReferenceLines(rowInfo[1])
            let quantized = rowInfo[2] === "1" // this value in the row info will be '1' if the row should be quantized, and '0' if not.
            sequencer.rows[rowIndex].setQuantization(quantized)
        }
        // TO DO: got interrupted here, need to continue by parsing the individual notes from each row.
    }

    /**
     * SAVE SEQUENCER TO URL
     */

    /**
     * Convert the given sequencer object into a URL srting
     */
    convertSequencerObjectToUrlString(sequencer) {
        let string = ""
        string += this._getUrlStringHeaderForSequencer(sequencer);
        for (let row of sequencer.rows) {
            string += this._convertSequencerRowToUrlString(row)
        }
        return string
    }

    /**
     * Return the URL string header for the given sequencer object
     */
    _getUrlStringHeaderForSequencer(sequencer) {
        let string = ""
        string += "" + sequencer.loopLengthInMillis
        string += DELIMETER_BETWEEN_ROWS
        for (let row of sequencer.rows) {
            string += "" + row.getNumberOfSubdivisions();
            string += DELIMETER_BETWEEN_NODE_PROPERTIES
            string += "" + row.getNumberOfReferenceLines();
            string += DELIMETER_BETWEEN_NODE_PROPERTIES
            let quantized = 0 // variable to indicate if the row is quantized. if yes, the value will be 1, else it will be 0.
            if (row.quantized) {
                quantized = 1;
            }
            string += "" + quantized;
            string += DELIMETER_BETTWEEN_NODES
        }
        string += DELIMETER_BETWEEN_ROWS
        return string
    }

    /**
     * convert a single sequencer row to a URL string.
     * things to store:
     *   - nodes (notes) in the row
     */
    _convertSequencerRowToUrlString(row) {
        let string = ""
        let node = row._notesList.head
        while (node) {
            string += "" + this._convertSequencerNodeToUrlString(node)
            string += DELIMETER_BETTWEEN_NODES
            node = node.next
        }
        string += DELIMETER_BETWEEN_ROWS
        return string
    }

    /**
     * convert a single sequencer node to a URL string.
     * things to store: 
     *   - priority
     *   - convenient data, such as beat number, index of the sound sample the note is for
     */
    _convertSequencerNodeToUrlString(node) {
        let string = ""
        string += "" + node.priority
        string += "" + DELIMETER_BETWEEN_NODE_PROPERTIES
        string += "" + node.data.beat
        // string += "" + DELIMETER_BETWEEN_NODE_PROPERTIES
        // string += "" + node.data.sampleIndex
        // to do: include sample identifier in stored node
        return string
    }

}