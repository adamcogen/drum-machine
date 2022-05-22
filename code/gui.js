/**
 * This will be a class for storing, managing, and updating
 * all GUI components and their event listeners, etc.
 * 
 * For now this class will just initialize the GUI configurations object.
 */
class DrumMachineGui {
    constructor(sequencer, two) {
        this.sequencer = sequencer
        this.two = two
        this.configurations = getGuiConfigurations()
        this.components = this.initializeGuiComponents();
        this.initializeComponentEventListeners();
        this.initializeWindowEventListeners();
    }
    
    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects)
    initializeGuiComponents() {
        let components = {};
        components.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        components.referenceLineLists = this.initializeAllReferenceLines() // list of lists, storing 'reference' lines for each sequencer row (one list of reference lines per row)
        components.sequencerRowLines = this.initializeAllSequencerRowLines() // list of sequencer row lines
        components.subdivisionLineLists = this.initializeAllSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
        return components;
    }

    initializeComponentEventListeners() {
        // do nothing yet
    }

    initializeWindowEventListeners() {
        // do nothing yet
    }

    /**
     * sequencer row selection rectangles
     */

    // if a row is selected, we draw a rectangle around it.
    // this will initialize them (one per row) and make them
    // transparent. we can make them visible once a row is selected.
    initializeSequencerRowSelectionRectangles() {
        let allRectangles = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let top = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.sequencerRowSelections.topPadding
            let left = this.configurations.sequencer.left + this.configurations.sequencerRowSelections.leftPadding
            let width = this.configurations.sequencer.width + this.configurations.sequencerRowSelections.width
            let height = this.configurations.sequencerRowSelections.height
            let rectangle = this.initializeRectangleShape(top, left, height, width);
            rectangle.stroke = 'transparent'
            allRectangles.push(rectangle)
        }
        return allRectangles;
    }

    /**
     * sequencer row reference lines
     */

    removeReferenceLinesForRow(rowIndex) {
        for (line of this.components.referenceLineLists[rowIndex]) {
            line.remove()
        }
        this.components.referenceLineLists[rowIndex] = []
    }

    initializeAllReferenceLines() {
        let allReferenceLineLists = []
        let referenceLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            referenceLinesForRow = this.initializeReferenceLinesForRow(rowsDrawn)
            allReferenceLineLists.push(referenceLinesForRow) // keep a list of all rows' reference line lists
        }
        return allReferenceLineLists
    }

    initializeReferenceLinesForRow(rowIndex) {
        let referenceLinesForRow = []
        if (this.sequencer.rows[rowIndex].getNumberOfReferenceLines() <= 0) {
            return [] // don't draw reference lines for this row if it has 0 or fewer
        }
        let xIncrementBetweenLines = this.configurations.sequencer.width / this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
        for (let linesDrawnForRow = 0; linesDrawnForRow < this.sequencer.rows[rowIndex].getNumberOfReferenceLines(); linesDrawnForRow++) {
            let referenceLine = this.two.makePath(
                [
                    new Two.Anchor(this.configurations.sequencer.left + (xIncrementBetweenLines * linesDrawnForRow), this.configurations.sequencer.top - 1 + (rowIndex * this.configurations.sequencer.spaceBetweenRows)),
                    new Two.Anchor(this.configurations.sequencer.left + (xIncrementBetweenLines * linesDrawnForRow), this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) - this.configurations.referenceLines.height),
                ], 
                false
            );
            referenceLine.linewidth = this.configurations.sequencer.lineWidth;
            referenceLine.stroke = this.configurations.referenceLines.color

            referenceLinesForRow.push(referenceLine) // keep a list of all reference lines for the current row
        }
        return referenceLinesForRow
    }

    /**
     * sequencer row lines
     */

    // draw lines for sequencer rows. return a list of the drawn lines. these will be Two.js 'path' objects.
    initializeAllSequencerRowLines() {
        let sequencerRowLines = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            let sequencerRowLine = this.initializeSequencerRowLine(rowsDrawn)
            sequencerRowLines.push(sequencerRowLine)
        }
        return sequencerRowLines
    }

    initializeSequencerRowLine(rowIndex) {
        let sequencerRowLine = this.two.makePath(
            [
                new Two.Anchor(this.configurations.sequencer.left, this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)),
                new Two.Anchor(this.configurations.sequencer.left + this.configurations.sequencer.width, this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)),
            ], 
            false
        );
        sequencerRowLine.linewidth = this.configurations.sequencer.lineWidth;
        sequencerRowLine.stroke = this.configurations.sequencer.color
        return sequencerRowLine
    }

    removeSequencerRowLine(rowIndex) {
        this.components.sequencerRowLines[rowIndex].remove();
        this.components.sequencerRowLines[rowIndex] = null;
    }

    /**
     * sequencer row subdivision lines
     */

    // add 'subdivision lines' to each sequencer row. these lines divide each row into the given number of evenly-sized sections.
    // in other words, if a row's 'subdivision count' is 5, that row will be divided into 5 even chunks (it will have 5 subdivision
    // lines). subdivision lines pretty much represent 'beats', so a line that is subdivided into 5 sections shows 5 beats.
    initializeAllSubdivisionLines() {
        let allSubdivisionLineLists = []
        let subdivisionLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            subdivisionLinesForRow = this.initializeSubdivisionLinesForRow(rowsDrawn)
            allSubdivisionLineLists.push(subdivisionLinesForRow) // keep a list of all rows' subdivision line lists
        }
        return allSubdivisionLineLists
    }

    // draw subdivision lines for a single sequencer row, with the given row index.
    // return a list of two.js 'path' objects representing each subdivision line for the sequncer row with the given index.
    initializeSubdivisionLinesForRow(rowIndex) {
        let subdivisionLinesForRow = []
        if (this.sequencer.rows[rowIndex].getNumberOfSubdivisions() <= 0) {
            return [] // don't draw subdivisions for this row if it has 0 or fewer subdivisions
        }
        let xIncrementBetweenSubdivisions = this.configurations.sequencer.width / this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
        for (let subdivisionsDrawnForRow = 0; subdivisionsDrawnForRow < this.sequencer.rows[rowIndex].getNumberOfSubdivisions(); subdivisionsDrawnForRow++) {
            let subdivisionLine = this.two.makePath(
                [
                    new Two.Anchor(this.configurations.sequencer.left + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), this.configurations.sequencer.top - 1 + (rowIndex * this.configurations.sequencer.spaceBetweenRows)),
                    new Two.Anchor(this.configurations.sequencer.left + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow), this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.subdivisionLines.height),
                ], 
                false
            );
            subdivisionLine.linewidth = this.configurations.sequencer.lineWidth;
            subdivisionLine.stroke = this.configurations.subdivisionLines.color

            subdivisionLinesForRow.push(subdivisionLine) // keep a list of all subdivision lines for the current row
        }
        return subdivisionLinesForRow
    }

    // given the index of a sequencer row, remove all subdivision lines from the display for that row.
    // the current intent of this is to delete them all so that they can be re-drawn afterwards (such as
    // when the number of subdivisions in a particular row is changed).
    removeSubdivisionLinesForRow(rowIndex) {
        for (line of this.components.subdivisionLineLists[rowIndex]) {
            line.remove()
        }
        this.components.subdivisionLineLists[rowIndex] = []
    }

    /**
     * general helper methods
     */

    initializeRectangleShape(top, left, height, width, radius=4) {
        // new button rectangle: make a rectangle with rounded corners
        button = this.two.makeRoundedRectangle(left + (width / 2), top + (height / 2), width, height, radius)
        button.linewidth = this.configurations.sequencer.lineWidth
        button.stroke = this.configurations.sequencer.color
        button.fill = 'transparent'
        return button
    }

}