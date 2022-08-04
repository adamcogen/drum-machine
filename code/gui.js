/**
 * This will be a class for storing, managing, and updating
 * all GUI components and their event listeners, etc.
 * 
 * For now this class will just initialize the GUI configurations object.
 */
class DrumMachineGui {
    // create constants that will be used to denote special sequencer 'row' numbers, to indicate special places notes can go on the GUI, such as the note bank or the trash bin
    static get NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW() { return -1 }
    static get NOTE_ROW_NUMBER_FOR_NOTE_BANK() { return -2 }
    static get NOTE_ROW_NUMBER_FOR_TRASH_BIN() { return -3 }

    constructor(sequencer, sampleNameList, samples, sampleBankNodeGenerator, hideIcons) {
        this.sequencer = sequencer
        this.two = this.initializeTwoJs(document.getElementById('draw-shapes')) // Initialize Two.js library
        this.sampleNameList = sampleNameList
        this.samples = samples;
        this.sampleBankNodeGenerator = sampleBankNodeGenerator;
        this.configurations = getGuiConfigurations(hideIcons)
        this.components = {
            shapes: {}, // this hash will contain all of the two.js shapes (either as shapes, lists of shapes, or lists of lists of shapes)
            domElements: {} // this hash will contain all of the HTML DOM elements (either as individual elements, lists of elements, or lists of lists of elements, etc.)
        }
        this.components.shapes = this.initializeGuiShapes();
        this.components.domElements = this.initializeDomElements();
        this.eventHandlerFunctions = {}; // make a hash to store references to event handler functions. that way we can remove them from the DOM elements they are attached to later

        // add more dom elements and do some additional setup of shapes and dom elements
        this.initializeTempoTextInputValuesAndStyles();
        this.setNoteTrashBinVisibility(false) // trash bin only gets shown when we're moving a note or a sequencer row, so make sure it starts out as not visible

        this.lastButtonClickTimeTrackers = this.initializeLastButtonClickTimeTrackers(); // a hash used keep track of the last time each button was clicked
        this.initializeComponentEventListeners();
        this.initializeWindowEventListeners();

        // create variables which will be used to track info about the note that is being clicked and dragged
        this.circleBeingMoved = null
        this.circleBeingMovedStartingPositionX = null
        this.circleBeingMovedStartingPositionY = null
        this.circleBeingMovedOldRow = null
        this.circleBeingMovedNewRow = null
        this.circleBeingMovedOldBeatNumber = null
        this.circleBeingMovedNewBeatNumber = null

        this.selectedRowIndex = null;
        this.rowSelecionTracker = {
            shapes: [],
            shapesOriginalPositions: [], // this is going to be such a weird way of doing this..
            rowHandleStartingPosition: {
                x: 0,
                y: 0,
            },
            domElements: [],
            domElementsOriginalPositions: [],
            removeRow: false,
        }

        // keep a list of all the circles (i.e. notes) that have been drawn on the screen
        this.allDrawnCircles = []

        this.initializeTempoTextInputActionListeners();
        this.addPauseButtonActionListeners();
        this.addRestartSequencerButtonActionListeners()

        // run any miscellaneous unit tests needed before starting main update loop
        this.testConfineNumberToBounds();

        this.pause(); // start the sequencer paused
    }

    // main GUI update logic.
    // a lot of the GUI code is event-driven, but there are also things that get updated
    // constantly within the main recursive loop of the drum machine, such as the time-
    // tracking lines. those and similarly time-based things will be updated here.
    update() {
        let timeTrackingLinesXPosition = this.configurations.sequencer.left + (this.configurations.sequencer.width * (this.sequencer.timekeeping.currentTimeWithinCurrentLoop / this.sequencer.loopLengthInMillis))

        for (let timeTrackingLine of this.components.shapes.timeTrackingLines) {
            timeTrackingLine.position.x = timeTrackingLinesXPosition
        }

        // make circles get bigger when they play.
        for (let circle of this.allDrawnCircles) {
            let radiusToSetUnplayedCircleTo = this.configurations.notes.unplayedCircleRadius
            if (this.circleBeingMoved !== null && this.circleBeingMoved.guiData.label === circle.guiData.label) {
                // if we are moving this circle, make its unplayed radius slightly bigger than normal
                radiusToSetUnplayedCircleTo = this.configurations.notes.movingCircleRadius;
            }
            let circleResizeRange = this.configurations.sequencer.width / 25
            if (circle.translation.x <= timeTrackingLinesXPosition - circleResizeRange || circle.translation.x >= timeTrackingLinesXPosition + circleResizeRange) {
                circle.radius = radiusToSetUnplayedCircleTo
            } else {
                circle.radius = this.configurations.notes.playedCircleRadius
            }
        }

        /**
         * This logic allows us to show buttons as being "pressed" for a short amount of time.
         * After we click a button, we set its "lastClickedTime" in the "lastButtonClickTimeTrackers" hash,
         * and we change the button's shape's background to a "clicked" color in its click listener. then in 
         * the logic below the button's background gets set back to "transparent" after the desired amount of 
         * time has elapsed. this lets us animate buttons to appear clicked, even if the action they perform
         * is done instantly after clicking.
         */
        for (let buttonName in this.lastButtonClickTimeTrackers) {
            let buttonClickTimeTracker = this.lastButtonClickTimeTrackers[buttonName]
            if (this.sequencer.currentTime - buttonClickTimeTracker.lastClickTime > this.configurations.buttonBehavior.showClicksForHowManyMilliseconds) {
                buttonClickTimeTracker.shape.fill = "transparent"
            }
        }

        this.two.update() // apply the visual update the GUI display by refreshing the two.js canvas
    }
    
    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects).
    // these are drawn in the order that they are layered on-screen, i.e. the bottom layer 
    // is drawn first.
    initializeGuiShapes() {
        let shapes = {};
        shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        shapes.referenceLineLists = this.initializeAllReferenceLines() // list of lists, storing 'reference' lines for each sequencer row (one list of reference lines per row)
        shapes.sequencerRowLines = this.initializeAllSequencerRowLines() // list of sequencer row lines
        shapes.subdivisionLineLists = this.initializeAllSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
        shapes.timeTrackingLines = this.initializeTimeTrackingLines() // list of lines that move to represent the current time within the loop
        shapes.noteBankContainer = this.initializeNoteBankContainer() // a rectangle that goes around the note bank
        shapes.noteTrashBinContainer = this.initializeNoteTrashBinContainer() // a rectangle that acts as a trash can for deleting notes
        shapes.pauseButtonShape = this.initializeRectangleShape(this.configurations.pauseButton.top, this.configurations.pauseButton.left, this.configurations.pauseButton.height, this.configurations.pauseButton.width) // a rectangle that will act as the pause button for now
        shapes.restartSequencerButtonShape = this.initializeRectangleShape(this.configurations.restartSequencerButton.top, this.configurations.restartSequencerButton.left, this.configurations.restartSequencerButton.height, this.configurations.restartSequencerButton.width) // a rectangle that will act as the button for restarting the sequencer for now
        shapes.clearAllNotesButtonShape = this.initializeRectangleShape(this.configurations.clearAllNotesButton.top, this.configurations.clearAllNotesButton.left, this.configurations.clearAllNotesButton.height, this.configurations.clearAllNotesButton.width) // a rectangle that will act as the button for clearing all notes on the sequencer
        shapes.addRowButtonShape = this.initializeRectangleShape(this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * (this.sequencer.rows.length - 1)) + this.configurations.addRowButton.topPadding, this.configurations.sequencer.left + (this.configurations.sequencer.width / 2) + this.configurations.addRowButton.leftPadding - (this.configurations.addRowButton.width / 2), this.configurations.addRowButton.height, this.configurations.addRowButton.width)
        shapes.clearNotesForRowButtonShapes = this.initializeButtonPerSequencerRow(this.configurations.clearRowButtons.topPaddingPerRow, this.configurations.clearRowButtons.leftPaddingPerRow, this.configurations.clearRowButtons.height, this.configurations.clearRowButtons.width) // this is a list of button rectangles, one per row, to clear the notes on that row
        shapes.sequencerRowHandles = this.initializeSequencerRowHandles()
        this.two.update(); // this initial 'update' creates SVG '_renderer' properties for our shapes that we can add action listeners to, so it needs to go here
        return shapes;
    }

    // create and store HTML DOM elements. these could include divs, images, text inputs, or any other DOM elements.
    // some of these might be stored as lists rather than individual elements, since some elements are programmatically created (e.g
    // text inputs are created or deleted based on how many sequencer rows there are, and a similar story for button icon images, etc.).
    initializeDomElements() {
        // Store DOM elements we use, so that we can access them without having to pull them from the DOM each time
        let domElements = {
            divs: {
                drawShapes: document.getElementById('draw-shapes'),
                tempoTextInputs: document.getElementById('tempo-text-inputs'),
                subdivisionTextInputs: document.getElementById('subdivision-text-inputs')
            },
            textInputs: {
                loopLengthMillis: document.getElementById('text-input-loop-length-millis'),
                subdivisionTextInputs: [],
                referenceLineTextInputs: [],
            },
            checkboxes: {
                quantizationCheckboxes: [],
            },
            images: {
                pauseIcon: document.getElementById('pause-icon'),
                playIcon: document.getElementById('play-icon'),
                clearAllIcon: document.getElementById('clear-all-icon'),
                restartIcon: document.getElementById('restart-icon'),
                trashClosedIcon: document.getElementById('trash-closed-icon'),
                trashOpenIcon: document.getElementById('trash-open-icon'),
                addIcon: document.getElementById('add-icon'),
                clearRowIcon: document.getElementById('clear-row-icon'),
                lockedIcon: document.getElementById('locked-icon'),
                unlockedIcon: document.getElementById('unlocked-icon'),
            },
            iconLists: {
                clearRowIcons: [], // list of icons for "clear row" buttons, one per sequencer row
                lockedIcons: [], // list of icons for "quantize row" buttons, one per sequencer row
                unlockedIcons: [], // list of icons for "unquantize row" buttons, one per sequencer row
            }
        }
        return domElements;
    }

    // initialize a hash that is used to keep track of the last time each button was clicked. for each button it cares about, 
    // it stores the last click time of that button, and which shapes are considered part of that button (these may undergo
    // some change when they are recently clicked, such as giving the button's main shape a darker background).
    initializeLastButtonClickTimeTrackers() {
        /**
         * keep track of when each button was last clicked, so we can make the button darker for a little while after clicking it.
         * we also keep track of when each button was clicked for buttons that are generated one-per-row, but those are initialized
         * within the relevant action listenever methods, not here. same for a few other of these trackers. 
         */
        let lastButtonClickTimeTrackers = {
            pause: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.pauseButtonShape,
            },
            restartSequencer: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.restartSequencerButtonShape,
            },
            clearAllNotes: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.clearAllNotesButtonShape,
            },
            addRow: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.addRowButtonShape,
            }
        }
        return lastButtonClickTimeTrackers;
    }

    initializeComponentEventListeners() {
        // do nothing yet. we will set this up so that for the most part, all shapes are initialized first, 
        // then event listeners are added to all of them. this is necessary because some event listeners make
        // changes to existing shapes, which can't be done unless those shapes already exist. 
    }

    initializeWindowEventListeners() {
        // do nothing yet
    }

    /**
     * sequencer row selection logic
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

    initializeRowSelectionVariablesAndVisuals(rowIndex) {
        this.setNoteTrashBinVisibility(true)
        this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
        // save relevant info about whichever row is selected
        this.selectedRowIndex = rowIndex;
        this.rowSelecionTracker.removeRow = false // start this out false until we move the row around (i.e. into the trash bin)
        // save a list, of all the shapes that are associated with the selected row.
        // we are saving this list so that we can move them all as we move the row around.
        this.rowSelecionTracker.shapes = [];
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.rowSelecionTracker.shapes.push(circle)
            }
        }
        this.rowSelecionTracker.shapes.push(...this.components.shapes.subdivisionLineLists[rowIndex])
        this.rowSelecionTracker.shapes.push(...this.components.shapes.referenceLineLists[rowIndex])
        this.rowSelecionTracker.shapes.push(this.components.shapes.sequencerRowLines[rowIndex])
        this.rowSelecionTracker.shapes.push(this.components.shapes.sequencerRowSelectionRectangles[rowIndex])
        this.rowSelecionTracker.shapes.push(this.components.shapes.clearNotesForRowButtonShapes[rowIndex])
        // this part gets a little weird. save a list of all of the starting positions of each
        // shape that is being moved. that way we can translate them proporionally to how far
        // the row handle has moved.
        this.rowSelecionTracker.shapesOriginalPositions = []
        for (let shape of this.rowSelecionTracker.shapes) {
            this.rowSelecionTracker.shapesOriginalPositions.push({
                x: shape.translation.x,
                y: shape.translation.y,
            });
        }
        this.rowSelecionTracker.rowHandleStartingPosition.x = this.components.shapes.sequencerRowHandles[rowIndex].translation.x
        this.rowSelecionTracker.rowHandleStartingPosition.y = this.components.shapes.sequencerRowHandles[rowIndex].translation.y
        // do the exact same thing for dom elements (subdivision and reference line text inputs, quantization checkbox, images) next
        this.rowSelecionTracker.domElements = [];
        this.rowSelecionTracker.domElements.push(this.components.domElements.textInputs.subdivisionTextInputs[rowIndex])
        this.rowSelecionTracker.domElements.push(this.components.domElements.textInputs.referenceLineTextInputs[rowIndex])
        if (this.configurations.hideIcons) {
            this.rowSelecionTracker.domElements.push(this.components.domElements.checkboxes.quantizationCheckboxes[rowIndex])
        } else {
            this.rowSelecionTracker.domElements.push(this.components.domElements.iconLists.lockedIcons[rowIndex]);
            this.rowSelecionTracker.domElements.push(this.components.domElements.iconLists.unlockedIcons[rowIndex]);
            this.rowSelecionTracker.domElements.push(this.components.domElements.iconLists.clearRowIcons[rowIndex]);
        }
        this.rowSelecionTracker.domElementsOriginalPositions = [];
        for (let domElement of this.rowSelecionTracker.domElements) {
            this.rowSelecionTracker.domElementsOriginalPositions.push({
                left: parseInt(domElement.style.left.slice(0, -2)), // cut off "px" from the position and convert it to an integer
                top: parseInt(domElement.style.top.slice(0, -2)),
            });
        }
        // update visuals
        let circle = this.components.shapes.sequencerRowHandles[rowIndex]
        circle.stroke = 'black'
        circle.linewidth = 2
        circle.fill = this.configurations.sequencerRowHandles.selectedColor
        let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex];
        rowSelectionRectangle.stroke = this.configurations.sequencerRowHandles.selectedColor
    }

    /**
     * sequencer row reference lines
     */

    removeReferenceLinesForRow(rowIndex) {
        for (let line of this.components.shapes.referenceLineLists[rowIndex]) {
            line.remove()
        }
        this.components.shapes.referenceLineLists[rowIndex] = []
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
            let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)
            let halfOfLineWidth = Math.floor(this.configurations.sequencer.lineWidth / 2)
            let lineStart = {
                x: this.configurations.sequencer.left + (xIncrementBetweenLines * linesDrawnForRow),
                y: sequencerLineCenterY - halfOfLineWidth // make sure to account for 'line width' when trying to make these lines reach the top of the sequencer line. that's why we subtract the value here
            }
            let lineEnd = {
                x: lineStart.x,
                y: sequencerLineCenterY - this.configurations.subdivisionLines.height
            }
            let referenceLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, this.configurations.sequencer.lineWidth, this.configurations.referenceLines.color);
            referenceLinesForRow.push(referenceLine) // keep a list of all reference lines for the current row
        }
        return referenceLinesForRow
    }

    initializeReferenceLineTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            let referenceLineTextInput = this.components.domElements.textInputs.referenceLineTextInputs[rowIndex]
            referenceLineTextInput.addEventListener('blur', () => {
                let newTextInputValue = referenceLineTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
                }
                newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                newTextInputValue = this.confineNumberToBounds(newTextInputValue, 0, this.configurations.referenceLineTextInputs.maximumValue)
                if (newTextInputValue === 0) {
                    referenceLineTextInput.style.color = this.configurations.referenceLines.color // set font color to lighter if the value is 0 to (try) reduce visual clutter
                } else {
                    referenceLineTextInput.style.color = this.configurations.defaultFont.color // set font color
                }
                referenceLineTextInput.value = newTextInputValue
                this.updateNumberOfReferenceLinesForRow(newTextInputValue, rowIndex)
                this.resetNotesAndLinesDisplayForRow(rowIndex)
            })
            this.addDefaultKeypressEventListenerToTextInput(referenceLineTextInput, false)
        }
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
        let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)
        let halfOfLineWidth = Math.floor(this.configurations.sequencer.lineWidth / 2)
        let lineStart = {
            x: this.configurations.sequencer.left - halfOfLineWidth, // make sure to account for 'line width' when trying to make these lines reach the top of the sequencer line. that's why we subtract the value here
            y: sequencerLineCenterY
        }
        let lineEnd = {
            x: this.configurations.sequencer.left + this.configurations.sequencer.width + halfOfLineWidth,
            y: sequencerLineCenterY
        }
        let sequencerRowLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, this.configurations.sequencer.lineWidth, this.configurations.sequencer.color);
        return sequencerRowLine
    }

    removeSequencerRowLine(rowIndex) {
        this.components.shapes.sequencerRowLines[rowIndex].remove();
        this.components.shapes.sequencerRowLines[rowIndex] = null;
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
            let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)
            let halfOfLineWidth = Math.floor(this.configurations.sequencer.lineWidth / 2)
            let lineStart = {
                x: this.configurations.sequencer.left + (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow),
                y: sequencerLineCenterY - halfOfLineWidth // make sure to account for 'line width' when trying to make subdivision lines reach the top of the sequencer line. that's why we subtract the value here
            }
            let lineEnd = {
                x: lineStart.x,
                y: sequencerLineCenterY + this.configurations.subdivisionLines.height
            }
            let subdivisionLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, this.configurations.sequencer.lineWidth, this.configurations.subdivisionLines.color);

            subdivisionLinesForRow.push(subdivisionLine) // keep a list of all subdivision lines for the current row
        }
        return subdivisionLinesForRow
    }

    // given the index of a sequencer row, remove all subdivision lines from the display for that row.
    // the current intent of this is to delete them all so that they can be re-drawn afterwards (such as
    // when the number of subdivisions in a particular row is changed).
    removeSubdivisionLinesForRow(rowIndex) {
        for (let line of this.components.shapes.subdivisionLineLists[rowIndex]) {
            line.remove()
        }
        this.components.shapes.subdivisionLineLists[rowIndex] = []
    }

    /** 
     * time tracking lines
     */

    removeTimeTrackingLine(rowIndex) {
        this.components.shapes.timeTrackingLines[rowIndex].remove();
        this.components.shapes.timeTrackingLines[rowIndex] = null;
    }

    // draw lines for the 'time trackers' for each sequencer row.
    // these are the little lines above each sequencer line that track the current time within the loop.
    // return a list of the drawn lines. these will be Two.js 'path' objects.
    initializeTimeTrackingLines() {
        let lines = []
        for (let linesDrawn = 0; linesDrawn < this.sequencer.numberOfRows; linesDrawn++) {
            let timeTrackingLine = this.initializeTimeTrackingLineForRow(linesDrawn)
            lines.push(timeTrackingLine)
        }
        return lines
    }

    initializeTimeTrackingLineForRow(rowIndex) {
        let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows);
        // this is a verical line, so for Y, start from the center point, and calculate start and end Y positions by either adding or subtracting a constant value from that center.
        let lineStart = {
            x: this.configurations.sequencer.left,
            y: sequencerLineCenterY - this.configurations.timeTrackingLines.height
        }
        let lineEnd = {
            x: lineStart.x,
            y: sequencerLineCenterY + this.configurations.timeTrackingLines.height
        }
        return this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, this.configurations.sequencer.lineWidth, this.configurations.timeTrackingLines.color);
    }

    /**
     * note bank container
     */

    // draw the physical note bank container on the screen. for now that's just a rectangle.
    // return the note bank shape. this will be a Two.js path object.
    initializeNoteBankContainer() {
        let width  = this.configurations.notes.unplayedCircleRadius + (this.configurations.sampleBank.borderPadding * 2)
        let height = (this.configurations.notes.unplayedCircleRadius * (this.sampleNameList.length - 1)) + ((this.sampleNameList.length - 1) * this.configurations.sampleBank.spaceBetweenNotes) + (this.configurations.sampleBank.borderPadding * 2)
        let noteBankContainer = this.initializeRectangleShape(this.configurations.sampleBank.top, this.configurations.sampleBank.left, height, width)
        noteBankContainer.linewidth = this.configurations.sequencer.lineWidth;
        noteBankContainer.stroke = this.configurations.sequencer.color
        noteBankContainer.fill = 'transparent'
        return noteBankContainer
    }

    /**
     * trash bin container
     */

    // draw the 'trash bin' for throwing out (deleting) notes and rows. for now it's just a red rectangle.
    initializeNoteTrashBinContainer() {
        let noteTrashBinContainer = this.initializeRectangleShape(this.configurations.noteTrashBin.top, this.configurations.noteTrashBin.left, this.configurations.noteTrashBin.height, this.configurations.noteTrashBin.width)
        noteTrashBinContainer.linewidth = this.configurations.sequencer.lineWidth
        noteTrashBinContainer.stroke = 'transparent'
        noteTrashBinContainer.fill = 'transparent'
        return noteTrashBinContainer
    }

    // show or hide the note trash bin (show if visible === true, hide otherwise)
    setNoteTrashBinVisibility(visible) {
        if (visible) {
            this.components.shapes.noteTrashBinContainer.stroke = this.configurations.noteTrashBin.color
            this.components.domElements.images.trashClosedIcon.style.display = 'block'
        } else {
            this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            this.components.domElements.images.trashClosedIcon.style.display = 'none'
            this.components.domElements.images.trashOpenIcon.style.display = 'none'
        }
    }

    /**
     * sequencer row handles
     */

    // these are circles that are to the left of the sequencer, which we can click on to select sequencer rows,
    // so that we can move those rows by clicking and dragging, to rearrange the sequencer row order, throw 
    // rows away, etc.
    initializeSequencerRowHandles() {
        let allCircles = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let horizontalPosition = this.configurations.sequencer.left + this.configurations.sequencerRowHandles.leftPadding
            let verticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.sequencerRowHandles.topPadding
            let radius = this.configurations.sequencerRowHandles.radius
            let circle = this.two.makeCircle(horizontalPosition, verticalPosition, radius);
            circle.fill = this.configurations.sequencerRowHandles.unselectedColor
            circle.stroke = "transparent"
            allCircles.push(circle)
        }
        return allCircles
    }

    initializeSequencerRowHandlesActionListeners() {
        for (let rowIndex = 0; rowIndex < this.components.shapes.sequencerRowHandles.length; rowIndex++) {
            let circle = this.components.shapes.sequencerRowHandles[rowIndex];
            let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex]

            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', () => {
                if (this.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
                    circle.stroke = 'black'
                    circle.linewidth = 2
                    circle.fill = this.configurations.sequencerRowHandles.unselectedColor
                    rowSelectionRectangle.stroke = this.configurations.sequencerRowHandles.unselectedColor
                }
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', () => {
                circle.stroke = 'transparent'
                circle.fill = this.configurations.sequencerRowHandles.unselectedColor
                rowSelectionRectangle.stroke = 'transparent'
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', () => {
                // save relevant info about whichever row is selected
                this.initializeRowSelectionVariablesAndVisuals(rowIndex);
            });
            // the bulk of the actual 'mouseup' logic will be handled in the window's mouseup event,
            // because if we implement snap-into-place for sequencer rows, the row handle may not actually
            // be under our mouse when we lift our mouse to drop the row into place.
            // just putting the most basic functionality for visual effects here for now.
            circle._renderer.elem.addEventListener('mouseup', () => {
                circle.stroke = 'black'
                circle.linewidth = 2
                circle.fill = this.configurations.sequencerRowHandles.unselectedColor
                rowSelectionRectangle.stroke = this.configurations.sequencerRowHandles.unselectedColor
            });
        }
    }

    /**
     * 'set tempo' text input logic
     */

    initializeTempoTextInputValuesAndStyles() {
        this.components.domElements.divs.tempoTextInputs.style.left = "" + this.configurations.tempoTextInput.left + "px"
        this.components.domElements.divs.tempoTextInputs.style.top = "" + this.configurations.tempoTextInput.top + "px"
        this.components.domElements.textInputs.loopLengthMillis.value = this.sequencer.loopLengthInMillis
        this.components.domElements.textInputs.loopLengthMillis.style.borderColor = this.configurations.sequencer.color
        this.components.domElements.textInputs.loopLengthMillis.style.color = this.configurations.defaultFont.color // set font color
    }

    initializeTempoTextInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'loop length in millis' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        this.components.domElements.textInputs.loopLengthMillis.addEventListener('blur', (event) => {
            let newTextInputValue = this.components.domElements.textInputs.loopLengthMillis.value.trim() // remove whitespace from beginning and end of input then store it
            if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                newTextInputValue = this.sequencer.loopLengthInMillis
            }
            newTextInputValue = parseFloat(newTextInputValue) // do we allow floats rather than ints?? i think we could. it probably barely makes a difference though
            // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input
            newTextInputValue = this.confineNumberToBounds(newTextInputValue, this.sequencer.lookAheadMillis, this.configurations.tempoTextInput.maximumValue)
            this.components.domElements.textInputs.loopLengthMillis.value = newTextInputValue
            this.updateSequencerLoopLength(newTextInputValue)
        })
        this.addDefaultKeypressEventListenerToTextInput(this.components.domElements.textInputs.loopLengthMillis, true)
    }

    updateSequencerLoopLength(newLoopLengthInMillis) {
        if (this.sequencer.loopLengthInMillis === newLoopLengthInMillis) { // save a little effort by skipping update if it isn't needed
            return;
        }
        /**
         * note down current state before changing tempo
         */
        let wasPaused = this.sequencer.paused
        /**
         * update states
         */
        this.pause();
        this.sequencer.setLoopLengthInMillis(newLoopLengthInMillis);
        // only unpause if the sequencer wasn't paused before
        if (!wasPaused) {
            this.unpause();
        }
    }

    /**
     * 'pause and unpause sequencer' button logic
     */

    // toggle whether the sequencer is 'paused' or not. this method gets called when we click the pause button
    togglePaused() {
        if (this.sequencer.paused) { // unpause 
            this.unpause();
        } else { // pause
            this.pause();
        }
    }

    pause() {
        if (!this.sequencer.paused) {
            this.sequencer.pause();
        }
        this.components.domElements.images.pauseIcon.style.display = 'none'
        this.components.domElements.images.playIcon.style.display = 'block'
    }

    unpause() {
        if (this.sequencer.paused) {
            this.sequencer.unpause();
        }
        this.components.domElements.images.pauseIcon.style.display = 'block'
        this.components.domElements.images.playIcon.style.display = 'none'
    }

    addPauseButtonActionListeners() {
        if (this.eventHandlerFunctions.pauseButton !== null && this.eventHandlerFunctions.pauseButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.pauseButtonShape._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.pauseButton)
            this.components.domElements.images.pauseIcon.removeEventListener('click', this.eventHandlerFunctions.pauseButton)
            this.components.domElements.images.playIcon.removeEventListener('click', this.eventHandlerFunctions.pauseButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.pauseButton = () => this.pauseButtonClickHandler(this)
        this.components.shapes.pauseButtonShape._renderer.elem.addEventListener('click', this.eventHandlerFunctions.pauseButton)
        this.components.domElements.images.pauseIcon.addEventListener('click', this.eventHandlerFunctions.pauseButton)
        this.components.domElements.images.playIcon.addEventListener('click', this.eventHandlerFunctions.pauseButton)
    }

    /**
     * a general note about the 'self' paramater, which will likely be used here and elsewhere in this file:
     * because of how scoping in javascript events works, 'this' in this event handler method will refer to 
     * whichever object fired the event. for that reason, we pass in 'self', which will be a reference to the 
     * 'this' variable from the main scope for this class in which this event handler was initialized, so that 
     * we can still reference class fields, methods, etc. that would normally require the use of 'this'.
     */
    pauseButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers.pause.lastClickTime = self.sequencer.currentTime
        self.components.shapes.pauseButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.togglePaused()
    }

    /**
     * 'set number of subdivisions for row' text inputs
     */

    initializeSubdivisionTextInputsValuesAndStyles() {
        for(let existingSubdivisionTextInput of this.components.domElements.textInputs.subdivisionTextInputs) {
            this.components.domElements.divs.subdivisionTextInputs.removeChild(existingSubdivisionTextInput)
        }
        this.components.domElements.textInputs.subdivisionTextInputs = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let textArea = document.createElement("textarea");
            textArea.cols = "3"
            textArea.rows = "1"
            textArea.style.position = "absolute"
            textArea.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.subdivionLineTextInputs.topPaddingPerRow) + "px"
            textArea.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.subdivionLineTextInputs.leftPaddingPerRow) + "px"
            textArea.style.borderColor = this.configurations.sequencer.color
            textArea.value = this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
            textArea.style.color = this.configurations.defaultFont.color // set font color
            this.components.domElements.divs.subdivisionTextInputs.appendChild(textArea);
            // note for later: the opposite of appendChild is removeChild
            this.components.domElements.textInputs.subdivisionTextInputs.push(textArea)
            // textArea.disabled = "true" // todo: get rid of this line once the subdivision text inputs are functioning
        }
    }

    updateNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        // update quantization toggle checkbox, quantization settings: you can't quantize a row if it has 0 subdivisions.
        if (newNumberOfSubdivisions === 0) {
            if (this.configurations.hideIcons) {
                this.components.domElements.checkboxes.quantizationCheckboxes[rowIndex].checked = false
            }
            this.sequencer.rows[rowIndex].quantized = false
        }
        // update the sequencer data structure to reflect the new number of subdivisions.
        // call the sequencer's 'update subdivisions for row' method
        this.sequencer.setNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex)
        this.components.domElements.textInputs.subdivisionTextInputs[rowIndex].value = newNumberOfSubdivisions
    }

    /**
     * 'set number of reference lines for row' text inputs
     */
    initializeReferenceLineTextInputsValuesAndStyles() {
        for(let existingTextInput of this.components.domElements.textInputs.referenceLineTextInputs) {
            this.components.domElements.divs.subdivisionTextInputs.removeChild(existingTextInput)
        }
        this.components.domElements.textInputs.referenceLineTextInputs = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let textArea = document.createElement("textarea");
            textArea.cols = "3"
            textArea.rows = "1"
            textArea.style.position = "absolute"
            textArea.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.referenceLineTextInputs.topPaddingPerRow) + "px"
            textArea.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.referenceLineTextInputs.leftPaddingPerRow) + "px"
            textArea.style.borderColor = this.configurations.referenceLines.color
            textArea.value = this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
            if (this.sequencer.rows[rowIndex].getNumberOfReferenceLines() === 0) {
                textArea.style.color = this.configurations.referenceLines.color // set font color to lighter if the value is 0 to (try) reduce visual clutter
            } else {
                textArea.style.color = this.configurations.defaultFont.color // set font color
            }
            this.components.domElements.divs.subdivisionTextInputs.appendChild(textArea);
            // note for later: the opposite of appendChild is removeChild
            this.components.domElements.textInputs.referenceLineTextInputs.push(textArea)
            // textArea.disabled = "true" // todo: get rid of this line once the subdivision text inputs are functioning
        }
    }

    updateNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex) {
        // update the sequencer data structure to reflect the new number of reference lines.
        // call the sequencer's 'update number of reference lines for row' method
        this.sequencer.setNumberOfReferenceLinesForRow(newNumberOfReferenceLines, rowIndex)
        this.components.domElements.textInputs.referenceLineTextInputs[rowIndex].value = newNumberOfReferenceLines
    }

    /**
     * 'toggle quantization for row' logic
     */

    initializeQuantizationCheckboxes() {
        if (!this.configurations.hideIcons) {
            this.components.domElements.checkboxes.quantizationCheckboxes = [];
            return 
        }
        for (let existingCheckbox of this.components.domElements.checkboxes.quantizationCheckboxes) {
            this.components.domElements.divs.subdivisionTextInputs.removeChild(existingCheckbox)
        }
        this.components.domElements.checkboxes.quantizationCheckboxes = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let verticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.subdivionLineTextInputs.topPaddingPerRow + 4
            let horizontalPosition = this.configurations.sequencer.left + this.configurations.sequencer.width + 73
            let checkbox = this.initializeCheckbox(verticalPosition, horizontalPosition)
            if (this.sequencer.rows[rowIndex].quantized) {
                checkbox.checked = true;
            }
            this.components.domElements.checkboxes.quantizationCheckboxes.push(checkbox)
        }
    }

    /**
     * NOTE SNAP-TO LOGIC starts here
     * todo: clean up the block comments for the two 'snap to' methods below for clarity
     **/ 

    /**
     * for a given x coordinate and number of subdivisions, return what subdivision
     * number (i.e. what beat number) the x coordinate falls closest to.
     * 
     * this is used as part of 'snap note to quantized row' logic.
     * 
     * for a given mouse x coordinate and number of subdivisions, we need to find the 
     * x coordinate of the subdivision line that is closest to the mouse position. in 
     * other words, we need to quantize the mouse x position to the nearest subdivision 
     * line. this will be used for 'snapping' notes to subdivision lines when moving 
     * them on quantized sequencer rows.
     * we will break the logic for doing this into two parts.
     * 
     * the first part of doing this is handled in this function -- we need to find the
     * index of the closest subdivision line, in other words we need to find the beat
     * number that we should quantize to for the given mouse x coordinate and number
     * of subdivisions.
     * 
     * the other piece we will then need to do is to get the x position for a beat
     * number. that will be handled elsewhere.
     */
    getIndexOfClosestSubdivisionLine(mouseX, numberOfSubdivisions) {
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencer / widthOfEachSubdivision)
        let mouseIsCloserToRightSubdivisionThanLeft = (mouseXWithinSequencer % widthOfEachSubdivision) > (widthOfEachSubdivision / 2)
        let subdivisionToSnapTo = subdivisionNumberToLeftOfMouse
        if (mouseIsCloserToRightSubdivisionThanLeft) {
            subdivisionToSnapTo += 1
        }
        return this.confineNumberToBounds(subdivisionToSnapTo, 0, numberOfSubdivisions - 1)
    }
    
    /**
     * for a given subdivision number and number of subdivisions, return
     * the x coordinate of that subdivision number.
     * 
     * this logic is part of our 'snap note to quantized sequencer row' logic.
     * see the block comment above for info on how this function is used.
     * 
     * this function is the second part of the logic explained in the block comment 
     * above, where we find the x coordinate for a given beat number.
     */
    getXPositionOfSubdivisionLine(subdivisionIndex, numberOfSubdivisions) {
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        return sequencerLeftEdge + (widthOfEachSubdivision * subdivisionIndex)
    }

    /**
     * General text input event listeners logic
     */

    addDefaultKeypressEventListenerToTextInput(textarea, allowPeriods) {
        textarea.addEventListener('keypress', (event) => {
            if (event.key === "Enter") {
                event.preventDefault()
                textarea.blur() // apply the change to the text area if the user presses "enter"
            }
            let periodCheckPassed = (event.key === "." && allowPeriods) // if the character is a period, make this value 'true' if periods are allowed. otherwise false.
            if (isNaN(Number.parseInt(event.key)) && !periodCheckPassed) { // don't allow the user to enter things that aren't numbers (but allow periods if they're allowed)
                event.preventDefault()
            }
        })
    }

    /**
     * 'add row to sequencer' logic
     */

    addEmptySequencerRow() {
        this.sequencer.addEmptyRow();
        let newRowIndex = this.sequencer.rows.length - 1
        // set new row default configuration
        this.sequencer.rows[newRowIndex].setNumberOfReferenceLines(4);
        this.sequencer.rows[newRowIndex].setNumberOfSubdivisions(8);
        this.sequencer.rows[newRowIndex].setQuantization(true);
    }

    /**
     * 'restart sequencer' logic
     */

    restartSequencer() {
        this.sequencer.restart();
    }

    addRestartSequencerButtonActionListeners() {
        if (this.eventHandlerFunctions.restartSequencer !== null && this.eventHandlerFunctions.restartSequencer !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.restartSequencerButtonShape._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.restartSequencer)
            this.components.domElements.images.restartIcon.removeEventListener('click', this.eventHandlerFunctions.restartSequencer)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.restartSequencer = () => this.restartSequencerButtonClickHandler(this)
        this.components.shapes.restartSequencerButtonShape._renderer.elem.addEventListener('click', this.eventHandlerFunctions.restartSequencer)
        this.components.domElements.images.restartIcon.addEventListener('click', this.eventHandlerFunctions.restartSequencer)
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    restartSequencerButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers.restartSequencer.lastClickTime = self.sequencer.currentTime
        self.components.shapes.restartSequencerButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.restartSequencer()
    }

    /**
     * 'clear notes for sequencer row' logic
     */

    addClearNotesForRowButtonsActionListeners() {
        for(let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            this.lastButtonClickTimeTrackers["clearNotesForRow" + rowIndex] = {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.clearNotesForRowButtonShapes[rowIndex],
            }
            if (this.eventHandlerFunctions["clearNotesForRowShape" + rowIndex] !== null && this.eventHandlerFunctions["clearNotesForRowShape" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                this.components.shapes.clearNotesForRowButtonShapes[rowIndex]._renderer.elem.removeEventListener('click', this.eventHandlerFunctions["clearNotesForRowShape" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["clearNotesForRowShape" + rowIndex] = () => this.clearRowButtonClickHandler(this, rowIndex);
            this.components.shapes.clearNotesForRowButtonShapes[rowIndex]._renderer.elem.addEventListener('click', this.eventHandlerFunctions["clearNotesForRowShape" + rowIndex] );
        }
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    clearRowButtonClickHandler(self, rowIndex) {
        self.lastButtonClickTimeTrackers["clearNotesForRow" + rowIndex].lastClickTime = self.sequencer.currentTime
        self.components.shapes.clearNotesForRowButtonShapes[rowIndex].fill = self.configurations.buttonBehavior.clickedButtonColor
        self.clearNotesForRow(rowIndex);
        self.resetNotesAndLinesDisplayForRow(rowIndex);
    }

    clearNotesForRow(rowIndex) { 
        this.sequencer.clearRow(rowIndex)
    }

    /**
     * 'clear all sequencer notes' logic
     */

    clearAllNotes() {
        this.sequencer.clear();
    }

    /**
     * logic to remove circles from the GUI display
     */

    // remove a circle from the 'allDrawnCircles' list and two.js canvas, based on its label.
    // this is meant to be used during deletion of notes from the sequencer, with the idea being that deleting
    // them from this list and maybe from a few other places will clear up clutter, and hopefully allow the 
    // deleted circles to get garbage-collected.
    // note that this method _only_ deletes circles from the _display_, not from the underlying sequencer data
    // structure, that needs to be handled somewhere else separately.
    removeCircleFromDisplay(label){
        let indexOfListItemToRemove = this.allDrawnCircles.findIndex(elementFromList => elementFromList.guiData.label === label);
        if (indexOfListItemToRemove === -1) { //  we don't expect to reach this case, where a circle with the given label isn't found in the list
            throw "unexpected problem: couldn't find the circle with the given label in the list of all drawn circles, when trying to delete it. the given label was: " + label + ". full list (labels only): " + this.allDrawnCircles.map((item) => item.guiData.label) + "."
        }
        let listOfOneRemovedElement = this.allDrawnCircles.splice(indexOfListItemToRemove, 1) // this should go in and delete the element we want to delete!
        if (listOfOneRemovedElement.length !== 1) {
            throw "unexpected problem: we expected exactly one circle to be removed from the allDrawnCricles list, but some other number of circles were removed. number removed: " + listOfOneRemovedElement.length
        }
        // now we should remove the circle from the two.js canvas as well
        listOfOneRemovedElement[0].remove()
    }

    /**
     * remove all circles from the display.
     * this has _no effect_ on the underlying sequencer data structure, it only removes circles _from the GUI display_.
     */
    removeAllCirclesFromDisplay() {
        let allDrawnCirclesCopy = [...this.allDrawnCircles] // make a copy of the drawn circles list so we can iterate through its circles while also removing the items from the original list
        for (let note of allDrawnCirclesCopy) {
            this.removeCircleFromDisplay(note.guiData.label)
        }
    }

    /**
     * logic to draw circles (including adding event listeners to them etc.)
     */

     // create a new circle (i.e. note) on the screen, with the specified x and y position. color is determined by sample name. 
    // values given for sample name, label, and row number are stored in the circle object to help the GUI keep track of things.
    // add the newly created circle to the list of all drawn cricles.
    drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat) {
        // initialize the new circle and set its colors
        let circle = this.two.makeCircle(xPosition, yPosition, this.configurations.notes.unplayedCircleRadius)
        circle.fill = this.samples[sampleName].color
        circle.stroke = 'transparent'

        // add mouse events to the new circle
        this.two.update() // this 'update' needs to go here because it is what generates the new circle's _renderer.elem 
        
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
            this.circleBeingMoved = circle
            this.circleBeingMovedStartingPositionX = this.circleBeingMoved.translation.x
            this.circleBeingMovedStartingPositionY = this.circleBeingMoved.translation.y
            this.circleBeingMovedOldRow = this.circleBeingMoved.guiData.row
            this.circleBeingMovedNewRow = this.circleBeingMovedOldRow
            this.circleBeingMovedOldBeatNumber = this.circleBeingMoved.guiData.beat
            this.circleBeingMovedNewBeatNumber = this.circleBeingMovedOldBeatNumber
            this.setNoteTrashBinVisibility(true)
            this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            this.sequencer.playDrumSampleNow(this.circleBeingMoved.guiData.sampleName)
        });

        // add info to the circle object that the gui uses to keep track of things
        circle.guiData = {}
        circle.guiData.sampleName = sampleName
        circle.guiData.row = row
        circle.guiData.label = label
        circle.guiData.beat = beat

        // add circle to list of all drawn circles
        this.allDrawnCircles.push(circle)
    }

    // draw a new circle in the note bank based on its sampleName.
    // this is called when initializing the starting set of cirlces (i.e. notes) in the 
    // notes bank, and also called when a note from the note bank is placed on a row and 
    // we need to refill the note bank for the note that was just placed.
    drawNoteBankCircleForSample(sampleName) {
        // figure out which index in the 'sampleNameList' the given sample name is. this will be used to determine physical positioning of the circle within the sample bank
        let indexOfSampleInNoteBank = this.sampleNameList.findIndex(elementFromList => elementFromList === sampleName);
        if (indexOfSampleInNoteBank === -1) { // we don't expect to reach this case, where the given sample isn't found in the sample names list
            throw "unexpected problem: couldn't find the given sample in the sample list when trying to add it to the note bank. was looking for sample name: " + sampleName + ". expected sample name to be one of: " + this.sampleNameList + "."
        }
        let xPosition = this.configurations.sampleBank.left + this.configurations.sampleBank.borderPadding + (this.configurations.notes.unplayedCircleRadius / 2)
        let yPosition = this.configurations.sampleBank.top + this.configurations.sampleBank.borderPadding + (indexOfSampleInNoteBank * this.configurations.notes.unplayedCircleRadius) + (indexOfSampleInNoteBank * this.configurations.sampleBank.spaceBetweenNotes)
        let row = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
        /**
         * the top note in the note bank will have label '-1', next one down will be '-2', etc.
         * these negative number labels will still be unique to a particular circle in the note bank,
         * and these IDs will be replaced with a real, normal label (a generated ID) once each note
         * bank circle is taken fom the note bank and placed onto a real row.
         */
        let label = (indexOfSampleInNoteBank + 1) * -1 // see block comment above for info about '-1' here
        this.drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, Sequencer.NOTE_IS_NOT_QUANTIZED)
    }

    drawAllNoteBankCircles(){
        // draw the circles (i.e. notes) that are in the note bank
        for (let noteBankSampleName of this.sampleNameList) {
            this.drawNoteBankCircleForSample(noteBankSampleName)
        }
    }

    drawNotesToReflectSequencerCurrentState(){
        // draw all notes that are in the sequencer before the sequencer starts (aka the notes of the initial example drum sequence)
        for(let sequencerRowIndex = 0; sequencerRowIndex < this.sequencer.numberOfRows; sequencerRowIndex++) {
            let noteToDraw = this.sequencer.rows[sequencerRowIndex]._notesList.head // we are reading notes lists directly so that we can draw them, but making no changes to them
            while (noteToDraw !== null) {
                let xPosition = this.configurations.sequencer.left + (this.configurations.sequencer.width * (noteToDraw.priority / this.sequencer.loopLengthInMillis))
                let yPosition = this.configurations.sequencer.top + (sequencerRowIndex * this.configurations.sequencer.spaceBetweenRows)
                let sampleName = noteToDraw.data.sampleName
                let row = sequencerRowIndex
                let label = noteToDraw.label
                let beat = noteToDraw.data.beat
                this.drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat)
                noteToDraw = noteToDraw.next
            }
        }
    }

    /**
     * 'redraw sequencer' logic
     */

    resetNotesAndLinesDisplayForRow(rowIndex) {
        /**
         * found a problem with deleting only a single row. shapes are layered on-screen in the order they are 
         * drawn (newer on top), so re-drawing only one row including its subdivision lines means if we move a 
         * circle from another line onto the row with newly drawn subdivision lines, the note will show up 
         * behind the subdivision lines. it isn't simple to change layer ordering in two.js, so instead of
         * re-drawing single rows, we will redraw the entire sequencer's notes whenever a big change 
         * happens, since it is simpler. also since notes are scheduled ahead of time, the extra computation
         * shouldn't affect the timing of the drums at all.
         */
        // first delete all existing notes from the display for the changed row,
        // because now they may be out of date or some of them may have been deleted,
        // and the simplest thing to do may just be to delete them all then redraw
        // the current state of the sequencer for the changed row.
        // the same applies for the subdivion lines and the sequencer row line as well,
        // since we want those to be in front of the reference lines, which we are
        // redrawing now.
        this.removeAllCirclesFromDisplay()
        // next we will delete all lines for the changed row
        this.removeSubdivisionLinesForRow(rowIndex)
        this.removeReferenceLinesForRow(rowIndex)
        this.removeSequencerRowLine(rowIndex)
        this.removeTimeTrackingLine(rowIndex)
        // then we will draw all the lines for the changed row, starting with reference lines since they need to be the bottom layer
        this.components.shapes.referenceLineLists[rowIndex] = this.initializeReferenceLinesForRow(rowIndex)
        this.components.shapes.subdivisionLineLists[rowIndex] = this.initializeSubdivisionLinesForRow(rowIndex)
        this.components.shapes.sequencerRowLines[rowIndex] = this.initializeSequencerRowLine(rowIndex)
        this.components.shapes.timeTrackingLines[rowIndex] = this.initializeTimeTrackingLineForRow(rowIndex)
        // then we will add the notes from the sequencer data structure to the display, so the display accurately reflects the current state of the sequencer.
        this.drawAllNoteBankCircles()
        this.drawNotesToReflectSequencerCurrentState()
    }

    resetNotesAndLinesDisplayForAllRows() {
        this.removeAllCirclesFromDisplay()
        for (let list of this.components.shapes.subdivisionLineLists) {
            for (let line of list) {
                line.remove();
            }
            list = [];
        }
        this.components.shapes.subdivisionLineLists = []
        for (let list of this.components.shapes.referenceLineLists) {
            for (let line of list) {
                line.remove();
            }
            list = [];
        }
        this.components.shapes.referenceLineLists = []
        for (let line of this.components.shapes.sequencerRowLines) {
            line.remove();
        }
        this.components.shapes.sequencerRowLines = [];
        for (let line of this.components.shapes.timeTrackingLines) {
            line.remove();
        }
        this.components.shapes.timeTrackingLines = [];
        for (let circle of this.components.shapes.sequencerRowHandles) {
            circle.remove();
        }
        this.components.shapes.sequencerRowHandles = []
        for (let rectangle of this.components.shapes.sequencerRowSelectionRectangles) {
            rectangle.remove();
        }
        this.components.shapes.sequencerRowSelectionRectangles = []
        this.components.shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        this.components.shapes.referenceLineLists = this.initializeAllReferenceLines();
        this.components.shapes.subdivisionLineLists = this.initializeAllSubdivisionLines();
        this.components.shapes.sequencerRowLines = this.initializeAllSequencerRowLines();
        this.components.shapes.sequencerRowHandles = this.initializeSequencerRowHandles();
        this.components.shapes.timeTrackingLines = this.initializeTimeTrackingLines();
        this.drawAllNoteBankCircles();
        this.drawNotesToReflectSequencerCurrentState();
    }

    /**
     * general helper methods
     */

    initializeLine(startX, startY, endX, endY, lineWidth, color) {
        let line = this.two.makePath(
            [
                new Two.Anchor(startX, startY),
                new Two.Anchor(endX, endY),
            ], 
            false
        );
        line.linewidth = lineWidth;
        line.stroke = color;
        return line;
    }

    initializeRectangleShape(top, left, height, width, radius=4) {
        // new button rectangle: make a rectangle with rounded corners
        let shape = this.two.makeRoundedRectangle(left + (width / 2), top + (height / 2), width, height, radius)
        shape.linewidth = this.configurations.sequencer.lineWidth
        shape.stroke = this.configurations.sequencer.color
        shape.fill = 'transparent'
        return shape
    }

    initializeButtonPerSequencerRow(topPaddingPerRow, leftPaddingPerRow, height, width) {
        let shapes = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let top = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + topPaddingPerRow
            let left = this.configurations.sequencer.left + this.configurations.sequencer.width + leftPaddingPerRow
            shapes[rowIndex] = this.initializeRectangleShape(top, left, height, width)
        }
        return shapes
    }

    initializeCheckbox(verticalPosition, horizontalPosition) {
        let checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.style.position = "absolute";
        checkbox.style.top = "" + verticalPosition + "px";
        checkbox.style.left = "" + horizontalPosition + "px";
        checkbox.style.width = "20px"
        checkbox.style.height = "20px"
        checkbox.style.outline = "20px"
        this.components.domElements.divs.subdivisionTextInputs.appendChild(checkbox);
        checkbox.style.cursor = "pointer"
        return checkbox
    }

    /**
     * Two.js library helper methods
     */

    // initialize Two.js library object and append it to the given DOM element
    initializeTwoJs(twoJsDomElement) {
        return new Two({
            fullscreen: true,
            type: Two.Types.svg
        }).appendTo(twoJsDomElement);
    }

    // The SVG renderer's top left corner isn't necessarily located at (0,0), 
    // so our mouse / touch events may be misaligned until we correct them.
    // event.pageX and event.pageY are read-only, so this method creates and 
    // returns a new event object rather than modifying the one that was passed in.
    // Put any event-specific calls, such as preventDefault(), before this method is called.
    // TODO: This currently only supports mouse events. Add support for touch events.
    adjustEventCoordinates(event) {
        let svgScale = $(this.two.renderer.domElement).height() / this.two.height;
        let svgOrigin = $('#draw-shapes')[0].getBoundingClientRect();
        return {
            pageX: (event.pageX - svgOrigin.left) / svgScale,
            pageY: (event.pageY - svgOrigin.top) / svgScale
        }
    }

    /**
     * Miscellaneous re-used GUI logic
     */

    // given a number and an upper and lower bound, confine the number to be between the bounds.
    // if the number if below the lower bound, return the lower bound.
    // if it is above the upper bound, return the upper bound.
    // if it is between the bounds, return the number unchanged.
    confineNumberToBounds(number, lowerBound, upperBound) {
        if (number < lowerBound) {
            return lowerBound
        } else if (number > upperBound) {
            return upperBound
        } else {
            return number
        }
    }

    // quick happy-path unit test for confineNumberToBounds()
    testConfineNumberToBounds() {
        assertEquals(5, this.confineNumberToBounds(4, 5, 10), "number below lower bound")
        assertEquals(5, this.confineNumberToBounds(5, 5, 10), "number same as lower bound")
        assertEquals(6, this.confineNumberToBounds(6, 5, 10), "number between the bounds")
        assertEquals(10, this.confineNumberToBounds(10, 5, 10), "number same as upper bound")
        assertEquals(10, this.confineNumberToBounds(11, 5, 10), "number above upper bound")
    }

}