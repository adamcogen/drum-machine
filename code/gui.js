/**
 * This will be a class for storing, managing, and updating
 * all GUI components and their event listeners, etc.
 */
class DrumMachineGui {
    // create constants that will be used to denote special sequencer 'row' numbers, to indicate special places notes can go on the GUI, such as the note bank or the trash bin
    static get NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW() { return -1 }
    static get NOTE_ROW_NUMBER_FOR_NOTE_BANK() { return -2 }
    static get NOTE_ROW_NUMBER_FOR_TRASH_BIN() { return -3 }
    // create constants relating to exporting sequencer patterns to MIDI files
    static get MIDI_FILE_EXPORT_NUMBER_OF_TICKS_PER_BEAT() { return 128 };

    constructor(sequencer, sampleNameList, sampleBankNodeGenerator, allDrumKitsHash) {
        this.sequencer = sequencer
        this.two = this.initializeTwoJs(document.getElementById('draw-shapes')) // Initialize Two.js library
        this.sampleNameList = sampleNameList
        this.selectedDrumKitName = this.sequencer.sampleListName;
        this.samples = allDrumKitsHash[this.selectedDrumKitName];
        this.allDrumKitsHash = allDrumKitsHash;
        this.sampleBankNodeGenerator = sampleBankNodeGenerator;
        this.configurations = getGuiConfigurations()
        this.components = {
            shapes: {}, // this hash will contain all of the two.js shapes (either as shapes, lists of shapes, or lists of lists of shapes)
            domElements: {} // this hash will contain all of the HTML DOM elements (either as individual elements, lists of elements, or lists of lists of elements, etc.)
        }

        this.exampleSequencerPatternsHash = getExampleSequencerPatternsHash();

        this.configureMidiFileWriterLibrary();

        this.referenceLinesShiftInPixelsPerRow = []; // save us some calculation time later by keeping track of the shift value for reference lines in pixels (they're stored everywhere else as milliseconds only)
        this.initializeReferenceLinesShiftPixelsTracker();
        this.initializeSubdivisionLinesShiftPixelsTracker();

        this.subdivisionLinesShiftInPixelsPerRow = []; 
        this.initializeSubdivisionLinesShiftPixelsTracker();

        this.components.shapes = this.initializeGuiShapes();
        this.components.domElements = this.initializeDomElements();

        this.eventHandlerFunctions = {}; // make a hash to store references to event handler functions. that way we can remove them from the DOM elements they are attached to later
        this.midiOutputsMap = {} // keep a map of MIDI output names (as the appear in the MIDI outputs selector) to MIDI output ports

        // add more dom elements and do some additional setup of shapes and dom elements
        this.initializeTempoTextInputValuesAndStyles();
        this.initializeMidiOutputSelectorValuesAndStyles();
        this.initializeDrumKitSelectorValuesAndStyles();
        this.initializeExamplePatternSelectorValuesAndStyles()
        this.initializeTempoBpmTextLabelsStyles();
        this.initializeTempoMillisecondsTextLabelsStyles();
        this.setNoteTrashBinVisibility(false) // trash bin only gets shown when we're moving a note or a sequencer row, so make sure it starts out as not visible

        this.lastButtonClickTimeTrackers = this.initializeLastButtonClickTimeTrackers(); // a hash used keep track of the last time each button was clicked

        // create object which will be used to track info about the note that is being clicked and dragged
        this.circleSelectionTracker = {
            circleBeingMoved: null,
            startingRadius: null,
            mostRecentMovementWasVolumeChange: false,
            nodeIfNotStoredInSequencerRow: null,
            lastRowSnappedTo: null,
            lastBeatSnappedTo: null,
            lastPositionSnappedTo: {
                x: null,
                y: null,
            },
            currentRowNodeIsStoredIn: null,
            currentBeatNodeIsStoredAt: null,
            throwNoteAway: false,
        }

        this.rowSelectionTracker = { // todo: rename this to make it more clear that this variable is only for row movement, not all types of selection. not refactoring yet to keep diff clean.
            selectedRowIndex: null,
            shapes: [],
            shapesOriginalPositions: [], // this is going to be such a weird way of doing this..
            rowHandleStartingPosition: {
                x: null,
                y: null,
            },
            noteCircles: [],
            noteCirclesStartingRadiuses: [],
            domElements: [],
            domElementsOriginalPositions: [],
            removeRow: false,
        }

        this.rowVolumeAdjustmentTracker = {
            selectedRowIndex: null,
            noteCircles: [],
            noteCirclesStartingRadiuses: [],
            rowHandleStartingPosition: {
                x: null,
                y: null,
            }
        }

        this.shiftToolTracker = {
            resourcesToShift: { // this object will keep track of which resources (out of notes, reference lines, and subdivision lines) should currently be moved by the shift tool.
                notes: false,
                subdivisionLines: false,
                referenceLines: false,
            },
            resourcesToShiftButtonStates: { // this object will keep track of which resource shift toggle buttons (out of notes, reference lines, and subdivision lines) are currently clicked.
                notes: false,
                subdivisionLines: false,
                referenceLines: false,
            },
            selectedRowIndex: null,
            noteCircles: [],
            noteCirclesStartingPositions: [],
            noteCirclesStartingBeats: [],
            referenceLinesStartingShiftInPixels: 0,
            referenceLinesStartingPositions: [],
            subdivisionLinesStartingShiftInPixels: 0,
            subdivisionLinesStartingPositions: [],
            mouseStartingPosition: {
                x: null,
                y: null,
            }
        }

        this.multiShiftTracker = {
            highlightedRow: null,
            withinRow: null, // you can be within a row without it actually being highlighted (such as when another tool is already being used)
            shiftNotes: false,
            shiftSubdivisionLines: false,
            shiftReferenceLines: false,
        }

        this.noteBankNoteVolumesTracker = {}
        this.initializeNoteBankVolumesTrackerValues()

        this.noteBankMidiNoteNumbersTracker = {}
        for (let sampleName of this.sampleNameList) {
            this.noteBankMidiNoteNumbersTracker[sampleName] = {
                midiNote: this.samples[sampleName].defaultMidiNote,
            }
        }

        this.tapTempoTracker = {
            maximumAmountOfTimeToWaitForNextTapTempoButtonClick: Util.convertBeatsPerMinuteToBeatLengthInMillis(this.getMinimumAllowedSequencerBeatsPerMinute()),
            absoluteTimeOfMostRecentTapTempoButtonClick: Number.MIN_SAFE_INTEGER,
        }

        // keep a list of all the circles (i.e. notes) that have been drawn on the screen
        this.allDrawnCircles = []

        this.initializeShiftToolToggleButtonEventListeners();
        this.initializeMidiOutputSelectorEventListeners();
        this.initializeDrumKitSelectorEventListeners();
        this.initializeExamplePatternSelectorEventListeners()
        this.initializeLoopLengthInMillisecondsTextInputEventListeners();
        this.initializeBeatsPerMinuteTextInputEventListeners();
        this.initializeNumberOfBeatsInLoopInputEventListeners();
        this.addPauseButtonEventListeners();
        this.addClearAllNotesButtonEventListeners();
        this.addTempoInputModeSelectionButtonsEventListeners();
        this.addTapTempoButtonEventListeners();
        this.refreshWindowMouseMoveEvent();
        this.refreshWindowMouseUpEvent();
        this.refreshWindowKeyDownEvent();
        this.refreshWindowResizeEvent();
        this.refreshWindowContextMenuEvent();
        this.initializeExportPatternToMidiFileButtonEventListener();
        this.addAllSequencerRowLineEventListeners();
        this.addAllSubdivisionLinesEventListeners();
        this.addAllReferenceLinesEventListeners();

        // initialize starting state of shift mode menu buttons (which ones should start out clicked)
        this.shiftModeMoveNotesClickHandler(this)
        this.adjustShiftToolMenuVisibility()

        // if there is a sequencer state included in the URL, load it. 
        if (window.location.hash !== "") { // window.location.hash is text in a URL after the actual address, which starts with a "#" character and can contain whatever text we want.
            // btoa(plaintext) converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using atob(base64).
            this.loadSequencerPatternFromBase64String(window.location.hash.substring(1)) // the url hash will start with a '#' character, so remove that before decoding it
        }

        this.pause(); // start the sequencer paused
        this.redrawSequencer(); // redraw the display

        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        this.mostRecentSavedUrlHash = window.location.hash.substring(1); // track the most recently saved URL hash (without its first character '#')

        if (!this.configurations.analyticsBar.show) {
            this.hideAnalyticsBar();
        }
        this.setAnalyticsBarToNoteMode()

        this.refreshTwoJsCanvasSize()
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
            let radiusToSetUnplayedCircleTo = circle.guiData.radiusWhenUnplayed
            if (this.circleSelectionTracker.circleBeingMoved !== null && this.circleSelectionTracker.circleBeingMoved.guiData.label === circle.guiData.label) {
                // if we are moving this circle, make its unplayed radius slightly bigger than normal
                radiusToSetUnplayedCircleTo = circle.guiData.radiusWhenUnplayed + this.configurations.notes.circleRadiusIncreaseWhenMovingNote;
            }
            let circleResizeRange = this.configurations.sequencer.width / 25
            if (this.sequencer.paused || circle.translation.x <= timeTrackingLinesXPosition - circleResizeRange || circle.translation.x >= timeTrackingLinesXPosition + circleResizeRange) {
                circle.radius = radiusToSetUnplayedCircleTo
            } else {
                circle.radius = radiusToSetUnplayedCircleTo + this.configurations.notes.circleRadiusIncreaseWhenPlayingNote;
            }
        }

        /**
         * This logic allows us to show buttons as being "pressed" for a short amount of time.
         * After we click a button, we set its "lastClickedTime" in the "lastButtonClickTimeTrackers" hash,
         * and we change the button's shape's background to a "clicked" color in its click listener. then in 
         * the logic below the button's background gets set back to "transparent" after the desired amount of 
         * time has elapsed. this lets us animate buttons to appear clicked, even if the action they perform
         * is done instantly after clicking.
         * we also only change the color back to 'transparent' if it is set to the 'clicked' color. that way
         * we can do all of this while still allowing for changing the button to other colors in different 
         * contexts, such as having a different color for when the mouse is hovering over a button but hasn't
         * clicked it yet.
         */
        for (let buttonName in this.lastButtonClickTimeTrackers) {
            let buttonClickTimeTracker = this.lastButtonClickTimeTrackers[buttonName]
            if (this.sequencer.currentTime - buttonClickTimeTracker.lastClickTime > this.configurations.buttonBehavior.showClicksForHowManyMilliseconds && buttonClickTimeTracker.shape.fill === this.configurations.buttonBehavior.clickedButtonColor) {
                buttonClickTimeTracker.shape.fill = "transparent"
            }
        }

        // this logic handles "resetting" the tap tempo button. if that button hasn't been clicked in a while, we will reset its 
        // state and "forget" the timestamp that it was clicked last. the amount of time to wait before resetting is determined
        // by what the minimum allowed beats-per-minute value is. there's no need to wait for longer than it's possible for a beat to last.
        if (this.sequencer.currentTime - this.tapTempoTracker.absoluteTimeOfMostRecentTapTempoButtonClick > this.tapTempoTracker.maximumAmountOfTimeToWaitForNextTapTempoButtonClick) {
            this.resetTapTempoButtonState();
        }

        this.two.update() // apply the visual update the GUI display by refreshing the two.js canvas

        // an explanation of how the 'mostRecentSavedUrlHash' tracking variable is used:
        // in Chrome browser, pressing the 'back' button causes the URL bar to change to its previous location hash value,
        // but it doesn't actually reload the page. if you manually press enter in the URL bar after pressing 'back', it
        // will cause the page to reload, and the updated URL hash to be read, but manually pressing enter is annoying, 
        // and normal websites don't require you to do that. to get around this, we want to automatically reload the page 
        // if we see a location hash value that doesn't match the last one we saved, to make it so that the browser forward 
        // and back buttons behave like they would on any normal website. 
        // by doing this we will be able to use the browser back and forward buttons as undo and redo buttons.
        let currentUrlHash = window.location.hash.substring(1); // first trim the '#' character from the start of the URL hash
        if (currentUrlHash !== this.mostRecentSavedUrlHash) { // if the URL hash has changed from what we last saved, load it
            if (currentUrlHash === "") { // if there's nothing serialized, use the default starting pattern
                currentUrlHash = this.configurations.sequencer.startingPatternBase64String;
            }
            this.loadSequencerPatternFromBase64String(currentUrlHash)
            this.components.domElements.selectors.examplePatterns.options[0].innerHTML = ""
            this.components.domElements.selectors.examplePatterns.options[0].selected = true;
        }
    }
    
    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects).
    // these are drawn in the order that they are layered on-screen, i.e. the bottom layer 
    // is drawn first.
    initializeGuiShapes() {
        let shapes = {};
        // sequencer border
        shapes.sequencerBorder = this.initializeSequencerBorder();
        // add shapes for menu outlines
        // loop length mode buttons outline
        shapes.loopLengthModeSelectionButtonsOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top, this.configurations.tempoInputModeSelectionBpmButton.left, this.configurations.tempoInputModeSelectionBpmButton.height, this.configurations.tempoInputModeSelectionBpmButton.width + (this.configurations.tempoInputModeSelectionMillisecondsButton.left - this.configurations.tempoInputModeSelectionBpmButton.left))
        shapes.loopLengthModeSelectionButtonsOutline.stroke = this.configurations.subdivisionLines.color;
        // tempo menu outline and title
        shapes.tempoMenuOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top - 5, this.configurations.tempoTextInputBpm.left - 5, 128, 300)
        shapes.tempoMenuOutline.stroke = "#bfbfbf"
        shapes.tempoLabelMenuTitle = this.initializeLabelText(this.configurations.tempoTextLabelMenuTitle.text, this.configurations.tempoTextLabelMenuTitle.left, this.configurations.tempoTextLabelMenuTitle.top, "left");
        shapes.tempoLabelMenuTitle.size = 25
        shapes.tempoLabelMenuTitle.fill = this.configurations.referenceLines.color
        shapes.tempoLabelMenuTitleTempoWord = this.initializeLabelText(this.configurations.tempoTextLabelMenuTitleTempoWord.text, this.configurations.tempoTextLabelMenuTitleTempoWord.left, this.configurations.tempoTextLabelMenuTitleTempoWord.top, "left"); // this is the word 'tempo' in the tempo menu title, so that we can change its color independently from the rest of the title
        shapes.tempoLabelMenuTitleTempoWord.size = 25
        shapes.tempoLabelMenuTitleTempoWord.fill = this.configurations.subdivisionLines.color
        shapes.tempoLabelMenuTitleTimeWord = this.initializeLabelText(this.configurations.tempoTextLabelMenuTitleTimeWord.text, this.configurations.tempoTextLabelMenuTitleTimeWord.left, this.configurations.tempoTextLabelMenuTitleTimeWord.top, "left"); // this is the word 'time' in the tempo menu title, so that we can change its color independently from the rest of the title
        shapes.tempoLabelMenuTitleTimeWord.size = 25
        shapes.tempoLabelMenuTitleTimeWord.fill = this.configurations.subdivisionLines.color
        // old (deprecated) shift tool menu
        shapes.shiftMenuOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top - 5, this.configurations.shiftModeLabelMenuTitle.left - 5, 128, 240) // use bpm button as a reference again to keep the top of all the menus aligned
        shapes.shiftMenuOutline.stroke = "#bfbfbf";
        shapes.shiftMenuTitle = this.initializeLabelText(this.configurations.shiftModeLabelMenuTitle.text, this.configurations.shiftModeLabelMenuTitle.left, this.configurations.shiftModeLabelMenuTitle.top, "left");
        shapes.shiftMenuTitle.size = 25
        shapes.shiftMenuTitle.fill = this.configurations.subdivisionLines.color
        shapes.shiftMenuMultiLineTexts = this.initializeMultiLineText(this.configurations.shiftModeLabelMenuExplanation.lines, this.configurations.shiftModeLabelMenuExplanation.left, this.configurations.shiftModeLabelMenuExplanation.top, 13, 15, this.configurations.subdivisionLines.color, "left")
        // output menu
        shapes.outputMenuTitle = this.initializeLabelText(this.configurations.outputMenuTitle.text, this.configurations.outputMenuTitle.left, this.configurations.outputMenuTitle.top, "left");
        shapes.outputMenuTitle.size = 25
        shapes.outputMenuTitle.fill = this.configurations.subdivisionLines.color
        shapes.outputMenuAudioLabel = this.initializeLabelText(this.configurations.outputMenuAudioLabel.text, this.configurations.outputMenuAudioLabel.left, this.configurations.outputMenuAudioLabel.top, "right");
        shapes.outputMenuAudioLabel.fill = this.configurations.subdivisionLines.color
        shapes.outputMenuAudioLabel.size = 18
        shapes.outputMenuMidiLabel = this.initializeLabelText(this.configurations.outputMenuMidiLabel.text, this.configurations.outputMenuMidiLabel.left, this.configurations.outputMenuMidiLabel.top, "right");
        shapes.outputMenuMidiLabel.fill = this.configurations.subdivisionLines.color
        shapes.outputMenuMidiLabel.size = 18
        shapes.outputMenuOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top - 5, this.configurations.outputMenuTitle.left - 5, 128, 320) // use bpm button as a reference again to keep the top of all the menus aligned
        shapes.outputMenuOutline.stroke = "#bfbfbf";
        // 'example patterns' menu
        shapes.examplePatternsMenuTitle = this.initializeLabelText(this.configurations.examplePatternsMenuTitle.text, this.configurations.examplePatternsMenuTitle.left, this.configurations.examplePatternsMenuTitle.top, "left");
        shapes.examplePatternsMenuTitle.size = 25
        shapes.examplePatternsMenuTitle.fill = this.configurations.subdivisionLines.color
        shapes.examplePatternsMenuOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top - 5, this.configurations.examplePatternsMenuTitle.left - 5, 128, 190) // use bpm button as a reference again to keep the top of all the menus aligned
        shapes.examplePatternsMenuOutline.stroke = "#bfbfbf";
        this.initializeMultiLineText(this.configurations.examplePatternMenuExplanation.lines, this.configurations.examplePatternMenuExplanation.left, this.configurations.examplePatternMenuExplanation.top, 13, 15, this.configurations.subdivisionLines.color, "left") // i'm not saving these shapes anywhere right now, since they never change after being initiailized
        // add button and sequencer shapes etc.
        shapes.sequencerRowHighlightLines = this.initializeAllSequencerRowHighlightLines();
        shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        shapes.referenceHighlightLineLists = this.initializeAllReferenceHighlightLines()
        shapes.subdivisionHighlightLineLists = this.initializeAllSubdivisionHighlightLines();
        shapes.referenceLineLists = this.initializeAllReferenceLines() // list of lists, storing 'reference' lines for each sequencer row (one list of reference lines per row)
        shapes.sequencerRowLines = this.initializeAllSequencerRowLines() // list of sequencer row lines
        shapes.subdivisionLineLists = this.initializeAllSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
        shapes.timeTrackingLines = this.initializeTimeTrackingLines() // list of lines that move to represent the current time within the loop
        shapes.noteBankContainer = this.initializeNoteBankContainer() // a rectangle that goes around the note bank
        shapes.noteTrashBinContainer = this.initializeNoteTrashBinContainer() // a rectangle that acts as a trash can for deleting notes
        shapes.pauseButtonShape = this.initializeRectangleShape(this.configurations.pauseButton.top, this.configurations.pauseButton.left, this.configurations.pauseButton.height, this.configurations.pauseButton.width) // a rectangle that will act as the pause button
        shapes.clearAllNotesButtonShape = this.initializeRectangleShape(this.configurations.clearAllNotesButton.top, this.configurations.clearAllNotesButton.left, this.configurations.clearAllNotesButton.height, this.configurations.clearAllNotesButton.width) // a rectangle that will act as the button for clearing all notes on the sequencer
        shapes.addRowButtonShape = this.initializeRectangleShape(this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * (this.sequencer.rows.length - 1)) + this.configurations.addRowButton.topPadding, this.configurations.addRowButton.left, this.configurations.addRowButton.height, this.configurations.addRowButton.width) // clicking this button will add a new empty row to the sequencer
        shapes.clearNotesForRowButtonShapes = this.initializeButtonPerSequencerRow(this.configurations.clearRowButtons.topPaddingPerRow, this.configurations.clearRowButtons.leftPaddingPerRow, this.configurations.clearRowButtons.height, this.configurations.clearRowButtons.width) // this is a list of button rectangles, one per row, to clear the notes on that row
        shapes.sequencerRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.sequencerRowHandles.leftPadding, this.configurations.sequencerRowHandles.topPadding, this.configurations.sequencerRowHandles.radius, this.configurations.sequencerRowHandles.unselectedColor)
        shapes.volumeAdjusterRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.volumeAdjusterRowHandles.leftPadding, this.configurations.volumeAdjusterRowHandles.topPadding, this.configurations.volumeAdjusterRowHandles.radius, this.configurations.volumeAdjusterRowHandles.unselectedColor)
        shapes.shiftToolRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.shiftToolRowHandles.leftPadding, this.configurations.shiftToolRowHandles.topPadding, this.configurations.shiftToolRowHandles.radius, this.configurations.shiftToolRowHandles.unselectedColor)
        shapes.tempoInputModeSelectionBpmButton = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top, this.configurations.tempoInputModeSelectionBpmButton.left, this.configurations.tempoInputModeSelectionBpmButton.height, this.configurations.tempoInputModeSelectionBpmButton.width) // button for toggling between different modes of inputting tempo. this one is to select 'beats per minute' input mode.
        shapes.tempoInputModeSelectionMillisecondsButton = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionMillisecondsButton.top, this.configurations.tempoInputModeSelectionMillisecondsButton.left, this.configurations.tempoInputModeSelectionMillisecondsButton.height, this.configurations.tempoInputModeSelectionMillisecondsButton.width) // button for toggling between different modes of inputting tempo. this one is to select 'loop length in milliseconds' input mode.
        shapes.tapTempoButton = this.initializeRectangleShape(this.configurations.tapTempoButton.top, this.configurations.tapTempoButton.left, this.configurations.tapTempoButton.height, this.configurations.tapTempoButton.width)
        shapes.tempoLabelBeats = this.initializeLabelText(this.configurations.tempoTextLabelBeats.text, this.configurations.tempoTextLabelBeats.left, this.configurations.tempoTextLabelBeats.top, "left");
        shapes.tempoLabelBeatsPerMinute = this.initializeLabelText(this.configurations.tempoTextLabelBeatsPerMinute.text, this.configurations.tempoTextLabelBeatsPerMinute.left, this.configurations.tempoTextLabelBeatsPerMinute.top, "left");
        shapes.tempoLabelMilliseconds = this.initializeLabelText(this.configurations.tempoTextLabelMilliseconds.text, this.configurations.tempoTextLabelMilliseconds.left, this.configurations.tempoTextLabelMilliseconds.top, "left");
        shapes.shiftModeMoveNotesButton = this.initializeRectangleShape(this.configurations.shiftModeMoveNotesButton.top, this.configurations.shiftModeMoveNotesButton.left, this.configurations.shiftModeMoveNotesButton.height, this.configurations.shiftModeMoveNotesButton.width)
        shapes.shiftModeMoveSubdivisionLinesButton = this.initializeRectangleShape(this.configurations.shiftModeMoveSubdivisionLinesButton.top, this.configurations.shiftModeMoveSubdivisionLinesButton.left, this.configurations.shiftModeMoveSubdivisionLinesButton.height, this.configurations.shiftModeMoveSubdivisionLinesButton.width)
        shapes.shiftModeMoveReferenceLinesButton = this.initializeRectangleShape(this.configurations.shiftModeMoveReferenceLinesButton.top, this.configurations.shiftModeMoveReferenceLinesButton.left, this.configurations.shiftModeMoveReferenceLinesButton.height, this.configurations.shiftModeMoveReferenceLinesButton.width)
        shapes.shiftModeResetSubdivisionLinesButtons = this.initializeButtonPerSequencerRow(this.configurations.shiftModeResetSubdivisionLinesForRowButtons.topPaddingPerRow, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.leftPaddingPerRow, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.height, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.width) // this is a list of button rectangles, one per row, to reset 'shift' of subdivision lines for each row
        shapes.shiftModeResetReferenceLinesButtons = this.initializeButtonPerSequencerRow(this.configurations.shiftModeResetReferenceLinesForRowButtons.topPaddingPerRow, this.configurations.shiftModeResetReferenceLinesForRowButtons.leftPaddingPerRow, this.configurations.shiftModeResetReferenceLinesForRowButtons.height, this.configurations.shiftModeResetReferenceLinesForRowButtons.width) // this is a list of button rectangles, one per row, to reset 'shift' of reference lines for each row
        shapes.exportPatternToMidiFileButton = this.initializeRectangleShape(this.configurations.exportPatternToMidiFileButton.top, this.configurations.exportPatternToMidiFileButton.left, this.configurations.exportPatternToMidiFileButton.height, this.configurations.exportPatternToMidiFileButton.width) // clicking this button will download a MIDI file containing the sequencer pattern
        shapes.toggleQuantizationButtonsRectangles = this.initializeButtonPerSequencerRow(this.configurations.quantizationButtons.topPaddingPerRow, this.configurations.quantizationButtons.leftPaddingPerRow, this.configurations.quantizationButtons.height, this.configurations.quantizationButtons.width) // this is a list of button rectangles, one per row, to toggle whether each row's notes should be snapped to subdivision lines (quantized) or not
        this.two.update(); // this initial 'update' creates SVG '_renderer' properties for our shapes that we can add event listeners to, so it needs to go here
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
                tempoTextInputBpm: document.getElementById('tempo-text-inputs-bpm'),
                tempoTextInputMillis: document.getElementById('tempo-text-inputs-milliseconds'),
                tempoTextInputBeatsPerLoop: document.getElementById('tempo-text-inputs-beats-per-loop'),
                subdivisionTextInputs: document.getElementById('subdivision-text-inputs'),
                midiOutputSelector: document.getElementById('midi-output-selector-div'),
                drumkitSelector: document.getElementById('drum-kit-selector-div'),
                examplePatternSelector: document.getElementById('example-pattern-selector-div'),
                newIcons: document.getElementById('new-icons'),
                bottomBar: document.getElementById('bottom-bar'),
                bottomBarText: document.getElementById('bottom-bar-text-div'),
                analyticsBar: document.getElementById('analytics-bar'),
                analyticsBarNoteModeText: document.getElementById('analytics-bar-notes-mode-text-div'),
                analyticsBarLinesModeText: document.getElementById('analytics-bar-lines-mode-text-div'),

            },
            textInputs: {
                loopLengthMillis: document.getElementById('text-input-loop-length-millis'),
                loopLengthBpm: document.getElementById('text-input-loop-length-bpm'),
                numberOfBeatsInLoop: document.getElementById('text-input-number-of-beats-in-loop'),
                subdivisionTextInputs: [],
                referenceLineTextInputs: [],
            },
            images: {
                pauseIcon: document.getElementById('pause-icon'),
                playIcon: document.getElementById('play-icon'),
                clearAllIcon: document.getElementById('clear-all-icon'),
                trashClosedIcon: document.getElementById('trash-closed-icon'),
                trashOpenIcon: document.getElementById('trash-open-icon'),
                addIcon: document.getElementById('add-icon'),
                clearRowIcon: document.getElementById('clear-row-icon'),
                lockedIcon: document.getElementById('locked-icon'),
                unlockedIcon: document.getElementById('unlocked-icon'),
                bpmLoopLengthModeIcon: document.getElementById('loop-length-bpm-mode-icon'),
                millisecondsLoopLengthModeIcon: document.getElementById('loop-length-milliseconds-mode-icon'), 
                tapTempoIcon: document.getElementById('tap-tempo-icon'),
                resetSubdvisionsLinesShiftForRowIcon: document.getElementById('reset-subdivision-lines-shift-for-row-icon'),
                resetReferenceLinesShiftForRowIcon: document.getElementById('reset-reference-lines-shift-for-row-icon'),
                exportPatternAsMidiFileIcon: document.getElementById('save-pattern-as-midi-file-icon'),
                activateShiftNotesIcon: document.getElementById('shift-notes-icon'),
                activateShiftSubdivisionLinesIcon: document.getElementById('shift-subdivision-lines-icon'),
                activateShiftReferenceLinesIcon: document.getElementById('shift-reference-lines-icon'),
                shiftRowIcon: document.getElementById('shift-row-icon'),
                moveRowIcon: document.getElementById('move-row-icon'),
                changeRowVolumesIcon: document.getElementById('change-row-volumes-icon'),
            },
            iconLists: {
                clearRowIcons: [], // list of icons for "clear row" buttons, one per sequencer row
                lockedIcons: [], // list of icons for "quantize row" buttons, one per sequencer row
                unlockedIcons: [], // list of icons for "unquantize row" buttons, one per sequencer row
                resetSubdivisionLinesShiftIcons: [],  // list of icons for the button to reset subdivision lines shift, one per sequencer row
                resetReferenceLinesShiftIcons: [],  // list of icons for the button to reset reference lines shift, one per sequencer row
                shiftRowIcons: [], // list of icons for the button to use the 'shift' tool on each row (one per sequencer row)
                moveRowIcons: [], // list of icons for the button to move (rearrange) rows (one per sequencer row)
                changeRowVolumesIcons: [], // list of icons for the button to change all note volumes a each row (one per sequencer row)
            },
            selectors: {
                midiOutput: document.getElementById('midi-output-selector'),
                drumkit: document.getElementById('drum-kit-selector'),
                examplePatterns: document.getElementById('example-pattern-selector'),
            },
            text: {
                // analytics bar note mode text
                analyticsBarNoteModeBeatNumber: document.getElementById('analytics-beat-number-text'),
                analyticsBarNoteModeReferenceLineNumber: document.getElementById('analytics-reference-line-number-text'),
                analyticsBarNoteModeVolume: document.getElementById('analytics-volume-text'),
                analyticsBarNoteModeDistanceFromBeatsPercent: document.getElementById('analytics-distance-from-beats-percent-text'),
                analyticsBarNoteModeDistanceFromBeatsMilliseconds: document.getElementById('analytics-distance-from-beats-milliseconds-text'),
                analyticsBarNoteModeDistanceFromReferenceLinesPercent: document.getElementById('analytics-distance-from-reference-lines-percent-text'),
                analyticsBarNoteModeDistanceFromReferenceLinesMilliseconds: document.getElementById('analytics-distance-from-reference-lines-milliseconds-text'),
                // analytics bar lines mode text
                analyticsBarLinesModeBeatShiftPercent: document.getElementById('analytics-beat-shift-text-percent'),
                analyticsBarLinesModeBeatShiftMilliseconds: document.getElementById('analytics-beat-shift-text-milliseconds'),
                analyticsBarLinesModeBeatShiftWithinReferenceLinesPercent: document.getElementById('analytics-beat-shift-within-reference-lines-text-percent'),
                analyticsBarLinesModeBeatShiftWithinReferenceLinesMilliseconds: document.getElementById('analytics-beat-shift-within-reference-lines-text-milliseconds'),
                analyticsBarLinesModeReferenceLineShiftPercent: document.getElementById('analytics-reference-line-shift-text-percent'),
                analyticsBarLinesModeReferenceLineShiftMilliseconds: document.getElementById('analytics-reference-line-shift-text-milliseconds'),
                analyticsBarLinesModeReferenceLineShiftWithinBeatLinesPercent: document.getElementById('analytics-reference-lines-shift-within-beat-lines-text-percent'),
                analyticsBarLinesModeReferenceLineShiftWithinBeatLinesMilliseconds: document.getElementById('analytics-reference-lines-shift-within-beat-lines-text-milliseconds'),
            }
        }
        return domElements;
    }

    // this is for hiding the old (deprecated) shift tool menu. the menu is hidden by default, since it
    // was replaced with a better user experience. i am leaving it in the code in case it ends up being
    // useful later, but it needs to be manually shown by editing a property in the GUI configurations.
    adjustShiftToolMenuVisibility() {
        if (!this.configurations.advancedShiftToolMenu.show) {
            this.components.shapes.shiftMenuOutline.stroke = 'transparent'
            this.components.shapes.shiftMenuTitle.fill = 'transparent'
            for (let text of this.components.shapes.shiftMenuMultiLineTexts) {
                text.fill = 'transparent'
            }
            // shift notes button
            this.components.shapes.shiftModeMoveNotesButton.guiData.respondToEvents = false;
            this.components.shapes.shiftModeMoveNotesButton.fill = 'transparent';
            this.components.shapes.shiftModeMoveNotesButton.stroke = 'transparent'
            this.components.domElements.images.activateShiftNotesIcon.respondToEvents = false;
            this.components.domElements.images.activateShiftNotesIcon.style.display = 'none'
            // shift subdivision lines button
            this.components.shapes.shiftModeMoveSubdivisionLinesButton.guiData.respondToEvents = false;
            this.components.shapes.shiftModeMoveSubdivisionLinesButton.fill = 'transparent';
            this.components.shapes.shiftModeMoveSubdivisionLinesButton.stroke = 'transparent'
            this.components.domElements.images.activateShiftSubdivisionLinesIcon.respondToEvents = false;
            this.components.domElements.images.activateShiftSubdivisionLinesIcon.style.display = 'none'
            // shift reference lines button
            this.components.shapes.shiftModeMoveReferenceLinesButton.guiData.respondToEvents = false;
            this.components.shapes.shiftModeMoveReferenceLinesButton.fill = 'transparent';
            this.components.shapes.shiftModeMoveReferenceLinesButton.stroke = 'transparent'
            this.components.domElements.images.activateShiftReferenceLinesIcon.respondToEvents = false;
            this.components.domElements.images.activateShiftReferenceLinesIcon.style.display = 'none'
            // switch 'shift row' and 'shift notes' icons
            this.components.domElements.images.shiftRowIcon = this.components.domElements.images.activateShiftNotesIcon
            this.components.domElements.images.shiftRowIcon.title = "Shift all notes"
        }
    }

    // initialize a hash that is used to keep track of the last time each button was clicked. for each button it cares about, 
    // it stores the last click time of that button, and which shapes are considered part of that button (these may undergo
    // some change when they are recently clicked, such as giving the button's main shape a darker background).
    initializeLastButtonClickTimeTrackers() {
        /**
         * keep track of when each button was last clicked, so we can make the button darker for a little while after clicking it.
         * we also keep track of when each button was clicked for buttons that are generated one-per-row, but those are initialized
         * within the relevant event listenever methods, not here. same for a few other of these trackers. 
         */
        let lastButtonClickTimeTrackers = {
            pause: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.pauseButtonShape,
            },
            clearAllNotes: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.clearAllNotesButtonShape,
            },
            addRow: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.addRowButtonShape,
            },
            tapTempo: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.tapTempoButton,
            },
            exportPatternToMidiFile: {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.exportPatternToMidiFileButton,
            },
        }
        return lastButtonClickTimeTrackers;
    }

    refreshWindowKeyDownEvent() {
        let eventHandlersHash = {
            "keydown": (event) => {
                if (event.key === " ") { // hitting the space bar should pause or unpause the sequencer
                    event.preventDefault();
                    let audioContextIsRunning = this.sequencer.audioDrivers[0].webAudioContext.state === "running"
                    if (audioContextIsRunning) {
                        this.pauseButtonClickHandler(this);
                    }
                }
                // handle key presses for multi-shift tool
                if (event.ctrlKey) {
                    this.multiShiftTracker.shiftSubdivisionLines = true;
                }
                if (event.altKey) {
                    this.multiShiftTracker.shiftNotes = true;
                }
                if (event.metaKey) {
                    this.multiShiftTracker.shiftReferenceLines = true;
                }
                if (this.multiShiftTracker.highlightedRow !== null && this.shiftToolTracker.selectedRowIndex === null) {
                    this.multiShiftTracker.shiftNotes = this.multiShiftTracker.shiftNotes || (this.multiShiftTracker.shiftSubdivisionLines && this.sequencer.rows[this.multiShiftTracker.highlightedRow].quantized)
                    this.shiftToolTracker.resourcesToShift.notes = this.multiShiftTracker.shiftNotes
                    this.shiftToolTracker.resourcesToShift.subdivisionLines = this.multiShiftTracker.shiftSubdivisionLines
                    this.shiftToolTracker.resourcesToShift.referenceLines = this.multiShiftTracker.shiftReferenceLines
                    this.unhighlightAllShiftableObjects(this.multiShiftTracker.highlightedRow)
                    this.initializeShiftToolHoverVisualsAndVariables(this.multiShiftTracker.highlightedRow, this.multiShiftTracker.shiftNotes, this.multiShiftTracker.shiftSubdivisionLines, this.multiShiftTracker.shiftReferenceLines, true)
                }
            },
            "keyup": (event) => {
                // handle key ups for multi-shift tool
                if (!event.ctrlKey) {
                    this.multiShiftTracker.shiftSubdivisionLines = false;
                }
                if (!event.altKey) {
                    this.multiShiftTracker.shiftNotes = false;
                }
                if (!event.metaKey) {
                    this.multiShiftTracker.shiftReferenceLines = false;
                }
                if (this.multiShiftTracker.highlightedRow !== null && this.shiftToolTracker.selectedRowIndex === null) {
                    this.multiShiftTracker.shiftNotes = this.multiShiftTracker.shiftNotes || (this.multiShiftTracker.shiftSubdivisionLines && this.sequencer.rows[this.multiShiftTracker.highlightedRow].quantized)
                    this.shiftToolTracker.resourcesToShift.notes = this.multiShiftTracker.shiftNotes
                    this.shiftToolTracker.resourcesToShift.subdivisionLines = this.multiShiftTracker.shiftSubdivisionLines
                    this.shiftToolTracker.resourcesToShift.referenceLines = this.multiShiftTracker.shiftReferenceLines
                    this.unhighlightAllShiftableObjects(this.multiShiftTracker.highlightedRow)
                    this.initializeShiftToolHoverVisualsAndVariables(this.multiShiftTracker.highlightedRow, this.multiShiftTracker.shiftNotes, this.multiShiftTracker.shiftSubdivisionLines, this.multiShiftTracker.shiftReferenceLines, true)
                }
            }
        }
        this.addEventListenersWithoutDuplicates("keydown", [window], eventHandlersHash)
    }

    refreshWindowResizeEvent() {
        let eventHandlersHash = {
            "resize": (event) => {
                this.refreshTwoJsCanvasSize();
            },
        }
        this.addEventListenersWithoutDuplicates("resize", [window], eventHandlersHash)
    }

    refreshWindowContextMenuEvent() {
        let eventHandlersHash = {
            "contextmenu": (event) => { event.preventDefault() }
        }
        this.addEventListenersWithoutDuplicates("contextmenu", [window], eventHandlersHash)
    }

    initializeSequencerBorder() {
        let top = this.configurations.sequencer.top + this.configurations.sequencerRowSelections.topPadding
        let left = this.configurations.sequencer.left + this.configurations.sequencerRowSelections.leftPadding
        let width = this.configurations.sequencer.width + this.configurations.sequencerRowSelections.width
        let height = this.configurations.sequencerRowSelections.height * this.sequencer.numberOfRows
        let shape = this.initializeRectangleShape(top, left, height, width);
        shape.stroke = 'transparent';
        return shape;
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

    // todo: clean this up a bit once we're sure we want to keep separate row handles for 'move rows' and 'change row volumes'
    initializeRowMovementVariablesAndVisuals(rowIndex) {
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.moveRow
        this.setNoteTrashBinVisibility(true);
        this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
        // save relevant info about whichever row is selected
        this.rowSelectionTracker.selectedRowIndex = rowIndex;
        this.rowSelectionTracker.removeRow = false // start this out false until we move the row around (i.e. into the trash bin)
        // save a list, of all the shapes that are associated with the selected row.
        // we are saving this list so that we can move them all as we move the row around.
        this.rowSelectionTracker.shapes = [];
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.rowSelectionTracker.shapes.push(circle)
            }
        }
        this.rowSelectionTracker.shapes.push(...this.components.shapes.subdivisionLineLists[rowIndex])
        this.rowSelectionTracker.shapes.push(...this.components.shapes.subdivisionHighlightLineLists[rowIndex])
        this.rowSelectionTracker.shapes.push(...this.components.shapes.referenceLineLists[rowIndex])
        this.rowSelectionTracker.shapes.push(...this.components.shapes.referenceHighlightLineLists[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.sequencerRowLines[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.sequencerRowHighlightLines[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.sequencerRowSelectionRectangles[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.clearNotesForRowButtonShapes[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.volumeAdjusterRowHandles[rowIndex])
        if (this.components.shapes.shiftToolRowHandles[rowIndex] !== null && this.components.shapes.shiftToolRowHandles[rowIndex] !== undefined) {
            this.rowSelectionTracker.shapes.push(this.components.shapes.shiftToolRowHandles[rowIndex]);
        }
        this.rowSelectionTracker.shapes.push(this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex]);
        // this part gets a little weird. save a list of all of the starting positions of each
        // shape that is being moved. that way we can translate them proporionally to how far
        // the row handle has moved.
        this.rowSelectionTracker.shapesOriginalPositions = []
        for (let shape of this.rowSelectionTracker.shapes) {
            this.rowSelectionTracker.shapesOriginalPositions.push({
                x: shape.translation.x,
                y: shape.translation.y,
            });
        }
        this.rowSelectionTracker.rowHandleStartingPosition.x = this.components.shapes.sequencerRowHandles[rowIndex].translation.x
        this.rowSelectionTracker.rowHandleStartingPosition.y = this.components.shapes.sequencerRowHandles[rowIndex].translation.y
        // do the exact same thing for dom elements (subdivision and reference line text inputs, quantization checkbox, images) next
        this.rowSelectionTracker.domElements = [];
        this.rowSelectionTracker.domElements.push(this.components.domElements.textInputs.subdivisionTextInputs[rowIndex])
        this.rowSelectionTracker.domElements.push(this.components.domElements.textInputs.referenceLineTextInputs[rowIndex])
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.lockedIcons[rowIndex]);
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.unlockedIcons[rowIndex]);
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.clearRowIcons[rowIndex]);
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons[rowIndex]);
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.resetReferenceLinesShiftIcons[rowIndex]);
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.moveRowIcons[rowIndex]);
        if (this.components.domElements.iconLists.shiftRowIcons[rowIndex] !== null && this.components.domElements.iconLists.shiftRowIcons[rowIndex] !== undefined) {
            this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.shiftRowIcons[rowIndex]);
        }
        this.rowSelectionTracker.domElements.push(this.components.domElements.iconLists.changeRowVolumesIcons[rowIndex]);
        this.rowSelectionTracker.domElementsOriginalPositions = [];
        for (let domElement of this.rowSelectionTracker.domElements) {
            this.rowSelectionTracker.domElementsOriginalPositions.push({
                left: parseInt(domElement.style.left.slice(0, -2)), // cut off "px" from the position and convert it to an integer
                top: parseInt(domElement.style.top.slice(0, -2)),
            });
        }
        // update visuals
        let circle = this.components.shapes.sequencerRowHandles[rowIndex]
        circle.fill = this.configurations.sequencerRowHandles.selectedColor
        circle.stroke = this.configurations.subdivisionLines.color
        let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex];
        rowSelectionRectangle.stroke = this.configurations.sequencerRowHandles.selectedColor
    }

    initializeRowVolumeAdjustmentHoverVariablesAndVisuals(rowIndex) {
        this.rowVolumeAdjustmentTracker.noteCircles = [];
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.rowVolumeAdjustmentTracker.noteCircles.push(circle)
                circle.stroke = 'black'
                circle.linewidth = 2
            }
        }
    }

    initializeRowVolumeAdjustmentVariablesAndVisuals(rowIndex) {
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.changeRowVolume
        // save relevant info about whichever row is selected
        this.rowVolumeAdjustmentTracker.selectedRowIndex = rowIndex;
        // save a list of all the note circles that are associated with the selected row. we are saving this list so that we can 
        // perform operations on all the notes in a row if we want to (such as changing all of their volumes at the same time).
        // also track the starting radius of each circle on the row. this will also be used in adjusting note volumes for the row.
        this.rowVolumeAdjustmentTracker.noteCirclesStartingRadiuses = [];
        for (let circle of this.rowVolumeAdjustmentTracker.noteCircles) {
            this.rowVolumeAdjustmentTracker.noteCirclesStartingRadiuses.push(circle.guiData.radiusWhenUnplayed)
        }
        this.rowVolumeAdjustmentTracker.rowHandleStartingPosition.x = this.components.shapes.volumeAdjusterRowHandles[rowIndex].translation.x
        this.rowVolumeAdjustmentTracker.rowHandleStartingPosition.y = this.components.shapes.volumeAdjusterRowHandles[rowIndex].translation.y
        // update visuals
        let circle = this.components.shapes.volumeAdjusterRowHandles[rowIndex]
        circle.fill = this.configurations.volumeAdjusterRowHandles.selectedColor
        circle.stroke = this.configurations.subdivisionLines.color
        let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex];
        rowSelectionRectangle.stroke = this.configurations.sequencerRowHandles.selectedColor
    }

    unhighlightNoteCirclesForRowVolumeAdjustment() {
        for (let circle of this.rowVolumeAdjustmentTracker.noteCircles) {
            circle.stroke = 'transparent'
        }
    }

    // when we hover over a shiftable object, we should highlight it as necessary,
    // and also store and variables we will need to track if it gets clicked.
    initializeShiftToolHoverVisualsAndVariables(rowIndex, highlightNotes, highlightSubdivisionLines, highlightReferenceLines, highlightSequencerRowLine=false) {
        this.shiftToolTracker.highlightedRowIndex = rowIndex;
        this.shiftToolTracker.noteCircles = [];
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.shiftToolTracker.noteCircles.push(circle)
                if (highlightNotes) {
                    circle.stroke = 'black';
                    circle.linewidth = 2;
                }
            }
        }
        // reference lines
        if (highlightReferenceLines) {
            for (let shape of this.components.shapes.referenceHighlightLineLists[rowIndex]) {
                shape.stroke = this.configurations.referenceHighlightLines.color
            }   
        }
        // subdivision lines
        if (highlightSubdivisionLines) {
            for (let shape of this.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
                shape.stroke = this.configurations.subdivisionHighlightLines.color
            }
        }
        // sequener row line
        if (highlightSequencerRowLine) {
            if (highlightNotes && (highlightReferenceLines || highlightSubdivisionLines)) {
                // this will be used for the multi-shift tool: when you mouse over a sequencer row line, you will have the option
                // to shift any combination of resources at the same time, by holding down different keys (alt, ctrl, and shift).
                this.components.shapes.sequencerRowHighlightLines[rowIndex].stroke = this.configurations.sequencerRowHighlightLines.color
                this.components.shapes.sequencerRowHighlightLines[rowIndex].linewidth = this.configurations.sequencerRowHighlightLines.lineWidth
            } else {
                this.components.shapes.sequencerRowHighlightLines[rowIndex].stroke = this.configurations.sequencerRowHighlightLines.hoverColor
                this.components.shapes.sequencerRowHighlightLines[rowIndex].linewidth = this.configurations.sequencerRowHighlightLines.hoverLineWidth;
            }
        }
        // adjust analytics bar text
        this.setAnalyticsBarToLinesMode()
        this.setAnalyticsBarLinesModeBeatLineShiftText(this)
        this.setAnalyticsBarLinesModeReferenceLineShiftText(this)
    }

    initializeRowShiftToolVariablesAndVisuals(event, rowIndex, updateShiftRowButtonVisuals, shiftNotes, shiftSubdivisionLines, shiftReferenceLines) {
        this.shiftToolTracker.selectedRowIndex = rowIndex;
        this.shiftToolTracker.resourcesToShift.notes = shiftNotes;
        this.shiftToolTracker.resourcesToShift.subdivisionLines = shiftSubdivisionLines;
        this.shiftToolTracker.resourcesToShift.referenceLines = shiftReferenceLines;
        this.shiftToolTracker.updateShiftRowButtonVisuals = updateShiftRowButtonVisuals;
        // notes
        this.shiftToolTracker.noteCirclesStartingPositions = [];
        this.shiftToolTracker.noteCirclesStartingBeats = []
        for (let circle of this.shiftToolTracker.noteCircles) {
            this.shiftToolTracker.noteCirclesStartingPositions.push(circle.translation.x)
            this.shiftToolTracker.noteCirclesStartingBeats.push(circle.guiData.beat)
        }
        // reference lines
        this.shiftToolTracker.referenceLinesStartingPositions = [];
        for (let line of this.components.shapes.referenceLineLists[rowIndex]) {
            this.shiftToolTracker.referenceLinesStartingPositions.push(line.translation.x);
        }
        this.shiftToolTracker.referenceLinesStartingShiftInPixels = this.referenceLinesShiftInPixelsPerRow[rowIndex];
        // subdivision lines
        this.shiftToolTracker.subdivisionLinesStartingPositions = [];
        for (let line of this.components.shapes.subdivisionLineLists[rowIndex]) {
            this.shiftToolTracker.subdivisionLinesStartingPositions.push(line.translation.x);
        }
        this.shiftToolTracker.subdivisionLinesStartingShiftInPixels = this.subdivisionLinesShiftInPixelsPerRow[rowIndex];
        // row handle posisitions
        event = this.adjustEventCoordinates(event)
        this.shiftToolTracker.mouseStartingPosition.x = event.pageX
        this.shiftToolTracker.mouseStartingPosition.y = event.pageY
        if (updateShiftRowButtonVisuals) {
            // update visuals
            let circle = this.components.shapes.shiftToolRowHandles[rowIndex]
            circle.fill = this.configurations.shiftToolRowHandles.selectedColor
            circle.stroke = this.configurations.subdivisionLines.color
            let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex];
            rowSelectionRectangle.stroke = this.configurations.shiftToolRowHandles.selectedColor
        }
    }

    unhighlightAllShiftableObjects(rowIndex) {
        for (let circle of this.shiftToolTracker.noteCircles) {
            circle.stroke = 'transparent'
        }
        for (let shape of this.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
            shape.stroke = 'transparent'
        }
        for (let shape of this.components.shapes.referenceHighlightLineLists[rowIndex]) {
            shape.stroke = 'transparent'
        }
        this.components.shapes.sequencerRowHighlightLines[rowIndex].stroke = 'transparent'
    }

    /**
     * sequencer row reference lines
     */

    // update a tracker that stores how much each row's reference lines are shifted in pixels.
    // we should call this when we open the page, when we load a sequencer from a URL, etc.
    initializeReferenceLinesShiftPixelsTracker() {
        this.referenceLinesShiftInPixelsPerRow = []
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            // convert shift in millis to pixels
            let shiftInMillis = this.sequencer.rows[rowIndex].getReferenceLineShiftInMilliseconds();
            let shiftAsPercentageOfFullLoop = shiftInMillis / this.sequencer.loopLengthInMillis;
            let shiftInPixels = shiftAsPercentageOfFullLoop * this.configurations.sequencer.width;
            // store shift in pixels to a tracker object for quick access elsewhere
            this.referenceLinesShiftInPixelsPerRow.push(shiftInPixels);
        }
    }

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
            referenceLinesForRow = this.initializeReferenceLinesForRow(rowsDrawn, this.configurations.referenceLines.height, this.configurations.sequencer.lineWidth, this.configurations.referenceLines.color)
            allReferenceLineLists.push(referenceLinesForRow) // keep a list of all rows' reference line lists
        }
        return allReferenceLineLists
    }

    initializeReferenceLinesForRow(rowIndex, height, linewidth, color, topOffset=0) {
        let shiftInPixelsForRow = this.referenceLinesShiftInPixelsPerRow[rowIndex];
        let linesForRow = []
        if (this.sequencer.rows[rowIndex].getNumberOfReferenceLines() <= 0) {
            return [] // don't draw reference lines for this row if it has 0 or fewer
        }
        let xIncrementBetweenLines = this.configurations.sequencer.width / this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
        for (let linesDrawnForRow = 0; linesDrawnForRow < this.sequencer.rows[rowIndex].getNumberOfReferenceLines(); linesDrawnForRow++) {
            let trialAndErrorAlignmentOffset = .5 // looks like Two.js graphics library draws shapes on .5 boundaries, so if we don't add a .5 offset here, things won't line up quite right
            let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + (this.configurations.sequencer.lineWidth / 2) + trialAndErrorAlignmentOffset
            let halfOfLineWidth = Math.floor(linewidth / 2)
            // calculate the x position of this row line. incorporate the 'reference line shift' value for the row.
            let lineXPosition = (xIncrementBetweenLines * linesDrawnForRow); // start with basic reference line position based on width of each beat and which beat we're on
            lineXPosition += shiftInPixelsForRow // add offset to account for 'shift' tool changes made to reference lines for row
            if (lineXPosition < 0) { // if the x position of the reference line is past the left edge of the sequencer, wrap it to the other side
                lineXPosition = this.configurations.sequencer.width + lineXPosition
            } else { // if the x position of the reference line is past the right edge of the sequencer, wrap it to the other side
                lineXPosition = lineXPosition % this.configurations.sequencer.width
            }
            lineXPosition += this.configurations.sequencer.left // move the reference line position to account for the left position of the whole sequencer
            // draw the actual line
            let lineStart = {
                x: lineXPosition,
                y: sequencerLineCenterY - halfOfLineWidth + topOffset // make sure to account for 'line width' when trying to make these lines reach the top of the sequencer line. that's why we subtract the value here
            }
            let lineEnd = {
                x: lineStart.x,
                y: sequencerLineCenterY - height + topOffset
            }
            let referenceLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, linewidth, color);
            linesForRow.push(referenceLine) // keep a list of all reference lines for the current row
        }
        return linesForRow
    }

    /**
     * reference highlight lines
     */

    removeReferenceHighlightLinesForRow(rowIndex) {
        for (let line of this.components.shapes.referenceHighlightLineLists[rowIndex]) {
            line.remove()
        }
        this.components.shapes.referenceHighlightLineLists[rowIndex] = []
    }

    initializeAllReferenceHighlightLines() {
        let allReferenceHighlightLineLists = []
        let referenceHighlightLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            referenceHighlightLinesForRow = this.initializeReferenceLinesForRow(rowsDrawn, this.configurations.referenceHighlightLines.height, this.configurations.referenceHighlightLines.lineWidth, 'transparent', this.configurations.referenceHighlightLines.topOffset)
            allReferenceHighlightLineLists.push(referenceHighlightLinesForRow) // keep a list of all rows' reference line lists
        }
        return allReferenceHighlightLineLists
    }

    /**
     * reference line and reference highlight line event listeners
     */

    addAllReferenceLinesEventListeners(){
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++){
            this.addReferenceLinesEventListenersForRow(rowIndex);
        }
    }

    addReferenceLinesEventListenersForRow(rowIndex) {
        if (!this.configurations.generalShiftToolSettings.allowEasyReferenceLinesShift) {
            return; // give an option to dis-allow the simple click-drag way of shifting reference lines, because it's used rarely and could just be an additional confusing element that's added to the GUI
        }
        let shapesToAddEventListenersTo = []
        shapesToAddEventListenersTo.push(...this.components.shapes.referenceLineLists[rowIndex].map((shape) => shape._renderer.elem))
        shapesToAddEventListenersTo.push(...this.components.shapes.referenceHighlightLineLists[rowIndex].map((shape) => shape._renderer.elem))
        let eventHandlersHash = {
            "mouseenter": () => {
                if (this.noObjectsAreBeingMoved()) {
                    let shiftNotes = false;
                    let shiftSubdivisionLines = false;
                    let shiftReferenceLines = true;
                    let rowIsQuantized = this.sequencer.rows[rowIndex].quantized
                    this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
                    this.initializeShiftToolHoverVisualsAndVariables(rowIndex, shiftNotes, shiftSubdivisionLines, shiftReferenceLines)
                }
            },
            "mouseleave": () => {
                this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
                if (this.shiftToolTracker.selectedRowIndex === null) {
                    for (let shape of this.components.shapes.referenceHighlightLineLists[rowIndex]) {
                        shape.stroke = 'transparent'
                    }
                }
                this.setAnalyticsBarLinesModeBeatLineShiftText(this, true)
                this.setAnalyticsBarLinesModeReferenceLineShiftText(this, true)
            },
            "mousedown": (event) => {
                let updateShiftRowToolButtonVisuals = false;
                let shiftNotes = false;
                let shiftSubdivisionLines = false;
                let shiftReferenceLines = true;
                this.initializeRowShiftToolVariablesAndVisuals(event, rowIndex, updateShiftRowToolButtonVisuals, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);

            },
            "mouseup": () => {
                // console.log("up on reference lines for row " + rowIndex)
            }
        }
        this.addEventListenersWithoutDuplicates("referenceLines" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
    }

    initializeReferenceLineTextInputsEventListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            let referenceLineTextInput = this.components.domElements.textInputs.referenceLineTextInputs[rowIndex]
            let shapesToAddEventListenersTo = [referenceLineTextInput]
            let eventHandlersHash = {
                "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.setNumberOfReferenceLines},
                "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
                "keypress": (event) => this.defaultKeypressEventListenerForTextInput(event, referenceLineTextInput, false),
                "blur": () => {
                    let newTextInputValue = referenceLineTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                    if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                        newTextInputValue = this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
                    }
                    newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                    newTextInputValue = Util.confineNumberToBounds(newTextInputValue, 0, this.configurations.referenceLineTextInputs.maximumValue)
                    if (newTextInputValue === 0) {
                        referenceLineTextInput.style.color = this.configurations.referenceLines.color // set font color to lighter if the value is 0 to (try) reduce visual clutter
                    } else {
                        referenceLineTextInput.style.color = this.configurations.defaultFont.color // set font color
                    }
                    referenceLineTextInput.value = newTextInputValue
                    this.updateNumberOfReferenceLinesForRow(newTextInputValue, rowIndex)
                    this.resetNotesAndLinesDisplayForRow(rowIndex)
                    this.saveCurrentSequencerStateToUrlHash();
                }
            }
            this.addEventListenersWithoutDuplicates("referenceLineTextInput" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
        }
    }

    /**
     * sequencer row lines
     */

    // update a tracker that stores how much each row's subdivision lines are shifted in pixels.
    // we should call this when we open the page, when we load a sequencer from a URL, etc.
    initializeSubdivisionLinesShiftPixelsTracker() {
        this.subdivisionLinesShiftInPixelsPerRow = []
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            // convert shift in millis to pixels
            let shiftInMillis = this.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds();
            let shiftAsPercentageOfFullLoop = shiftInMillis / this.sequencer.loopLengthInMillis;
            let shiftInPixels = shiftAsPercentageOfFullLoop * this.configurations.sequencer.width;
            // store shift in pixels to a tracker object for quick access elsewhere
            this.subdivisionLinesShiftInPixelsPerRow.push(shiftInPixels);
        }
    }

    // draw lines for sequencer rows. return a list of the drawn lines. these will be Two.js 'path' objects.
    initializeAllSequencerRowLines() {
        let sequencerRowLines = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            let sequencerRowLine = this.initializeSequencerRowLine(rowsDrawn, this.configurations.sequencer.lineWidth, this.configurations.sequencer.color)
            sequencerRowLines.push(sequencerRowLine)
        }
        return sequencerRowLines
    }

    initializeSequencerRowLine(rowIndex, lineWidth, color) {
        let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)
        let halfOfLineWidth = Math.floor(lineWidth / 2)
        let lineStart = {
            x: this.configurations.sequencer.left - halfOfLineWidth, // make sure to account for 'line width' when trying to make these lines reach the top of the sequencer line. that's why we subtract the value here
            y: sequencerLineCenterY
        }
        let lineEnd = {
            x: this.configurations.sequencer.left + this.configurations.sequencer.width + halfOfLineWidth,
            y: sequencerLineCenterY
        }
        let sequencerRowLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, lineWidth, color);
        return sequencerRowLine
    }

    removeSequencerRowLine(rowIndex) {
        this.components.shapes.sequencerRowLines[rowIndex].remove();
        this.components.shapes.sequencerRowLines[rowIndex] = null;
    }

    // sequencer row highlight lines

    initializeAllSequencerRowHighlightLines() {
        let sequencerRowLines = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            let sequencerRowLine = this.initializeSequencerRowLine(rowsDrawn, this.configurations.sequencerRowHighlightLines.lineWidth, 'transparent')
            sequencerRowLines.push(sequencerRowLine)
        }
        return sequencerRowLines
    }

    removeSequencerRowHighlightLine(rowIndex) {
        this.components.shapes.sequencerRowHighlightLines[rowIndex].remove();
        this.components.shapes.sequencerRowHighlightLines[rowIndex] = null;
    }

    // sequencer row line event listeners

    addAllSequencerRowLineEventListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            this.addSequencerRowLineEventListenersForRow(rowIndex)
        }
    }

    addSequencerRowLineEventListenersForRow(rowIndex) {
        let shapesToAddEventListenersTo = []
        shapesToAddEventListenersTo.push(this.components.shapes.sequencerRowLines[rowIndex]._renderer.elem)
        shapesToAddEventListenersTo.push(this.components.shapes.sequencerRowHighlightLines[rowIndex]._renderer.elem)
        let eventHandlersHash = {
            "mouseenter": (event) => {
                this.multiShiftTracker.withinRow = rowIndex;
                if (this.noObjectsAreBeingMoved()) {
                    // calculate whether to move stuff based on which keys are being held down (alt, shift, ctrl)
                    this.multiShiftTracker.highlightedRow = rowIndex;
                    let highlightSubdivisionLines = event.ctrlKey || this.multiShiftTracker.shiftSubdivisionLines
                    let highlightNotes = event.altKey || this.multiShiftTracker.shiftNotes || (highlightSubdivisionLines && this.sequencer.rows[rowIndex].quantized);
                    let highlightReferenceLines = event.metaKey || this.multiShiftTracker.shiftReferenceLines;
                    let highlightSequencerRowLine = true;
                    this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.multiShift;
                    this.shiftToolTracker.resourcesToShift.notes = highlightNotes
                    this.shiftToolTracker.resourcesToShift.subdivisionLines = highlightSubdivisionLines
                    this.shiftToolTracker.resourcesToShift.referenceLines = highlightReferenceLines
                    this.initializeShiftToolHoverVisualsAndVariables(rowIndex, highlightNotes, highlightSubdivisionLines, highlightReferenceLines, highlightSequencerRowLine)
                }
            },
            "mouseleave": () => {
                this.multiShiftTracker.withinRow = null;
                if (this.shiftToolTracker.selectedRowIndex === null) {
                    this.multiShiftTracker.highlightedRow = null;
                    this.unhighlightAllShiftableObjects(rowIndex);
                    this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText;
                }
                this.setAnalyticsBarLinesModeBeatLineShiftText(this, true)
                this.setAnalyticsBarLinesModeReferenceLineShiftText(this, true)
            },
            "mousedown": (event) => {
                // calculate whether to move stuff based on which keys are being held down (alt, shift, ctrl)
                let updateShiftRowToolButtonVisuals = false;
                let shiftSubdivisionLines = event.ctrlKey || this.multiShiftTracker.shiftSubdivisionLines
                let shiftNotes = event.altKey || this.multiShiftTracker.shiftNotes || (shiftSubdivisionLines && this.sequencer.rows[rowIndex].quantized);
                let shiftReferenceLines = event.metaKey || this.multiShiftTracker.shiftReferenceLines;
                this.initializeRowShiftToolVariablesAndVisuals(event, rowIndex, updateShiftRowToolButtonVisuals, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
                let rowIsQuantized = this.sequencer.rows[this.shiftToolTracker.selectedRowIndex].quantized
                this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
            },
            "mousemove": () => {
                this.multiShiftTracker.highlightedRow = rowIndex;
            }
        }
        this.addEventListenersWithoutDuplicates("sequencerRowLines" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
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
            subdivisionLinesForRow = this.initializeSubdivisionLinesForRow(rowsDrawn, this.configurations.subdivisionLines.height, this.configurations.sequencer.lineWidth, this.configurations.subdivisionLines.color)
            allSubdivisionLineLists.push(subdivisionLinesForRow) // keep a list of all rows' subdivision line lists
        }
        return allSubdivisionLineLists
    }

    // draw subdivision lines for a single sequencer row, with the given row index.
    // return a list of two.js 'path' objects representing each subdivision line for the sequncer row with the given index.
    initializeSubdivisionLinesForRow(rowIndex, height, linewidth, color, topOffset=0) {
        let linesForRow = []
        if (this.sequencer.rows[rowIndex].getNumberOfSubdivisions() <= 0) {
            return [] // don't draw subdivisions for this row if it has 0 or fewer subdivisions
        }
        let xIncrementBetweenLines = this.configurations.sequencer.width / this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
        for (let linesDrawnForRow = 0; linesDrawnForRow < this.sequencer.rows[rowIndex].getNumberOfSubdivisions(); linesDrawnForRow++) {
            let trialAndErrorAlignmentOffset = .5 // looks like Two.js graphics library draws shapes on .5 boundaries, so if we don't add a .5 offset here, things won't line up quite right
            let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + (this.configurations.sequencer.lineWidth / 2) + trialAndErrorAlignmentOffset
            let halfOfLineWidth = Math.floor(linewidth / 2)
            // calculate the x position of this row line. incorporate the 'subdivision line shift' value for the row.
            let shiftInPixelsForRow = this.subdivisionLinesShiftInPixelsPerRow[rowIndex] % xIncrementBetweenLines;
            let lineXPosition = (xIncrementBetweenLines * linesDrawnForRow) // start with basic subdivision line position based on width of each beat and which beat we're on
            lineXPosition += shiftInPixelsForRow; // add offset to account for 'shift' tool changes made to subdivision lines for row
            if (lineXPosition < 0) { // if the x position of the subdivision line is past the left edge of the sequencer, wrap it to the other side
                lineXPosition = this.configurations.sequencer.width + lineXPosition
            } else { // if the x position of the subdivision line is past the right edge of the sequencer, wrap it to the other side
                lineXPosition = lineXPosition % this.configurations.sequencer.width
            }
            lineXPosition += this.configurations.sequencer.left // move the subdivision line position to account for the left position of the whole sequencer
            // draw the actual line
            let lineStart = {
                x: lineXPosition,
                y: sequencerLineCenterY - halfOfLineWidth + topOffset // make sure to account for 'line width' when trying to make subdivision lines reach the top of the sequencer line. that's why we subtract the value here
            }
            let lineEnd = {
                x: lineStart.x,
                y: sequencerLineCenterY + height + topOffset
            }
            let subdivisionLine = this.initializeLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, linewidth, color);
            linesForRow.push(subdivisionLine) // keep a list of all subdivision lines for the current row
        }
        return linesForRow
    }

    /**
     * subdivision highlight line shapes
     */

    initializeAllSubdivisionHighlightLines() {
        let allSubdivisionHighlightLineLists = []
        let subdivisionHightlightLinesForRow = []
        for (let rowsDrawn = 0; rowsDrawn < this.sequencer.numberOfRows; rowsDrawn++) {
            subdivisionHightlightLinesForRow = this.initializeSubdivisionLinesForRow(rowsDrawn, this.configurations.subdivisionHighlightLines.height, this.configurations.subdivisionHighlightLines.lineWidth, 'transparent', this.configurations.subdivisionHighlightLines.topOffset)
            allSubdivisionHighlightLineLists.push(subdivisionHightlightLinesForRow) // keep a list of all rows' subdivision highlight line lists
        }
        return allSubdivisionHighlightLineLists
    }

    /**
     * subdivision line and subdivision highlight line event listeners
     */

    addAllSubdivisionLinesEventListeners(){
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++){
            this.addSubdivisionLinesEventListenersForRow(rowIndex);
        }
    }

    addSubdivisionLinesEventListenersForRow(rowIndex) {
        let shapesToAddEventListenersTo = []
        shapesToAddEventListenersTo.push(...this.components.shapes.subdivisionLineLists[rowIndex].map((shape) => shape._renderer.elem))
        shapesToAddEventListenersTo.push(...this.components.shapes.subdivisionHighlightLineLists[rowIndex].map((shape) => shape._renderer.elem))
        let eventHandlersHash = {
            "mouseenter": () => {
                if (this.noObjectsAreBeingMoved()) {
                    let rowIsQuantized = this.sequencer.rows[rowIndex].quantized
                    let shiftNotes = rowIsQuantized
                    let shiftSubdivisionLines = true;
                    let shiftReferenceLines = false;
                    this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
                    this.initializeShiftToolHoverVisualsAndVariables(rowIndex, shiftNotes, shiftSubdivisionLines, shiftReferenceLines)
                }
            },
            "mouseleave": () => {
                this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
                if (this.shiftToolTracker.selectedRowIndex === null) {
                    for (let shape of this.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
                        shape.stroke = 'transparent'
                    }
                    for (let circle of this.shiftToolTracker.noteCircles) {
                        circle.stroke = 'transparent'
                    }
                }
                this.setAnalyticsBarLinesModeBeatLineShiftText(this, true)
                this.setAnalyticsBarLinesModeReferenceLineShiftText(this, true)
            },
            "mousedown": (event) => {
                let updateShiftRowToolButtonVisuals = false;
                let shiftNotes = this.sequencer.rows[rowIndex].quantized;
                let shiftSubdivisionLines = true;
                let shiftReferenceLines = false;
                this.initializeRowShiftToolVariablesAndVisuals(event, rowIndex, updateShiftRowToolButtonVisuals, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
            },
            "mouseup": () => {
                // console.log("up subdivision lines for row " + rowIndex)
            }
        }
        this.addEventListenersWithoutDuplicates("subdivisionLines" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
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

    // given the index of a sequencer row, remove all subdivision lines from the display for that row.
    // the current intent of this is to delete them all so that they can be re-drawn afterwards (such as
    // when the number of subdivisions in a particular row is changed).
    removeSubdivisionHighlightLinesForRow(rowIndex) {
        for (let line of this.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
            line.remove()
        }
        this.components.shapes.subdivisionHighlightLineLists[rowIndex] = []
    }

    initializeSubdivisionTextInputsEventListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            let subdivisionTextInput = this.components.domElements.textInputs.subdivisionTextInputs[rowIndex]
            let shapesToAddEventListenersTo = [subdivisionTextInput]
            let eventHandlersHash = {
                "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.setNumberOfSubdivisionLines},
                "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
                "keypress": (event) => this.defaultKeypressEventListenerForTextInput(event, subdivisionTextInput, false),
                "blur": () => {
                    let newTextInputValue = subdivisionTextInput.value.trim() // remove whitespace from beginning and end of input then store it
                    if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                        newTextInputValue = this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
                    }
                    newTextInputValue = parseInt(newTextInputValue) // we should only allow ints here for now, since that is what the existing logic is designed to handle
                    newTextInputValue = Util.confineNumberToBounds(newTextInputValue, 0, this.configurations.subdivisionLineTextInputs.maximumValue)
                    subdivisionTextInput.value = newTextInputValue
                    this.updateNumberOfSubdivisionsForRow(newTextInputValue, rowIndex)
                    this.redrawSequencer();
                    this.saveCurrentSequencerStateToUrlHash();
                }
            }
            this.addEventListenersWithoutDuplicates("subdivisionLineTextInput" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
        }
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
        let width  = this.configurations.notes.circleRadiusUsedForNoteBankSpacing + (this.configurations.sampleBank.borderPadding * 2)
        let height = (this.configurations.notes.circleRadiusUsedForNoteBankSpacing * (this.sampleNameList.length - 1)) + ((this.sampleNameList.length - 1) * this.configurations.sampleBank.spaceBetweenNotes) + (this.configurations.sampleBank.borderPadding * 2)
        let noteBankContainer = this.initializeRectangleShape(this.configurations.sampleBank.top, this.configurations.sampleBank.left, height, width)
        noteBankContainer.linewidth = this.configurations.sequencer.lineWidth;
        noteBankContainer.stroke = this.configurations.subdivisionLines.color
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

    // 'move rows' row handles event listener initializations

    initializeSequencerRowHandlesEventListeners() {
        for (let rowIndex = 0; rowIndex < this.components.shapes.sequencerRowHandles.length; rowIndex++) {
            let circle = this.components.shapes.sequencerRowHandles[rowIndex];
            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', () => {
                this.moveRowMouseEnterEventHandler(this, rowIndex);
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', () => {
                this.moveRowMouseLeaveEventHandler(this, rowIndex);
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', () => {
                this.moveRowMouseDownEventHandler(this, rowIndex);
            });
            // the bulk of the actual 'mouseup' logic will be handled in the window's mouseup event,
            // because if we implement snap-into-place for sequencer rows, the row handle may not actually
            // be under our mouse when we lift our mouse to drop the row into place.
            // just putting the most basic functionality for visual effects here for now.
            circle._renderer.elem.addEventListener('mouseup', () => {
                this.moveRowMouseUpEventHandler(this, rowIndex);
            });
        }
    }

    moveRowMouseEnterEventHandler(self, rowIndex) {
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.moveRow
        let circle = self.components.shapes.sequencerRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        if (self.rowSelectionTracker.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
            circle.fill = self.configurations.buttonBehavior.buttonHoverColor
            rowSelectionRectangle.stroke = self.configurations.buttonBehavior.buttonHoverColor
        }
    }

    moveRowMouseLeaveEventHandler(self, rowIndex) {
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        let circle = self.components.shapes.sequencerRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        circle.fill = self.configurations.sequencerRowHandles.unselectedColor
        rowSelectionRectangle.stroke = 'transparent'
    }

    moveRowMouseDownEventHandler(self, rowIndex) {
        // save relevant info about whichever row is selected
        self.initializeRowMovementVariablesAndVisuals(rowIndex);
    }

    moveRowMouseUpEventHandler(self, rowIndex) {
        let circle = self.components.shapes.sequencerRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        circle.fill = self.configurations.sequencerRowHandles.unselectedColor
        rowSelectionRectangle.stroke = self.configurations.sequencerRowHandles.unselectedColor
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
    }

    // 'adjust row volumes' row handles event listener initializations

    initializeVolumeAdjusterRowHandlesEventListeners() {
        for (let rowIndex = 0; rowIndex < this.components.shapes.volumeAdjusterRowHandles.length; rowIndex++) {
            let circle = this.components.shapes.volumeAdjusterRowHandles[rowIndex];

            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', () => {
                this.changeRowVolumesMouseEnterEventHandler(this, rowIndex);
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', () => {
                this.changeRowVolumesMouseLeaveEventHandler(this, rowIndex);
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', () => {
                this.changeRowVolumesMouseDownEventHandler(this, rowIndex);
            });
            // the bulk of the actual 'mouseup' logic will be handled in the window's mouseup event,
            // because if we implement snap-into-place for sequencer rows, the row handle may not actually
            // be under our mouse when we lift our mouse to drop the row into place.
            // just putting the most basic functionality for visual effects here for now.
            circle._renderer.elem.addEventListener('mouseup', () => {
                this.changeRowVolumesMouseUpEventHandler(this, rowIndex);
            });
        }
    }

    changeRowVolumesMouseEnterEventHandler(self, rowIndex) {
        if (self.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents) {
            self.components.domElements.divs.bottomBarText.innerHTML = self.configurations.helpText.changeRowVolume
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            if (self.shiftToolTracker.selectedRowIndex === null && self.rowVolumeAdjustmentTracker.selectedRowIndex === null && self.circleSelectionTracker.circleBeingMoved === null) { // if a row is already selected (i.e being moved), don't do any of this
                circle.fill = self.configurations.buttonBehavior.buttonHoverColor
                rowSelectionRectangle.stroke = self.configurations.buttonBehavior.buttonHoverColor
                self.initializeRowVolumeAdjustmentHoverVariablesAndVisuals(rowIndex);
            }
        }
    }

    changeRowVolumesMouseLeaveEventHandler(self, rowIndex) {
        if (self.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents) {
            self.components.domElements.divs.bottomBarText.innerHTML = self.configurations.helpText.defaultText
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.volumeAdjusterRowHandles.unselectedColor
            rowSelectionRectangle.stroke = 'transparent'
            if (self.shiftToolTracker.selectedRowIndex === null && self.rowVolumeAdjustmentTracker.selectedRowIndex === null) {
                self.unhighlightNoteCirclesForRowVolumeAdjustment();
            }
        }
    }

    changeRowVolumesMouseDownEventHandler(self, rowIndex) {
        if (self.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents) {
            // save relevant info about whichever row is selected
            self.initializeRowVolumeAdjustmentVariablesAndVisuals(rowIndex);
        }
    }

    changeRowVolumesMouseUpEventHandler(self, rowIndex) {
        if (self.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents) {
            self.components.domElements.divs.bottomBarText.innerHTML = self.configurations.helpText.defaultText
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.volumeAdjusterRowHandles.unselectedColor
            rowSelectionRectangle.stroke = self.configurations.volumeAdjusterRowHandles.unselectedColor
            self.unhighlightNoteCirclesForRowVolumeAdjustment();
        }
    }

    // 'shift row' row handles event listener initializations

    initializeShiftToolRowHandlesEventListeners() {
        for (let rowIndex = 0; rowIndex < this.components.shapes.shiftToolRowHandles.length; rowIndex++) {
            let circle = this.components.shapes.shiftToolRowHandles[rowIndex];

            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', () => {
                if (this.shiftToolTracker.selectedRowIndex === null) {
                    this.shiftRowMouseEnterEventHandler(this, rowIndex);
                }
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', () => {
                this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
                this.shiftRowMouseLeaveEventHandler(this, rowIndex);
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', (event) => {
                this.shiftRowMouseDownEventHandler(this, event, rowIndex);
            });
            // the bulk of the actual 'mouseup' logic will be handled in the window's mouseup event,
            // because if we implement snap-into-place for sequencer rows, the row handle may not actually
            // be under our mouse when we lift our mouse to drop the row into place.
            // just putting the most basic functionality for visual effects here for now.
            circle._renderer.elem.addEventListener('mouseup', () => {
                this.shiftRowMouseUpEventHandler(this, rowIndex);
            });
        }
    }

    shiftRowMouseEnterEventHandler(self, rowIndex) {
        if (self.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents) {
            let shiftNotes = this.shiftToolTracker.resourcesToShiftButtonStates.notes;
            let shiftSubdivisionLines = this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines;
            let shiftReferenceLines = this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines;
            let rowIsQuantized = this.sequencer.rows[rowIndex].quantized
            this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
            let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            if (self.rowSelectionTracker.selectedRowIndex === null && self.circleSelectionTracker.circleBeingMoved === null && self.rowVolumeAdjustmentTracker.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
                circle.fill = self.configurations.buttonBehavior.buttonHoverColor
                rowSelectionRectangle.stroke = self.configurations.buttonBehavior.buttonHoverColor
                self.initializeShiftToolHoverVisualsAndVariables(rowIndex, shiftNotes, shiftSubdivisionLines, shiftReferenceLines)
            }
        }
    }

    setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines) {
        let helpText;
        if (!shiftReferenceLines && !shiftNotes && !shiftSubdivisionLines) {
            return; // nothing is being shifted, so don't change the help text
        }
        if (shiftReferenceLines && !shiftNotes && !shiftSubdivisionLines) {
            helpText = this.configurations.helpText.shiftRow.referenceLinesOnly;
        } else {
            helpText = this.configurations.helpText.shiftRow.prefix;
            let resourcesToShiftList = []
            if (shiftNotes) {
                if (rowIsQuantized) {
                    resourcesToShiftList.push(this.configurations.helpText.shiftRow.quantizedNotesName)
                } else {
                    resourcesToShiftList.push(this.configurations.helpText.shiftRow.unquantizedNotesName)
                }
            }
            if (shiftSubdivisionLines) {
                resourcesToShiftList.push(this.configurations.helpText.shiftRow.subdivisionLinesName)
            }
            if (shiftReferenceLines) {
                resourcesToShiftList.push(this.configurations.helpText.shiftRow.referenceLinesName)
            }
            if (resourcesToShiftList.length > 1) {
                resourcesToShiftList[resourcesToShiftList.length - 1] = "and " + resourcesToShiftList[resourcesToShiftList.length - 1];
            }
            
            helpText += resourcesToShiftList.join(", ")
            helpText += this.configurations.helpText.shiftRow.postfix
        }
        this.components.domElements.divs.bottomBarText.innerHTML = helpText;
    }

    shiftRowMouseLeaveEventHandler(self, rowIndex) {
        if (self.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents) {
            let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.shiftToolRowHandles.unselectedColor
            rowSelectionRectangle.stroke = 'transparent'
            if (self.shiftToolTracker.selectedRowIndex === null) {
                self.unhighlightAllShiftableObjects(rowIndex);
            }
        }
    }

    shiftRowMouseDownEventHandler(self, event, rowIndex) {
        if (self.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents) {
            // save relevant info about whichever row is selected
            let updateShiftRowToolButtonVisuals = true;
            let shiftNotes = self.shiftToolTracker.resourcesToShiftButtonStates.notes;
            let shiftSubdivisionLines = self.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines
            let shiftReferenceLines = self.shiftToolTracker.resourcesToShiftButtonStates.referenceLines
            self.initializeRowShiftToolVariablesAndVisuals(event, rowIndex, updateShiftRowToolButtonVisuals, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
        }
    }

    shiftRowMouseUpEventHandler(self, rowIndex) {
        if (self.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents) {
            this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
            let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.shiftToolRowHandles.unselectedColor
            rowSelectionRectangle.stroke = self.configurations.shiftToolRowHandles.unselectedColor
            self.unhighlightAllShiftableObjects(rowIndex);
            if (this.multiShiftTracker.withinRow !== null) { // if multi-shift is still highlighted for a row, leave it highlighted
                this.initializeShiftToolHoverVisualsAndVariables(this.multiShiftTracker.withinRow, this.multiShiftTracker.shiftNotes, this.multiShiftTracker.shiftSubdivisionLines, this.multiShiftTracker.shiftReferenceLines, true)
            }
        }
    }

    /**
     * 'set tempo' text input logic.
     * also include logic for initial tempo buttons / inputs based on which tempo input mode we're in ('set tempo as bpm' or 'set tempo as length in milliseconds')
     */

    initializeTempoTextInputValuesAndStyles() {
        // set text input style and contents.
        // start with the main tempo beats-per-minute text input
        this.components.domElements.divs.tempoTextInputBpm.style.left = "" + this.configurations.tempoTextInputBpm.left + "px"
        this.components.domElements.divs.tempoTextInputBpm.style.top = "" + this.configurations.tempoTextInputBpm.top + "px"
        this.components.domElements.textInputs.loopLengthBpm.style.borderColor = this.configurations.sequencer.color
        this.components.domElements.textInputs.loopLengthBpm.style.color = this.configurations.defaultFont.color // set font color
        // start with the main tempo milliseconds text input
        this.components.domElements.divs.tempoTextInputMillis.style.left = "" + this.configurations.tempoTextInputMilliseconds.left + "px"
        this.components.domElements.divs.tempoTextInputMillis.style.top = "" + this.configurations.tempoTextInputMilliseconds.top + "px"
        this.components.domElements.textInputs.loopLengthMillis.style.borderColor = this.configurations.sequencer.color
        this.components.domElements.textInputs.loopLengthMillis.style.color = this.configurations.defaultFont.color // set font color
        // now set up the 'beats per loop' tempo text input
        this.components.domElements.divs.tempoTextInputBeatsPerLoop.style.left = "" + this.configurations.tempoTextInputBeatsPerLoop.left + "px"
        this.components.domElements.divs.tempoTextInputBeatsPerLoop.style.top = "" + this.configurations.tempoTextInputBeatsPerLoop.top + "px"
        this.components.domElements.textInputs.numberOfBeatsInLoop.value = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop;
        this.components.domElements.textInputs.numberOfBeatsInLoop.style.borderColor = this.configurations.sequencer.color
        this.components.domElements.textInputs.numberOfBeatsInLoop.style.color = this.configurations.defaultFont.color // set font color
        // initialize tempo input state based on which tempo input mode is selected (loop bpm or loop length in milliseconds)
        this.components.domElements.textInputs.loopLengthBpm.value = this.sequencer.tempoRepresentation.beatsPerMinute;
        this.components.domElements.textInputs.loopLengthMillis.value = this.sequencer.loopLengthInMillis
        if (this.sequencer.tempoRepresentation.isInBpmMode) { // set tempo input mode selector button color based on which tempo input mode we are in
            this.components.shapes.tempoInputModeSelectionBpmButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
            this.components.domElements.textInputs.numberOfBeatsInLoop.style.display = 'block';
            this.components.domElements.textInputs.loopLengthBpm.style.display = 'block';
            this.components.domElements.textInputs.loopLengthMillis.style.display = 'none';
            this.components.shapes.tempoLabelMenuTitleTimeWord.fill = 'transparent'
            this.components.shapes.tempoLabelMenuTitleTempoWord.fill = this.configurations.subdivisionLines.color
            this.hideTempoMillisecondsTextLabels(); // tempo text labels are shown by default, so just hide them if we need to
        } else {
            this.components.shapes.tempoInputModeSelectionMillisecondsButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
            this.components.domElements.textInputs.numberOfBeatsInLoop.style.display = 'none';
            this.components.domElements.textInputs.loopLengthBpm.style.display = 'none';
            this.components.domElements.textInputs.loopLengthMillis.style.display = 'block';
            this.components.shapes.tempoLabelMenuTitleTimeWord.fill = this.configurations.subdivisionLines.color
            this.components.shapes.tempoLabelMenuTitleTempoWord.fill = 'transparent'
            this.hideTapTempoButton(); // tap tempo button is shown by default, so just hide it if we need to
            this.hideTempoBpmTextLabels(); // tempo text labels are shown by default, so just hide them if we need to

        }
    }

    // if everything for the tempo menu is already initialized, just adjust the existing stuff to be visible or not as needed etc.
    refreshTempoMenuState() {
        this.components.domElements.textInputs.numberOfBeatsInLoop.value = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop;
        this.components.domElements.textInputs.loopLengthBpm.value = this.sequencer.tempoRepresentation.beatsPerMinute;
        this.components.domElements.textInputs.loopLengthMillis.value = this.sequencer.loopLengthInMillis
        this.hideTempoMillisecondsTextLabels();
        this.hideTempoBpmTextLabels();
        this.hideTapTempoButton();
        if (this.sequencer.tempoRepresentation.isInBpmMode) {
            this.components.shapes.tempoInputModeSelectionBpmButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
            this.components.shapes.tempoInputModeSelectionMillisecondsButton.fill = 'transparent';
            this.showTempoBpmTextLabels();
            this.showTapTempoButton();
        } else {
            this.components.shapes.tempoInputModeSelectionMillisecondsButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
            this.components.shapes.tempoInputModeSelectionBpmButton.fill = 'transparent';
            this.showTempoMillisecondsTextLabels();
        }
    }

    initializeLoopLengthInMillisecondsTextInputEventListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'loop length in millis' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        let shapesToAddEventListenersTo = [this.components.domElements.textInputs.loopLengthMillis]
        let eventHandlersHash = {
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.setMillisecondsPerLoop},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
            "keypress": (event) => this.defaultKeypressEventListenerForTextInput(event, this.components.domElements.textInputs.loopLengthMillis, true),
            "blur": () => {
                let newTextInputValue = this.components.domElements.textInputs.loopLengthMillis.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = this.sequencer.loopLengthInMillis
                }
                newTextInputValue = parseFloat(newTextInputValue) // do we allow floats rather than ints?? i think we could. it probably barely makes a difference though
                // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input
                newTextInputValue = Util.confineNumberToBounds(newTextInputValue, this.sequencer.lookAheadMillis, this.configurations.tempoTextInputMilliseconds.maximumValue)
                this.components.domElements.textInputs.loopLengthMillis.value = newTextInputValue
                if (newTextInputValue !== this.sequencer.loopLengthInMillis) { // only update things if the value in the text box has changed
                    this.updateSequencerLoopLength(newTextInputValue)
                    this.sequencer.tempoRepresentation.beatsPerMinute = Util.convertLoopLengthInMillisToBeatsPerMinute(newTextInputValue, this.sequencer.tempoRepresentation.numberOfBeatsPerLoop);
                    this.components.domElements.textInputs.loopLengthBpm.value = this.sequencer.tempoRepresentation.beatsPerMinute;
                    this.saveCurrentSequencerStateToUrlHash();
                }
            }
        }
        this.addEventListenersWithoutDuplicates("loopLengthMillisTextInput", shapesToAddEventListenersTo, eventHandlersHash);
    }

    // return the minimum beats per minute value the user can currently set the sequencer to, based on a couple other values.
    getMinimumAllowedSequencerBeatsPerMinute() {
        return Util.convertLoopLengthInMillisToBeatsPerMinute(this.configurations.tempoTextInputBpm.maximumValue, this.sequencer.tempoRepresentation.numberOfBeatsPerLoop);
    }

    // return the maximum beats per minute value the user can currently set the sequencer to, based on a couple other values.
    getMaximumAllowedSequencerBeatsPerMinute() {
        return Util.convertLoopLengthInMillisToBeatsPerMinute(this.sequencer.lookAheadMillis, this.sequencer.tempoRepresentation.numberOfBeatsPerLoop);
    }

    initializeBeatsPerMinuteTextInputEventListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'beats per minute' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        let shapesToAddEventListenersTo = [this.components.domElements.textInputs.loopLengthBpm]
        let eventHandlersHash = {
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.setBeatsPerMinute},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
            "keypress": (event) => this.defaultKeypressEventListenerForTextInput(event, this.components.domElements.textInputs.loopLengthBpm, true),
            "blur" : () => {
                let newTextInputValue = this.components.domElements.textInputs.loopLengthBpm.value.trim() // remove whitespace from beginning and end of input then store it
                if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                    newTextInputValue = this.sequencer.tempoRepresentation.beatsPerMinute
                }
                newTextInputValue = parseFloat(newTextInputValue) // do we allow floats rather than ints?? i think we could. it probably barely makes a difference though
                // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input (when converted to milliseconds)
                let numberOfBeatsPerLoop = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop
                newTextInputValue = Util.confineNumberToBounds(newTextInputValue, this.getMinimumAllowedSequencerBeatsPerMinute(), this.getMaximumAllowedSequencerBeatsPerMinute())
                this.components.domElements.textInputs.loopLengthBpm.value = newTextInputValue
                if (newTextInputValue !== this.sequencer.tempoRepresentation.beatsPerMinute) { // only update things if the value in the text box has changed
                    this.sequencer.tempoRepresentation.beatsPerMinute = newTextInputValue
                    this.updateSequencerLoopLength(Util.convertBeatsPerMinuteToLoopLengthInMillis(newTextInputValue, numberOfBeatsPerLoop));
                    this.components.domElements.textInputs.loopLengthMillis.value = this.sequencer.loopLengthInMillis;
                    this.saveCurrentSequencerStateToUrlHash();
                }
            }
        }
        this.addEventListenersWithoutDuplicates("loopLengthBeatsPerMinuteTextInput", shapesToAddEventListenersTo, eventHandlersHash);
    }

    initializeNumberOfBeatsInLoopInputEventListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'number of beats in loop' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */

        let shapesToAddEventListenersTo = [this.components.domElements.textInputs.numberOfBeatsInLoop]
        let eventHandlersHash = {
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.setBeatsPerLoop},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
            "keypress": (event) => this.defaultKeypressEventListenerForTextInput(event, this.components.domElements.textInputs.numberOfBeatsInLoop, true),
            "blur" : () => {
                if (this.sequencer.tempoRepresentation.isInBpmMode) {
                    let newTextInputValue = this.components.domElements.textInputs.numberOfBeatsInLoop.value.trim() // remove whitespace from beginning and end of input then store it
                    if (newTextInputValue === "" || isNaN(newTextInputValue)) { // check if new input is a real number. if not, switch input box back to whatever value it had before.
                        newTextInputValue = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop
                    }
                    let newNumberOfBeatsPerLoop = parseInt(newTextInputValue) // do we allow floats rather than ints?? not here, since we also don't allow fractional subdivisisions of rows
                    newNumberOfBeatsPerLoop = (newNumberOfBeatsPerLoop === 0 ? 1 : newNumberOfBeatsPerLoop);
                    // don't allow setting loop length shorter than the look-ahead length or longer than the width of the text input (when converted to milliseconds).
                    // make sure that (current BPM * number of beats) is less than maximum loop length
                    let minimumNumberOfBeatsAtCurrentBpm = this.sequencer.lookAheadMillis / this.sequencer.tempoRepresentation.beatsPerMinute;
                    let maximumNumberOfBeatsAtCurrentBpm = this.configurations.tempoTextInputBeatsPerLoop.maximumValue / this.sequencer.tempoRepresentation.beatsPerMinute;
                    newNumberOfBeatsPerLoop = Util.confineNumberToBounds(newNumberOfBeatsPerLoop, minimumNumberOfBeatsAtCurrentBpm, maximumNumberOfBeatsAtCurrentBpm)
                    this.components.domElements.textInputs.numberOfBeatsInLoop.value = newNumberOfBeatsPerLoop;
                    if (newNumberOfBeatsPerLoop !== this.sequencer.tempoRepresentation.numberOfBeatsPerLoop) { // only update things if the value in the text box has changed
                        this.sequencer.tempoRepresentation.numberOfBeatsPerLoop = newNumberOfBeatsPerLoop
                        this.updateSequencerLoopLength(Util.convertBeatsPerMinuteToLoopLengthInMillis(this.sequencer.tempoRepresentation.beatsPerMinute, newNumberOfBeatsPerLoop));
                        this.components.domElements.textInputs.loopLengthMillis.value = this.sequencer.loopLengthInMillis;
                        this.saveCurrentSequencerStateToUrlHash();
                    }
                }
            }
        }
        this.addEventListenersWithoutDuplicates("loopLengthBeatsPerLoopTextInput", shapesToAddEventListenersTo, eventHandlersHash);
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

    initializeMidiOutputSelectorValuesAndStyles() {
        // this.components.domElements.divs.midiOutputSelector.style.display = 'none';
        this.components.domElements.divs.midiOutputSelector.style.left = "" + this.configurations.midiOutputSelector.position.left + "px";
        this.components.domElements.divs.midiOutputSelector.style.top = "" + this.configurations.midiOutputSelector.position.top + "px";
        // Add a default option to the selector for 'no midi output
        let noMidiOutputOption = document.createElement("option");
        noMidiOutputOption.text = "No Live MIDI Output";
        this.midiOutputsMap["No Live MIDI Output"] = null;
        this.components.domElements.selectors.midiOutput.add(noMidiOutputOption);
        if (navigator.requestMIDIAccess !== null && navigator.requestMIDIAccess !== undefined) {
            navigator.requestMIDIAccess().then((midiAccess) => { // asynchronously request access to the system's MIDI ports.
                // add all available MIDI outputs to the selector
                for (let output of midiAccess.outputs) {
                    let option = document.createElement("option");
                    let midiName = output[1].name
                    let midiId = output[0];
                    midiName = midiName + " [ID: " + midiId + "]"
                    option.text = midiName;
                    this.midiOutputsMap[option.text] = output[0]
                    this.components.domElements.selectors.midiOutput.add(option);
                }
            });
        }
    }

    initializeMidiOutputSelectorEventListeners() {
        let shapesToAddEventListenersTo = [this.components.domElements.selectors.midiOutput]
        let eventHandlersHash = {
            "change": () => {
                navigator.requestMIDIAccess().then((midiAccess) => {
                    let midiAudioDriver = this.sequencer.audioDrivers[1]; // index 1 is just a hard-coded to always be the index of the MIDI audio driver. and index 0 is the WebAudio driver.
                    let selectedMidiPortId = this.midiOutputsMap[this.components.domElements.selectors.midiOutput.value];
                    // now that the asynchronous request for MIDI access has been completed, retrieve the particular port we want to use.
                    // just use null if no MIDI output was specified. the MIDI audio driver is set up to nit play audio if its MIDI port is null.
                    let midiOutput = (selectedMidiPortId === null ? null : midiAccess.outputs.get(selectedMidiPortId));
                    midiAudioDriver.setMidiOutput(midiOutput); // update the MIDI driver we created earlier to use the MIDI port we just retrieved. 
                })
            },
            "keydown": (event) => {event.preventDefault()},
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.selectLiveMidiOutputPort},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
        };
        this.addEventListenersWithoutDuplicates("midiOutputSelector", shapesToAddEventListenersTo, eventHandlersHash);
    }

    initializeDrumKitSelectorValuesAndStyles() {
        this.components.domElements.divs.drumkitSelector.style.left = "" + this.configurations.drumkitSelector.position.left + "px";
        this.components.domElements.divs.drumkitSelector.style.top = "" + this.configurations.drumkitSelector.position.top + "px";
        // Add a default option to the selector for 'no midi output
        let noWebAudioOutputOption = document.createElement("option");
        noWebAudioOutputOption.text = this.configurations.drumkitSelector.noWebAudioOutputOptionText; // this contains the 'no live audio' option text
        this.components.domElements.selectors.drumkit.add(noWebAudioOutputOption);
        // add an option for each different drum kit
        for(let [drumkitName, samples] of Object.entries(this.allDrumKitsHash)) {
            let option = document.createElement("option");
            option.text = drumkitName;
            this.components.domElements.selectors.drumkit.add(option);
            if (drumkitName === this.selectedDrumKitName) {
                option.selected = true;
            }
        }
        // select the 'no live audio output' option if necessary
        if (this.components.domElements.selectors.drumkit.value === this.configurations.drumkitSelector.noWebAudioOutputOptionText) {
            this.sequencer.audioDrivers[0].muted = true;
            this.components.domElements.selectors.drumkit.options[0].selected = true;
        }
    }

    initializeDrumKitSelectorEventListeners() {
        let shapesToAddEventListenersTo = [this.components.domElements.selectors.drumkit]
        let eventHandlersHash = {
            "change": () => {
                if (this.components.domElements.selectors.drumkit.value === this.configurations.drumkitSelector.noWebAudioOutputOptionText) { // if the 'no live audio' option is seleted
                    this.sequencer.audioDrivers[0].muted = true;
                } else {
                    this.sequencer.audioDrivers[0].muted = false;
                    this.sequencer.samples = this.allDrumKitsHash[this.components.domElements.selectors.drumkit.value];
                    // we serialize selected drum kit info here because we don't want to serialize 'no live audio output'.
                    // this is a user experience choice, because refreshing the sequencer and having no audio could be
                    // confusing.
                    // in order to start serializing 'no live audio output', all you'd need to do should be to move
                    // the following two lines out of this 'if/else' block. i've tried to make sure all the other logic,
                    // including for deserializing, still works as is for that case. 
                    this.selectedDrumKitName = this.components.domElements.selectors.drumkit.value;
                    this.sequencer.sampleListName = this.selectedDrumKitName
                }
                this.saveCurrentSequencerStateToUrlHash();
            },
            "keydown": (event) => {event.preventDefault()},
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.selectDrumKit},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
        }
        this.addEventListenersWithoutDuplicates("drumKitSelector", shapesToAddEventListenersTo, eventHandlersHash);
    }

    initializeExamplePatternSelectorValuesAndStyles() {
        this.components.domElements.divs.examplePatternSelector.style.left = "" + this.configurations.examplePatternSelector.position.left + "px";
        this.components.domElements.divs.examplePatternSelector.style.top = "" + this.configurations.examplePatternSelector.position.top + "px";
        // Add a default option to the selector for 'custom pattern'
        let customPattern = document.createElement("option");
        customPattern.text = this.configurations.examplePatternSelector.noExamplePatternSelectedText;
        this.components.domElements.selectors.examplePatterns.add(customPattern);
        // add an option for each different example pattern we want to include
        this.flattenedExampleSequencerPatternsHash = {} // track a flattened version of the hash, without the categories, so we can access their values by just the pattern name later
        for(let [categoryName, patterns] of Object.entries(this.exampleSequencerPatternsHash)) {
            let optionGroup = document.createElement("optGroup");
            optionGroup.label = categoryName;
            for (let [patternName, patternUrl] of Object.entries(patterns)) {
                let option = document.createElement("option");
                option.text = patternName;
                optionGroup.appendChild(option);
                if (this.flattenedExampleSequencerPatternsHash[patternName]) { // perform this check to avoid silently overwriting patterns with repeated names
                    throw "Example pattern names must be unique! Found multiple patterns with name '" + patternName + "'"
                } else {
                    this.flattenedExampleSequencerPatternsHash[patternName] = patternUrl
                }
            }
            this.components.domElements.selectors.examplePatterns.add(optionGroup);
        }
    }

    initializeExamplePatternSelectorEventListeners() {
        let shapesToAddEventListenersTo = [this.components.domElements.selectors.examplePatterns]
        let eventHandlersHash = {
            "change": () => {
                let selectedValue = this.components.domElements.selectors.examplePatterns.value;
                if (this.flattenedExampleSequencerPatternsHash[selectedValue]) {
                    // if an example pattern was selected, here we will want to load it. we will do that be deserializing it from the serialized sequencer string we stored in our 'example patterns' hash.
                    this.loadSequencerPatternFromBase64String(this.flattenedExampleSequencerPatternsHash[selectedValue]);
                    // change the selected value back to 'no selection' right away. that way we allow re-selecting the same option over and over to reload the same example pattern
                    this.components.domElements.selectors.examplePatterns.options[0].innerHTML = "*" + selectedValue
                    this.components.domElements.selectors.examplePatterns.options[0].selected = true;
                }
            },
            "keydown": (event) => {event.preventDefault()},
            "mouseenter": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.selectExampleSequencerPattern},
            "mouseleave": () => {this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText},
        }
        this.addEventListenersWithoutDuplicates("examplePatternSelector", shapesToAddEventListenersTo, eventHandlersHash);
    }

    // add event listeners to the buttons that let you select which resources will be moved by the shift tool.
    // there is one button each for: notes, subdivision lines, and refernce lines.
    initializeShiftToolToggleButtonEventListeners() {
        // shift notes
        let shapesToAddEventListenersTo = [this.components.shapes.shiftModeMoveNotesButton._renderer.elem, this.components.domElements.images.activateShiftNotesIcon]
        let eventHandlersHash = {
            "click": () => this.shiftModeMoveNotesClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.shiftModeMoveNotesButton),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.shiftModeMoveNotesButton),
        }
        this.addEventListenersWithoutDuplicates("shiftNotesToggleButton", shapesToAddEventListenersTo, eventHandlersHash);
        // shift subdivision lines
        shapesToAddEventListenersTo = [this.components.shapes.shiftModeMoveSubdivisionLinesButton._renderer.elem, this.components.domElements.images.activateShiftSubdivisionLinesIcon]
        eventHandlersHash = {
            "click": () => this.shiftModeMoveSubdivisionLinesClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.shiftModeMoveSubdivisionLinesButton),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.shiftModeMoveSubdivisionLinesButton),
        }
        this.addEventListenersWithoutDuplicates("shiftSubdivisionLinesToggleButton", shapesToAddEventListenersTo, eventHandlersHash);
        // shift reference lines
        shapesToAddEventListenersTo = [this.components.shapes.shiftModeMoveReferenceLinesButton._renderer.elem, this.components.domElements.images.activateShiftReferenceLinesIcon]
        eventHandlersHash = {
            "click": () => this.shiftModeMoveReferenceLinesClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.shiftModeMoveReferenceLinesButton),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.shiftModeMoveReferenceLinesButton),
        }
        this.addEventListenersWithoutDuplicates("shiftReferenceLinesToggleButton", shapesToAddEventListenersTo, eventHandlersHash);
    }

    shiftModeMoveNotesClickHandler(self) {
        if (!self.components.shapes.shiftModeMoveNotesButton.guiData.respondToEvents) {
            return;
        }
        self.shiftToolTracker.resourcesToShiftButtonStates.notes = !self.shiftToolTracker.resourcesToShiftButtonStates.notes
        if (self.shiftToolTracker.resourcesToShiftButtonStates.notes) {
            // move notes
            self.components.shapes.shiftModeMoveNotesButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        } else {
            // don't move notes
            self.components.shapes.shiftModeMoveNotesButton.fill = 'transparent'
        }
        self.redrawSequencer(); // redraw sequencer so we can show or hide the 'shift' tool row handles if necessary
    }

    shiftModeMoveSubdivisionLinesClickHandler(self) {
        if (!self.components.shapes.shiftModeMoveSubdivisionLinesButton.guiData.respondToEvents) {
            return;
        }
        self.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines = !self.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines
        if (self.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines) {
            // move subdivision lines
            self.components.shapes.shiftModeMoveSubdivisionLinesButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        } else {
            // don't move subdivision lines
            self.components.shapes.shiftModeMoveSubdivisionLinesButton.fill = 'transparent'
        }
        self.redrawSequencer(); // redraw sequencer so we can show or hide the 'shift' tool row handles if necessary
    }

    shiftModeMoveReferenceLinesClickHandler(self) {
        if (!self.components.shapes.shiftModeMoveReferenceLinesButton.guiData.respondToEvents) {
            return;
        }
        self.shiftToolTracker.resourcesToShiftButtonStates.referenceLines = !self.shiftToolTracker.resourcesToShiftButtonStates.referenceLines
        if (self.shiftToolTracker.resourcesToShiftButtonStates.referenceLines) {
            // move reference lines
            self.components.shapes.shiftModeMoveReferenceLinesButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        } else {
            // don't move reference lines
            self.components.shapes.shiftModeMoveReferenceLinesButton.fill = 'transparent'
        }
        self.redrawSequencer(); // redraw sequencer so we can show or hide the 'shift' tool row handles if necessary
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

    addPauseButtonEventListeners() {
        let shapesToAddEventListenersTo = [this.components.shapes.pauseButtonShape._renderer.elem, this.components.domElements.images.playIcon, this.components.domElements.images.pauseIcon]
        let eventHandlersHash = {
            "click": () => this.pauseButtonClickHandler(this),
            "mouseenter": () => {
                let helpText = this.sequencer.paused ? this.configurations.helpText.play : this.configurations.helpText.stop;
                this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.pauseButtonShape, helpText)
            },
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.pauseButtonShape),
        }
        this.addEventListenersWithoutDuplicates("pauseButton", shapesToAddEventListenersTo, eventHandlersHash);
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
        self.sequencer.restart();
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
            textArea.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.subdivisionLineTextInputs.topPaddingPerRow) + "px"
            textArea.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.subdivisionLineTextInputs.leftPaddingPerRow) + "px"
            textArea.style.borderColor = this.configurations.sequencer.color
            textArea.value = this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
            textArea.style.color = this.configurations.defaultFont.color // set font color
            textArea.title = "Number of rhythmic grid lines"
            this.components.domElements.divs.subdivisionTextInputs.appendChild(textArea);
            // note for later: the opposite of appendChild is removeChild
            this.components.domElements.textInputs.subdivisionTextInputs.push(textArea)
            // textArea.disabled = "true" // todo: get rid of this line once the subdivision text inputs are functioning
        }
    }

    updateNumberOfSubdivisionsForRow(newNumberOfSubdivisions, rowIndex) {
        // update quantization toggle checkbox, quantization settings: you can't quantize a row if it has 0 subdivisions.
        if (newNumberOfSubdivisions === 0) {
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
            textArea.title = "Number of visual guide lines"
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

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    setQuantizationButtonClickHandler(self, rowIndex, quantize) {
        if (self.sequencer.rows[rowIndex].getNumberOfSubdivisions() === 0) {
            // you can't quantize a row if it has 0 subdivisions, so automatically change the value to 1 in this case
            self.updateNumberOfSubdivisionsForRow(1, rowIndex)
        }
        // update button click time trackers. i'm nor actually sure these get used. i think this may be because the
        // quantization toggle buttons get redrawn when the sequencer gets redraw, so the old button that had its color 
        // changed gets overwritten right away. that's fine though, since the button's icon changes when you click it,
        // giving immediate feedback that it did something. but we can debug this later if it becomes a problem.
        self.lastButtonClickTimeTrackers["toggleQuantizationButton" + rowIndex].lastClickTime = self.sequencer.currentTime
        self.components.shapes.toggleQuantizationButtonsRectangles[rowIndex].fill = self.configurations.buttonBehavior.clickedButtonColor
        // update quantization values
        self.sequencer.rows[rowIndex].setQuantization(quantize)
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
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
    getIndexOfClosestSubdivisionLine(mouseX, numberOfSubdivisions, shiftOffsetInPixels) {
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let xPositionOfLeftmostSubdivisionLineWithinSequencer = (shiftOffsetInPixels % widthOfEachSubdivision)
        let mouseXWithinSequencerWithShift = mouseXWithinSequencer - xPositionOfLeftmostSubdivisionLineWithinSequencer
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencerWithShift / widthOfEachSubdivision)
        let mouseIsCloserToRightSubdivisionThanLeft = (mouseXWithinSequencerWithShift % widthOfEachSubdivision) > (widthOfEachSubdivision / 2)
        let subdivisionToSnapTo = subdivisionNumberToLeftOfMouse
        if (mouseIsCloserToRightSubdivisionThanLeft) {
            subdivisionToSnapTo += 1
        }
        return Util.confineNumberToBounds(subdivisionToSnapTo, 0, numberOfSubdivisions - 1)
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
    getXPositionOfSubdivisionLine(subdivisionIndex, numberOfSubdivisions, shiftOffsetInPixels) {
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        let xPositionOfLeftmostSubdivisionLineWithinSequencer = shiftOffsetInPixels % widthOfEachSubdivision;
        return sequencerLeftEdge + xPositionOfLeftmostSubdivisionLineWithinSequencer + (widthOfEachSubdivision * subdivisionIndex);
    }

    /**
     * This is similar to the function 'getIndexOfClosestSubdivisionLine', but instead of finding the closest subdivion line
     * to the given mouse X coordinate, this function returns the index of closest subdivision line _to the left_.
     * 
     * For example, if you are placing a note on an unquantized sequencer row and the note falls between beat 1 and beat 2,
     * beat 1 is the closest subdivision line to the left, so this function will return 1.
     * 
     * This function is used so that we can display what "beat" number a note is on in the analytics bar, even when that note 
     * is on an unquantized sequencer row, so doesn't actually have a real beat number stored in the sequencer. 
     * 
     * One important detail here is that when a row's subdivision lines are shifted and the note position falls before the 
     * lefmost ("first") subdivision, this function will return the index of the last subdivision in the row. That's just a
     * choice I made about how I want the analytics bar to handle that scenario. For example if the subdivision lines on the
     * row are shifted and note falls before the first subdivision in a row with 4 subdivisions, this function will return 4.
     */
    getIndexOfClosestSubdivisionLineToTheLeft(mouseX, numberOfSubdivisions, shiftOffsetInPixels) {
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        let mouseXWithinSequencer = mouseX - sequencerLeftEdge
        let xPositionOfLeftmostSubdivisionLineWithinSequencer = (shiftOffsetInPixels % widthOfEachSubdivision)
        let mouseXWithinSequencerWithShift = mouseXWithinSequencer - xPositionOfLeftmostSubdivisionLineWithinSequencer
        let subdivisionNumberToLeftOfMouse = Math.floor(mouseXWithinSequencerWithShift / widthOfEachSubdivision)
        return subdivisionNumberToLeftOfMouse === -1 ? numberOfSubdivisions - 1 : subdivisionNumberToLeftOfMouse;
    }

    /**
     * This is used in calculating 'how far is an unquantized note from the nearest subdivision line to its left'?
     * The unit returned is a number of pixels, specifying how far the note is from the subdivision to its left.
     * It is calculated by figuring out the theoretical position of the leftmost subdivision line on the sequencer
     * (account for shift), figuring out the width of each subdivision, then just calculating a remainder value.
     * 
     * For example, if the sequencer starts at x position '10', the row has a shift of '4', the subdivision width 
     * is '5', and position of this note is 13, the theoretical start position of the leftmost subdivision is 9 
     * (1 pixel before the start of the sequencer), and the note has a remainder of '4' within its current beat,
     * so is 4 pixels away from the nearest subdivision line to its left.
     */
    getXDistanceFromClosestSubdivisionToTheLeft(mouseX, numberOfSubdivisions, shiftOffsetInPixels) {
        // calculate the position of the theoretical leftmost subdivision in the row, without wrapping. 
        // that means the position of subdivision 0 if the row isn't shifted, and subdivision -1 if it is shifted.
        let sequencerLeftEdge = this.configurations.sequencer.left
        let widthOfEachSubdivision = this.configurations.sequencer.width / numberOfSubdivisions
        let shiftWithinOneSubdivision = shiftOffsetInPixels % widthOfEachSubdivision
        let negativeShiftWithinOneSubdivision = shiftWithinOneSubdivision > 0 ? shiftWithinOneSubdivision - widthOfEachSubdivision : shiftWithinOneSubdivision
        let theoreticalXPositionOfLeftmostSubdivisionLineWithoutWrapping = sequencerLeftEdge + negativeShiftWithinOneSubdivision
        // now that we have the x position of the theoretical leftmost subdivision line, we can calculate where we 
        // fall within our current subdivision lines as a remainder value. we don't even need to know what beat we're
        // within here -- just a remainder based on the width of each subdivision and the position of the theoretical
        // leftmost subdivision line will be sufficient.
        let actualNoteXPositionRelativeToTheoreticalLeftmostSubdivisionPosition = mouseX - theoreticalXPositionOfLeftmostSubdivisionLineWithoutWrapping
        let remainderOfNoteXPositionWithinSubdivisionLines = actualNoteXPositionRelativeToTheoreticalLeftmostSubdivisionPosition % widthOfEachSubdivision
        return remainderOfNoteXPositionWithinSubdivisionLines
    }

    /**
     * General text input event listeners logic
     */

    addDefaultKeypressEventListenerToTextInput(textarea, allowPeriods) {
        textarea.addEventListener('keypress', (event) => this.defaultKeypressEventListenerForTextInput(event, textarea, allowPeriods))
    }

    defaultKeypressEventListenerForTextInput(event, textarea, allowPeriods) {
        if (event.key === "Enter") {
            event.preventDefault()
            textarea.blur() // apply the change to the text area if the user presses "enter"
        }
        let periodCheckPassed = (event.key === "." && allowPeriods) // if the character is a period, make this value 'true' if periods are allowed. otherwise false.
        if (isNaN(Number.parseInt(event.key)) && !periodCheckPassed) { // don't allow the user to enter things that aren't numbers (but allow periods if they're allowed)
            event.preventDefault()
        }
    }

    /**
     * 'add row to sequencer' logic
     */

    initializeAddRowButtonEventListener() {
        // store the button's shape here, because this button gets deleted and recreated when new rows are added are deleted from the sequencer.
        this.lastButtonClickTimeTrackers.addRow.shape = this.components.shapes.addRowButtonShape;
        // initialize event listeners
        let shapesToAddEventListenersTo = [this.components.shapes.addRowButtonShape._renderer.elem, this.components.domElements.images.addIcon]
        let eventHandlersHash = {
            "click": () => this.addRowClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.addRowButtonShape, this.configurations.helpText.addRow),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.addRowButtonShape),
        }
        this.addEventListenersWithoutDuplicates("addRowButton", shapesToAddEventListenersTo, eventHandlersHash);
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    addRowClickHandler(self) {
        self.lastButtonClickTimeTrackers.addRow.lastClickTime = self.sequencer.currentTime
        self.components.shapes.addRowButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        self.addEmptySequencerRow();
        if (self.sequencer.rows.length > 1) {
            // set the number of subdivisions and reference lines and the 
            // quantization of the new row to be the same as the old last row.
            let oldLastRow = self.sequencer.rows[self.sequencer.rows.length - 2]
            let newRow = self.sequencer.rows[self.sequencer.rows.length - 1]
            newRow.setNumberOfSubdivisions(oldLastRow.getNumberOfSubdivisions())
            newRow.setNumberOfReferenceLines(oldLastRow.getNumberOfReferenceLines())
            newRow.setQuantization(oldLastRow.quantized)
        }
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    addEmptySequencerRow() {
        this.sequencer.addEmptyRow();
        let newRowIndex = this.sequencer.rows.length - 1
        // set new row default configuration
        this.sequencer.rows[newRowIndex].setNumberOfReferenceLines(4);
        this.sequencer.rows[newRowIndex].setNumberOfSubdivisions(16);
        this.sequencer.rows[newRowIndex].setQuantization(true);
    }

    /**
     * 'clear notes for sequencer row' logic
     */

    addClearNotesForRowButtonsEventListeners() {
        for(let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let shapesToAddEventListenersTo = [this.components.shapes.clearNotesForRowButtonShapes[rowIndex]._renderer.elem]
            let eventHandlersHash = {
                "click": () => this.clearRowButtonClickHandler(this, rowIndex),
                "mouseenter": () => this.clearRowButtonMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.clearRowButtonMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("clearNotesForRowShape" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
        }
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    clearRowButtonClickHandler(self, rowIndex) {
        if (self.components.shapes.clearNotesForRowButtonShapes[rowIndex].guiData.respondToEvents) {
            self.components.shapes.clearNotesForRowButtonShapes[rowIndex].fill = 'transparent'
            self.clearNotesForRow(rowIndex);
            self.resetNotesAndLinesDisplayForRow(rowIndex);
            self.saveCurrentSequencerStateToUrlHash();
        }
    }

    clearRowButtonMouseEnterHandler(self, rowIndex) {
        self.simpleButtonHoverMouseEnterLogic(self, self.components.shapes.clearNotesForRowButtonShapes[rowIndex], self.configurations.helpText.deleteAllNotesForRow, "red")
        if (self.noObjectsAreBeingMoved()) {
            for (let circle of self.allDrawnCircles) {
                if (circle.guiData.row === rowIndex) {
                    circle.linewidth = 2
                    circle.stroke = 'red'
                }
            }
        }
    }

    clearRowButtonMouseLeaveHandler(self, rowIndex) {
        self.simpleButtonHoverMouseLeaveLogic(self, self.components.shapes.clearNotesForRowButtonShapes[rowIndex])
        if (self.noObjectsAreBeingMoved()) {
            for (let circle of self.allDrawnCircles) {
                if (circle.guiData.row === rowIndex) {
                    circle.stroke = 'transparent'
                }
            }
        }
    }

    clearNotesForRow(rowIndex) { 
        this.sequencer.clearRow(rowIndex)
        this.refreshNoteDependentButtonsForRow(rowIndex)
    }

    // return whether anything in the sequencer is currently being moved or having its volume changed. 
    // this includes moving a row, changing a row's volume, shifting a row, moving a note, or changing a note's volume.
    // if any of those are currently happening, this will return 'false'.
    noObjectsAreBeingMoved() {
        return this.shiftToolTracker.selectedRowIndex === null && this.circleSelectionTracker.circleBeingMoved === null && this.rowVolumeAdjustmentTracker.selectedRowIndex === null
    }

    /**
     * quantization button rectangle (not icon) event listeners
     * icon event listeners get set up when the icons themselves 
     * are initialized.
     */

    addQuantizationButtonShapeEventListeners() {
        for(let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // initialize button click time trackers
            this.lastButtonClickTimeTrackers["toggleQuantizationButton" + rowIndex] = {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex],
            }
            // we don't include event listeners here yet, because we don't need to. the quantization
            // button's icons are approximately the same size as the button rectangle, so it's currently
            // not really possible to click one without clicking the other. if this changes
        }
    }

    /**
     * add event listener to the 'export sequencer pattern to midi file' button
     */
    initializeExportPatternToMidiFileButtonEventListener() {
        let shapesToAddEventListenersTo = [this.components.shapes.exportPatternToMidiFileButton._renderer.elem, this.components.domElements.images.exportPatternAsMidiFileIcon]
        let eventHandlersHash = {
            "click": () => this.exportPatternToMidiFileButtonClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.exportPatternToMidiFileButton, this.configurations.helpText.saveMidi),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.exportPatternToMidiFileButton),
        }
        this.addEventListenersWithoutDuplicates("exportPatternToMidiFile", shapesToAddEventListenersTo, eventHandlersHash);
    }

    exportPatternToMidiFileButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers["exportPatternToMidiFile"].lastClickTime = self.sequencer.currentTime
        self.components.shapes.exportPatternToMidiFileButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.exportSequencerPatternToMidiDataUri();
    }

    /**
     * shift tool 'reset reference lines shift' button (one button per row) logic
     */
    
    addShiftToolResetReferenceLinesButtonsEventListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let shapesToAddEventListenersTo = [this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex]._renderer.elem]
            let eventHandlersHash = {
                "click": () => this.resetReferenceLinesShiftClickHandler(this, rowIndex),
                "mouseenter": () => this.resetReferenceLinesShiftMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.resetReferenceLinesShiftMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("resetReferenceLinesShiftShape" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
        }
    }

    resetReferenceLinesShiftClickHandler(self, rowIndex) {
        if (self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].guiData.respondToEvents) {
            self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].fill = 'transparent'
            self.resetReferenceLineShiftForRow(rowIndex);
            self.referenceLinesShiftInPixelsPerRow[rowIndex] = self.sequencer.rows[rowIndex].getReferenceLineShiftInMilliseconds();
            self.resetNotesAndLinesDisplayForRow(rowIndex);
            self.saveCurrentSequencerStateToUrlHash();
        }
    }

    resetReferenceLinesShiftMouseEnterHandler(self, rowIndex) {
        if (!self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].guiData.respondToEvents) {
            return;
        }
        self.simpleButtonHoverMouseEnterLogic(self, self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex], self.configurations.helpText.resetReferenceLineShift, "red")
        if (self.noObjectsAreBeingMoved()) {
            for (let line of self.components.shapes.referenceHighlightLineLists[rowIndex]) {
                line.stroke = 'red';
            }
        }
    }

    resetReferenceLinesShiftMouseLeaveHandler(self, rowIndex) {
        if (!self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].guiData.respondToEvents) {
            return;
        }
        self.simpleButtonHoverMouseLeaveLogic(self, self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex])
        if (self.noObjectsAreBeingMoved()){
            for (let line of self.components.shapes.referenceHighlightLineLists[rowIndex]) {
                line.stroke = 'transparent';
            }
        }
    }

    resetReferenceLineShiftForRow(rowIndex) {
        this.sequencer.rows[rowIndex].setReferenceLineShiftMilliseconds(0);
        this.refreshShiftDependentButtonsForRow(rowIndex);
    }

    /**
     * shift tool 'reset subdivision lines shift' button (one button per row) logic
     */
    
     addShiftToolResetSubdivisionLinesButtonsEventListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // add event listeners. the icon event listeners are set up separately, when the icons get initialized
            let shapesToAddEventListenersTo = [this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex]._renderer.elem]
            let eventHandlersHash = {
                "click": () => this.resetSubdivisionLinesShiftClickHandler(this, rowIndex),
                "mouseenter": () => this.resetSubdivisionLinesShiftMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.resetSubdivisionLinesShiftMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("resetSubdivisionLinesShiftShape" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
        }
    }

    resetSubdivisionLinesShiftClickHandler(self, rowIndex) {
        if (self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].guiData.respondToEvents) {
            self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].fill = 'transparent'
            self.resetSubdivisionLineShiftForRow(rowIndex);
            self.subdivisionLinesShiftInPixelsPerRow[rowIndex] = self.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds();
            self.resetNotesAndLinesDisplayForRow(rowIndex);
            self.saveCurrentSequencerStateToUrlHash();
        }
    }

    resetSubdivisionLinesShiftMouseEnterHandler(self, rowIndex) {
        if (!self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].guiData.respondToEvents) {
            return;
        }
        self.simpleButtonHoverMouseEnterLogic(self, self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex], self.configurations.helpText.resetSubdivisionLineShift, "red")
        if (self.noObjectsAreBeingMoved()) {
            for (let line of self.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
                line.stroke = 'red';
            }
        }
    }

    resetSubdivisionLinesShiftMouseLeaveHandler(self, rowIndex) {
        if (!self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].guiData.respondToEvents) {
            return;
        }
        self.simpleButtonHoverMouseLeaveLogic(self, self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex])
        if (self.noObjectsAreBeingMoved()){
            for (let line of self.components.shapes.subdivisionHighlightLineLists[rowIndex]) {
                line.stroke = 'transparent';
            }
        }
    }

    resetSubdivisionLineShiftForRow(rowIndex) {
        let lengthOfOneBeat = this.sequencer.loopLengthInMillis / this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
        let currentNode = this.sequencer.rows[rowIndex]._notesList.head;
        if (this.sequencer.rows[rowIndex].quantized) { // if the row is quantized, keep notes snapped to subdivision lines. otherwise we don't need to keep them aligned.
            while(currentNode !== null) {
                currentNode.priority = currentNode.priority - (this.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds() % lengthOfOneBeat);
                currentNode = currentNode.next;
            }
        }
        this.sequencer.rows[rowIndex].setSubdivisionLineShiftMilliseconds(0);
        this.refreshShiftDependentButtonsForRow(rowIndex);
    }

    /**
     * 'clear all sequencer notes' logic
     */

    addClearAllNotesButtonEventListeners() {
        let shapesToAddEventListenersTo = [this.components.shapes.clearAllNotesButtonShape._renderer.elem, this.components.domElements.images.clearAllIcon]
        let eventHandlersHash = {
            "click": () => this.clearAllNotesButtonClickHandler(this),
            "mouseenter": () => this.clearAllNotesMouseEnterHandler(this),
            "mouseleave": () => this.clearAllNotesMouseLeaveHandler(this),
        }
        this.addEventListenersWithoutDuplicates("clearAllNotes", shapesToAddEventListenersTo, eventHandlersHash);
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    clearAllNotesButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers.clearAllNotes.lastClickTime = self.sequencer.currentTime
        self.components.shapes.clearAllNotesButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.loadSequencerPatternFromBase64String(this.configurations.sequencer.clearedPatternBase64String); 
        self.initializeNoteBankVolumesTrackerValues();
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
        self.components.domElements.selectors.examplePatterns.options[0].innerHTML = "";
        self.components.domElements.selectors.examplePatterns.options[0].selected = true;
    }

    clearAllNotesMouseEnterHandler(self) {
        self.simpleButtonHoverMouseEnterLogic(self, self.components.shapes.clearAllNotesButtonShape, self.configurations.helpText.deletePattern, "red");
        if (self.noObjectsAreBeingMoved()) {
            for (let circle of self.allDrawnCircles) {
                circle.linewidth = 2
                circle.stroke = 'red'
            }
            this.components.shapes.sequencerBorder.stroke = 'red';
        }
    }

    clearAllNotesMouseLeaveHandler(self) {
        self.simpleButtonHoverMouseLeaveLogic(self, self.components.shapes.clearAllNotesButtonShape)
        if (self.noObjectsAreBeingMoved()) {
            for (let circle of self.allDrawnCircles) {
                circle.stroke = 'transparent'
            }
            this.components.shapes.sequencerBorder.stroke = 'transparent';
        }
    }

    initializeNoteBankVolumesTrackerValues() {
        for (let sampleName of this.sampleNameList) {
            this.noteBankNoteVolumesTracker[sampleName] = {
                volume: this.configurations.notes.volumes.defaultVolume,
            }
        }
    }

    addTempoInputModeSelectionButtonsEventListeners() {
        this.addTempoInputModeSelectionBpmButtonEventListener();
        this.addTempoInputModeSelectionMillisecondsButtonEventListener();
    }

    addTempoInputModeSelectionBpmButtonEventListener() {
        let shapesToAddEventListenersTo = [this.components.shapes.tempoInputModeSelectionBpmButton._renderer.elem, this.components.domElements.images.bpmLoopLengthModeIcon, this.components.shapes.tempoLabelMenuTitleTempoWord._renderer.elem]
        let eventHandlersHash = {
            "click": () => this.tempoInputModeSelectionBpmClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.tempoInputModeSelectionBpmButton, this.configurations.helpText.loopLengthBpmMode),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.tempoInputModeSelectionBpmButton),
        }
        this.addEventListenersWithoutDuplicates("tempoInputModeSelectionBpmButton", shapesToAddEventListenersTo, eventHandlersHash);
    }

    hideTempoBpmTextLabels() {
        this.components.shapes.tempoLabelBeats.remove();
        this.components.shapes.tempoLabelBeatsPerMinute.remove();
    }

    showTempoBpmTextLabels() {
        this.components.shapes.tempoLabelBeats = this.initializeLabelText(this.configurations.tempoTextLabelBeats.text, this.configurations.tempoTextLabelBeats.left, this.configurations.tempoTextLabelBeats.top, "left");
        this.components.shapes.tempoLabelBeatsPerMinute = this.initializeLabelText(this.configurations.tempoTextLabelBeatsPerMinute.text, this.configurations.tempoTextLabelBeatsPerMinute.left, this.configurations.tempoTextLabelBeatsPerMinute.top, "left");
        this.initializeTempoBpmTextLabelsStyles();
    }

    initializeTempoBpmTextLabelsStyles() {
        this.components.shapes.tempoLabelBeats.fill = this.configurations.tempoTextLabelBeats.color;
        this.components.shapes.tempoLabelBeatsPerMinute.fill = this.configurations.tempoTextLabelBeatsPerMinute.color;
    }

    hideTempoMillisecondsTextLabels() {
        this.components.shapes.tempoLabelMilliseconds.remove();
    }

    showTempoMillisecondsTextLabels() {
        this.components.shapes.tempoLabelMilliseconds = this.initializeLabelText(this.configurations.tempoTextLabelMilliseconds.text, this.configurations.tempoTextLabelMilliseconds.left, this.configurations.tempoTextLabelMilliseconds.top, "left");
        this.initializeTempoMillisecondsTextLabelsStyles();
    }

    initializeTempoMillisecondsTextLabelsStyles() {
        this.components.shapes.tempoLabelMilliseconds.fill = this.configurations.tempoTextLabelMilliseconds.color;
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    tempoInputModeSelectionBpmClickHandler(self) {
        if (!self.sequencer.tempoRepresentation.isInBpmMode) {
            self.sequencer.tempoRepresentation.isInBpmMode = true;
            self.components.shapes.tempoInputModeSelectionBpmButton.fill = self.configurations.buttonBehavior.clickedButtonColor;
            self.components.shapes.tempoInputModeSelectionMillisecondsButton.fill = 'transparent';
            self.components.domElements.textInputs.numberOfBeatsInLoop.style.display = 'block';
            self.components.domElements.textInputs.loopLengthBpm.style.display = 'block';
            self.components.domElements.textInputs.loopLengthMillis.style.display = 'none';
            self.components.shapes.tempoLabelMenuTitleTimeWord.fill = 'transparent'
            self.components.shapes.tempoLabelMenuTitleTempoWord.fill = self.configurations.subdivisionLines.color
            self.saveCurrentSequencerStateToUrlHash();
            self.showTapTempoButton();
            self.showTempoBpmTextLabels();
            self.hideTempoMillisecondsTextLabels();
        }
    }

    addTempoInputModeSelectionMillisecondsButtonEventListener() {
        let shapesToAddEventListenersTo = [this.components.shapes.tempoInputModeSelectionMillisecondsButton._renderer.elem, this.components.domElements.images.millisecondsLoopLengthModeIcon, this.components.shapes.tempoLabelMenuTitleTimeWord._renderer.elem]
        let eventHandlersHash = {
            "click": () => this.tempoInputModeSelectionMillisecondsClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.tempoInputModeSelectionMillisecondsButton, this.configurations.helpText.loopLengthMillisecondsMode),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.tempoInputModeSelectionMillisecondsButton),
        }
        this.addEventListenersWithoutDuplicates("tempoInputModeSelectionMillisecondsButton", shapesToAddEventListenersTo, eventHandlersHash);
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    tempoInputModeSelectionMillisecondsClickHandler(self) {
        if (self.sequencer.tempoRepresentation.isInBpmMode) {
            self.sequencer.tempoRepresentation.isInBpmMode = false;
            self.components.shapes.tempoInputModeSelectionMillisecondsButton.fill = self.configurations.buttonBehavior.clickedButtonColor;
            self.components.shapes.tempoInputModeSelectionBpmButton.fill = 'transparent';
            self.components.domElements.textInputs.numberOfBeatsInLoop.style.display = 'none';
            self.components.domElements.textInputs.loopLengthBpm.style.display = 'none';
            self.components.domElements.textInputs.loopLengthMillis.style.display = 'block';
            self.components.shapes.tempoLabelMenuTitleTimeWord.fill = self.configurations.subdivisionLines.color
            self.components.shapes.tempoLabelMenuTitleTempoWord.fill = 'transparent'
            self.saveCurrentSequencerStateToUrlHash();
            self.hideTapTempoButton();
            self.hideTempoBpmTextLabels();
            self.showTempoMillisecondsTextLabels();
        }
    }

    hideTapTempoButton() {
        this.components.shapes.tapTempoButton.remove();
        this.components.domElements.images.tapTempoIcon.style.display = 'none';
    }

    showTapTempoButton() {
        this.components.shapes.tapTempoButton = this.initializeRectangleShape(this.configurations.tapTempoButton.top, this.configurations.tapTempoButton.left, this.configurations.tapTempoButton.height, this.configurations.tapTempoButton.width);
        this.lastButtonClickTimeTrackers.tapTempo.shape = this.components.shapes.tapTempoButton;
        this.components.domElements.images.tapTempoIcon.style.display = 'block';
        this.two.update();
        this.addTapTempoButtonEventListeners();
    }

    addTapTempoButtonEventListeners() {
        let shapesToAddEventListenersTo = [this.components.shapes.tapTempoButton._renderer.elem, this.components.domElements.images.tapTempoIcon]
        let eventHandlersHash = {
            "click": () => this.tapTempoClickHandler(this),
            "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.tapTempoButton, this.configurations.helpText.tapTempo),
            "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.tapTempoButton),
        }
        this.addEventListenersWithoutDuplicates("tapTempoButton", shapesToAddEventListenersTo, eventHandlersHash);
    }
    
    /**
     * How the tap tempo button works:
     * The first time you click it, it notes the time it was clicked. Then, when you click it again, it notes the time of the 
     * second click, and it calculates a tempo based off the two clicks -- if they were two beats, what would be the bpm?
     * If you click the tap tempo button some more, it keeps calculating new BPMs based on the new click and the one before it. 
     * Another important piece is that in the main update loop, there is a check that resets the state of this button --
     * as in, if you wait long enough, your most recent click will be forgotten and you will need to click the button twice again 
     * if you want to set a new tempo with it. The tap tempo button only ever calculates a tempo based off of two clicks. It would 
     * be possible to find the average tempo of a group of many clicks, but that would be more complicated logic to implement.
     */
    tapTempoClickHandler(self) {
        if (self.tapTempoTracker.absoluteTimeOfMostRecentTapTempoButtonClick !== Number.MIN_SAFE_INTEGER) {
            // the tap tempo button has been clicked recently before this click, so calculate a new 
            // tempo based on the time of the recent click and the click that caused this mouse event.
            let newBeatsPerMinute = parseInt(Util.convertBeatLengthInMillisToBeatsPerMinute(self.sequencer.currentTime - self.tapTempoTracker.absoluteTimeOfMostRecentTapTempoButtonClick));
            if (newBeatsPerMinute !== self.sequencer.tempoRepresentation.beatsPerMinute) { // only update things if the value in the text box has changed
                self.components.domElements.textInputs.loopLengthBpm.value = newBeatsPerMinute
                self.sequencer.tempoRepresentation.beatsPerMinute = newBeatsPerMinute
                self.updateSequencerLoopLength(Util.convertBeatsPerMinuteToLoopLengthInMillis(newBeatsPerMinute, self.sequencer.tempoRepresentation.numberOfBeatsPerLoop));
                self.components.domElements.textInputs.loopLengthMillis.value = self.sequencer.loopLengthInMillis;
                self.saveCurrentSequencerStateToUrlHash();
            }
        }
        self.tapTempoTracker.absoluteTimeOfMostRecentTapTempoButtonClick = self.sequencer.currentTime;
        // change the button color so that it looks 'clicked'
        self.lastButtonClickTimeTrackers.tapTempo.lastClickTime = self.sequencer.currentTime;
        self.components.shapes.tapTempoButton.fill = self.configurations.buttonBehavior.clickedButtonColor
    }

    /**
     * reset the state of the tap tempo button. forget about any previous clicks.
     */
    resetTapTempoButtonState() {
        this.tapTempoTracker.absoluteTimeOfMostRecentTapTempoButtonClick = Number.MIN_SAFE_INTEGER
        if (this.components.shapes.tapTempoButton.fill !== this.configurations.buttonBehavior.buttonHoverColor) {
            // only reset color if the mouse isn't currently hovering over the button
            this.components.shapes.tapTempoButton.fill = 'transparent'
        }
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
    drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat, volume, midiNote, midiVelocity) {
        // initialize the new circle and set its colors
        let circle = this.two.makeCircle(xPosition, yPosition, this.configurations.notes.circleRadiusUsedForNoteBankSpacing)
        circle.fill = this.samples[sampleName].color
        circle.stroke = 'transparent'

        // add mouse events to the new circle
        this.two.update() // this 'update' needs to go here because it is what generates the new circle's _renderer.elem 
        
        // add border to circle on mouseover
        circle._renderer.elem.addEventListener('mouseenter', (event) => {
            if (this.shiftToolTracker.selectedRowIndex === null && this.rowVolumeAdjustmentTracker.selectedRowIndex === null) {
                circle.stroke = 'black'
                circle.linewidth = 2
                this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.moveNote
                // adjust analytics bar 'note' mode text 
                this.setAnalyticsBarToNoteMode()
                this.setAnalyticsBarNotesModeBeatNumberText(this, circle.guiData.beat, circle.translation.x, circle.guiData.row)
                this.setAnalyticsBarNotesModeReferenceLineNumberText(this, circle.translation.x, circle.guiData.row)
                this.setAnalyticsBarNotesModeVolumeText(this, circle.guiData.midiVelocity)
                this.setAnalyticsBarNotesModeDistanceFromBeatLinesText(this, circle.translation.x, circle.guiData.row)
                this.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(this, circle.translation.x, circle.guiData.row)
            }
        });
        // remove border from circle when mouse is no longer over it
        circle._renderer.elem.addEventListener('mouseleave', (event) => {
            if (this.shiftToolTracker.selectedRowIndex === null && this.rowVolumeAdjustmentTracker.selectedRowIndex === null) {
                circle.stroke = 'transparent'
                this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
                // adjust analytics bar 'note' mode text 
                this.setAnalyticsBarToNoteMode()
                this.setAnalyticsBarNotesModeBeatNumberText(this, -1, -1, -1, true)
                this.setAnalyticsBarNotesModeReferenceLineNumberText(this, -1, -1, true)
                this.setAnalyticsBarNotesModeVolumeText(this, -1, true)
                this.setAnalyticsBarNotesModeDistanceFromBeatLinesText(this, -1, -1, true)
                this.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(this, -1, -1, true)
            }
        });
        // select circle (for moving) if we click it
        circle._renderer.elem.addEventListener('mousedown', (event) => {
            event = this.adjustEventCoordinates(event)

            // selection tracking variables
            this.circleSelectionTracker.circleBeingMoved = circle
            this.circleSelectionTracker.startingRadius = circle.guiData.radiusWhenUnplayed;
            this.circleSelectionTracker.mostRecentMovementWasVolumeChange = false
            this.circleSelectionTracker.nodeIfNotStoredInSequencerRow = null;
            this.circleSelectionTracker.lastRowSnappedTo = circle.guiData.row;
            this.circleSelectionTracker.lastBeatSnappedTo = circle.guiData.beat;
            this.circleSelectionTracker.lastPositionSnappedTo = {
                x: this.circleSelectionTracker.circleBeingMoved.translation.x,
                y: this.circleSelectionTracker.circleBeingMoved.translation.y,
            }
            this.circleSelectionTracker.currentRowNodeIsStoredIn = circle.guiData.row;
            this.circleSelectionTracker.currentBeatNodeIsStoredAt = circle.guiData.beat;
            this.circleSelectionTracker.throwNoteAway = false;

            // todo: make notes being moved a little bit transparent (just while they're being moved, so we can see what's behind them)
            this.setNoteTrashBinVisibility(true);
            this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            this.sequencer.playDrumSampleNow(this.circleSelectionTracker.circleBeingMoved.guiData.sampleName, this.circleSelectionTracker.circleBeingMoved.guiData.volume, this.circleSelectionTracker.circleBeingMoved.guiData.midiNote, this.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
        });

        // add info to the circle object that the gui uses to keep track of things
        circle.guiData = {};
        circle.guiData.sampleName = sampleName
        circle.guiData.row = row
        circle.guiData.label = label
        circle.guiData.beat = beat
        circle.guiData.volume = volume
        circle.guiData.midiVelocity = midiVelocity;
        circle.guiData.radiusWhenUnplayed = this.calculateCircleRadiusForVolume(volume);
        circle.guiData.midiNote = midiNote

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
        let xPosition = this.configurations.sampleBank.left + this.configurations.sampleBank.borderPadding + (this.configurations.notes.circleRadiusUsedForNoteBankSpacing / 2)
        let yPosition = this.configurations.sampleBank.top + this.configurations.sampleBank.borderPadding + (indexOfSampleInNoteBank * this.configurations.notes.circleRadiusUsedForNoteBankSpacing) + (indexOfSampleInNoteBank * this.configurations.sampleBank.spaceBetweenNotes)
        let row = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK // for cirlces on the note bank, the circle is not in a real row yet, so use -2 as a placeholder row number
        let volume = this.noteBankNoteVolumesTracker[sampleName].volume
        let midiNote = this.noteBankMidiNoteNumbersTracker[sampleName].midiNote
        let midiVelocity = this.convertWebAudioVolumeIntoMidiVelocity(volume)
        /**
         * the top note in the note bank will have label '-1', next one down will be '-2', etc.
         * these negative number labels will still be unique to a particular circle in the note bank,
         * and these IDs will be replaced with a real, normal label (a generated ID) once each note
         * bank circle is taken fom the note bank and placed onto a real row.
         */
        let label = (indexOfSampleInNoteBank + 1) * -1 // see block comment above for info about '-1' here
        this.drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, Sequencer.NOTE_IS_NOT_QUANTIZED, volume, midiNote, midiVelocity)
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
                let volume = noteToDraw.data.volume
                if (volume === null || volume === undefined) {
                    volume = this.configurations.notes.volumes.defaultVolume
                    noteToDraw.data.volume = volume
                }
                let midiNote = noteToDraw.data.midiNote
                let midiVelocity = noteToDraw.data.midiVelocity;
                if (midiVelocity === null || midiVelocity === undefined) {
                    midiVelocity = this.convertWebAudioVolumeIntoMidiVelocity(volume)
                    noteToDraw.data.midiVelocity = midiVelocity
                }
                this.drawNewNoteCircle(xPosition, yPosition, sampleName, label, row, beat, volume, midiNote, midiVelocity)
                noteToDraw = noteToDraw.next
            }
        }
    }

    calculateCircleRadiusForVolume(volume) {
        return Util.calculateLinearConversion(volume, this.configurations.notes.volumes.minimumVolume, this.configurations.notes.volumes.maximumVolume, this.configurations.notes.volumes.minimumCircleRadius, this.configurations.notes.volumes.maximumCircleRadius);
    }

    calculateVolumeForCircleRadius(radius) {
        return Util.calculateLinearConversion(radius, this.configurations.notes.volumes.minimumCircleRadius, this.configurations.notes.volumes.maximumCircleRadius, this.configurations.notes.volumes.minimumVolume, this.configurations.notes.volumes.maximumVolume);
    }

    convertWebAudioVolumeIntoMidiVelocity(webAudioVolume){
        let exactMidiNoteVelocity = Util.calculateLinearConversion(webAudioVolume, this.configurations.notes.volumes.minimumVolume, this.configurations.notes.volumes.maximumVolume, this.configurations.midi.velocity.minimumVelocity, this.configurations.midi.velocity.maximumVelocity)
        let roundedMidiNoteVelocity = Math.round(exactMidiNoteVelocity)
        return Util.confineNumberToBounds(roundedMidiNoteVelocity, this.configurations.midi.velocity.minimumVelocity, this.configurations.midi.velocity.maximumVelocity)
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
        // the same applies for the subdivision lines and the sequencer row line as well,
        // since we want those to be in front of the reference lines, which we are
        // redrawing now.
        this.removeAllCirclesFromDisplay()
        // next we will delete all lines for the changed row
        this.removeSubdivisionHighlightLinesForRow(rowIndex)
        this.removeReferenceHighlightLinesForRow(rowIndex)
        this.removeSequencerRowHighlightLine(rowIndex)
        this.removeSubdivisionLinesForRow(rowIndex)
        this.removeReferenceLinesForRow(rowIndex)
        this.removeSequencerRowLine(rowIndex)
        this.removeTimeTrackingLine(rowIndex)
        // then we will draw all the lines for the changed row, starting with reference lines since they need to be the bottom layer
        this.components.shapes.sequencerRowHighlightLines[rowIndex] = this.initializeSequencerRowLine(rowIndex, this.configurations.sequencerRowHighlightLines.lineWidth, 'transparent');
        this.components.shapes.referenceHighlightLineLists[rowIndex] = this.initializeReferenceLinesForRow(rowIndex, this.configurations.referenceHighlightLines.height, this.configurations.referenceHighlightLines.lineWidth, 'transparent', this.configurations.referenceHighlightLines.topOffset)
        this.components.shapes.subdivisionHighlightLineLists[rowIndex] = this.initializeSubdivisionLinesForRow(rowIndex, this.configurations.subdivisionHighlightLines.height, this.configurations.subdivisionHighlightLines.lineWidth, 'transparent', this.configurations.subdivisionHighlightLines.topOffset)
        this.components.shapes.referenceLineLists[rowIndex] = this.initializeReferenceLinesForRow(rowIndex, this.configurations.referenceLines.height, this.configurations.sequencer.lineWidth, this.configurations.referenceLines.color)
        this.components.shapes.subdivisionLineLists[rowIndex] = this.initializeSubdivisionLinesForRow(rowIndex, this.configurations.subdivisionLines.height, this.configurations.sequencer.lineWidth, this.configurations.subdivisionLines.color)
        this.components.shapes.sequencerRowLines[rowIndex] = this.initializeSequencerRowLine(rowIndex, this.configurations.sequencer.lineWidth, this.configurations.sequencer.color)
        this.components.shapes.timeTrackingLines[rowIndex] = this.initializeTimeTrackingLineForRow(rowIndex)
        // add event listeners to subdivision lines and reference lines
        this.two.update(); // this update needs to happen here so that SVG renders get initialized for subdivision and reference lines, so that we can add event listeners to them
        this.addSequencerRowLineEventListenersForRow(rowIndex)
        this.addSubdivisionLinesEventListenersForRow(rowIndex);
        this.addReferenceLinesEventListenersForRow(rowIndex);
        // then we will add the notes from the sequencer data structure to the display, so the display accurately reflects the current state of the sequencer.
        this.drawAllNoteBankCircles();
        this.drawNotesToReflectSequencerCurrentState();
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
        for (let list of this.components.shapes.subdivisionHighlightLineLists) {
            for (let line of list) {
                line.remove();
            }
            list = [];
        }
        this.components.shapes.subdivisionHighlightLineLists = []
        for (let list of this.components.shapes.referenceLineLists) {
            for (let line of list) {
                line.remove();
            }
            list = [];
        }
        this.components.shapes.referenceLineLists = []
        for (let list of this.components.shapes.referenceHighlightLineLists) {
            for (let line of list) {
                line.remove();
            }
            list = [];
        }
        this.components.shapes.referenceHighlightLineLists = []
        for (let line of this.components.shapes.sequencerRowHighlightLines) {
            line.remove();
        }
        this.components.shapes.sequencerRowHighlightLines = [];
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
        for (let circle of this.components.shapes.volumeAdjusterRowHandles) {
            circle.remove();
        }
        this.components.shapes.volumeAdjusterRowHandles = []
        for (let circle of this.components.shapes.shiftToolRowHandles) {
            circle.remove();
        }
        this.components.shapes.shiftToolRowHandles = []
        this.components.shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        this.components.shapes.sequencerRowHighlightLines = this.initializeAllSequencerRowHighlightLines();
        this.components.shapes.referenceHighlightLineLists = this.initializeAllReferenceHighlightLines();
        this.components.shapes.subdivisionHighlightLineLists = this.initializeAllSubdivisionHighlightLines();
        this.components.shapes.referenceLineLists = this.initializeAllReferenceLines();
        this.components.shapes.subdivisionLineLists = this.initializeAllSubdivisionLines();
        this.components.shapes.sequencerRowLines = this.initializeAllSequencerRowLines();
        this.components.shapes.volumeAdjusterRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.volumeAdjusterRowHandles.leftPadding, this.configurations.volumeAdjusterRowHandles.topPadding, this.configurations.volumeAdjusterRowHandles.radius, this.configurations.volumeAdjusterRowHandles.unselectedColor)
        this.components.shapes.sequencerRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.sequencerRowHandles.leftPadding, this.configurations.sequencerRowHandles.topPadding, this.configurations.sequencerRowHandles.radius, this.configurations.sequencerRowHandles.unselectedColor);
        this.components.shapes.timeTrackingLines = this.initializeTimeTrackingLines();
        this.drawAllNoteBankCircles();
        this.drawNotesToReflectSequencerCurrentState();
        // only draw shift tool row handles if the shift tool is active (as in, if any resources are selected for use with the shift tool)
        let shiftToolIsActivated = this.shiftToolTracker.resourcesToShiftButtonStates.notes || this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines || this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines
        if (shiftToolIsActivated) {
            this.components.shapes.shiftToolRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.shiftToolRowHandles.leftPadding, this.configurations.shiftToolRowHandles.topPadding, this.configurations.shiftToolRowHandles.radius, this.configurations.shiftToolRowHandles.unselectedColor)
        }
        this.two.update(); // needs to go here so we can add event listeners to subdivision and reference lines next
        this.addAllSequencerRowLineEventListeners();
        this.addAllSubdivisionLinesEventListeners();
        this.addAllReferenceLinesEventListeners();
    }

    redrawSequencer() {
        // sequencer border
        this.components.shapes.sequencerBorder.remove();
        this.components.shapes.sequencerBorder = this.initializeSequencerBorder();
        // update mouse event listeners to reflect current state of sequencer (number of rows, etc.)
        this.refreshTwoJsCanvasSize();
        this.refreshWindowMouseMoveEvent();
        this.initializeReferenceLinesShiftPixelsTracker(); // set up variables for handling reference line 'shift' values
        this.initializeSubdivisionLinesShiftPixelsTracker(); // set up variables for handling subdivision line 'shift' values
        // redraw notes and lines
        this.resetNotesAndLinesDisplayForAllRows();
        // redraw html inputs, such as subdivision and reference line text areas, quantization checkboxes
        this.initializeSubdivisionTextInputsValuesAndStyles();
        this.initializeReferenceLineTextInputsValuesAndStyles();
        // redraw two.js shapes, such as 'add row' and 'clear notes for row' button shapes
        // todo: make methods for these so we don't have to pass in the GUI configurations twice when initializing.
        // todo: clean up first GUI initialization so that we can just call a 'redraw' method the first time as well, 
        //       to avoid duplicated code
        for (let shape of this.components.shapes.clearNotesForRowButtonShapes) {
            shape.remove()
        }
        this.components.shapes.clearNotesForRowButtonShapes = []
        this.components.shapes.clearNotesForRowButtonShapes = this.initializeButtonPerSequencerRow(this.configurations.clearRowButtons.topPaddingPerRow, this.configurations.clearRowButtons.leftPaddingPerRow, this.configurations.clearRowButtons.height, this.configurations.clearRowButtons.width); // this is a list of button rectangles, one per row, to clear the notes on that row
        // 'reset reference lines shift' buttons
        for (let shape of this.components.shapes.shiftModeResetReferenceLinesButtons) {
            shape.remove();
        }
        this.components.shapes.shiftModeResetReferenceLinesButtons = []
        this.components.shapes.shiftModeResetReferenceLinesButtons = this.initializeButtonPerSequencerRow(this.configurations.shiftModeResetReferenceLinesForRowButtons.topPaddingPerRow, this.configurations.shiftModeResetReferenceLinesForRowButtons.leftPaddingPerRow, this.configurations.shiftModeResetReferenceLinesForRowButtons.height, this.configurations.shiftModeResetReferenceLinesForRowButtons.width)
        // 'reset subdivision lines shift' buttons
        for (let shape of this.components.shapes.shiftModeResetSubdivisionLinesButtons) {
            shape.remove();
        }
        this.components.shapes.shiftModeResetSubdivisionLinesButtons = []
        this.components.shapes.shiftModeResetSubdivisionLinesButtons = this.initializeButtonPerSequencerRow(this.configurations.shiftModeResetSubdivisionLinesForRowButtons.topPaddingPerRow, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.leftPaddingPerRow, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.height, this.configurations.shiftModeResetSubdivisionLinesForRowButtons.width)
        // 'add sequencer row' button
        this.components.shapes.addRowButtonShape.remove();
        this.components.shapes.addRowButtonShape = this.initializeRectangleShape(this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * (this.sequencer.rows.length - 1)) + this.configurations.addRowButton.topPadding, this.configurations.addRowButton.left, this.configurations.addRowButton.height, this.configurations.addRowButton.width) 
        this.components.shapes.addRowButtonShape.fill = this.configurations.buttonBehavior.clickedButtonColor
        // quantization toggle buttons
        for (let shape of this.components.shapes.toggleQuantizationButtonsRectangles) {
            shape.remove();
        }
        this.components.shapes.toggleQuantizationButtonsRectangles = []
        this.components.shapes.toggleQuantizationButtonsRectangles = this.initializeButtonPerSequencerRow(this.configurations.quantizationButtons.topPaddingPerRow, this.configurations.quantizationButtons.leftPaddingPerRow, this.configurations.quantizationButtons.height, this.configurations.quantizationButtons.width)
        // update two.js so we can add event listeners to shapes
        this.two.update()
        // initialize event listeners
        this.initializeSubdivisionTextInputsEventListeners();
        this.initializeReferenceLineTextInputsEventListeners();
        this.addClearNotesForRowButtonsEventListeners();
        this.addQuantizationButtonShapeEventListeners();
        this.addShiftToolResetReferenceLinesButtonsEventListeners();
        this.addShiftToolResetSubdivisionLinesButtonsEventListeners();
        this.initializeAddRowButtonEventListener();
        this.initializeSequencerRowHandlesEventListeners();
        this.initializeVolumeAdjusterRowHandlesEventListeners();
        this.initializeShiftToolRowHandlesEventListeners();
        // initialize, format, and move button icons into place
        this.initializeIcons(this.configurations.hideIcons)
        if (this.rowSelectionTracker.selectedRowIndex !== null) {
            // if a row is selected, set variables appropriately for moving it around
            this.initializeRowMovementVariablesAndVisuals(this.rowSelectionTracker.selectedRowIndex);
        }
        this.refreshNoteAndShiftDependentButtonsForAllRows();
    }

    /**
     * window 'mouse move' event listener logic
     */

    refreshWindowMouseMoveEvent() {
        if (this.eventHandlerFunctions.windowMouseMove !== null && this.eventHandlerFunctions.windowMouseMove !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            window.removeEventListener('mousemove', this.eventHandlerFunctions.windowMouseMove);
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.windowMouseMove = (event) => this.windowMouseMoveEventHandler(this, event);
        window.addEventListener('mousemove', this.eventHandlerFunctions.windowMouseMove);
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    windowMouseMoveEventHandler(self, event) {
        self.moveNotesAndChangeVolumesMouseMoveHandler(self, event);
    }

    rowVolumeAdjustmentWindowMouseMoveHandler(self, event) {
        event = self.adjustEventCoordinates(event)
        let mouseX = event.pageX
        let mouseY = event.pageY
        let mouseHasMoved = (mouseX !== self.rowVolumeAdjustmentTracker.rowHandleStartingPosition.x || mouseY !== self.rowVolumeAdjustmentTracker.rowHandleStartingPosition.y)
        if (mouseHasMoved) {
            let mouseMoveDistance = self.rowVolumeAdjustmentTracker.rowHandleStartingPosition.y - mouseY; // calculate how far the mouse has moved. only look at one axis of change for now. if that seems weird it can be changed later.
            let volumeAdjustmentAmount = mouseMoveDistance / self.configurations.notes.volumes.volumeAdjustmentSensitivityDivider;
            // iterate through every note in the row that we're adjusting volumes for. we already saved these to a list when we selected the row
            for (let noteCircleIndex = 0; noteCircleIndex < self.rowVolumeAdjustmentTracker.noteCircles.length; noteCircleIndex++) {
                let currentNoteCircle = self.rowVolumeAdjustmentTracker.noteCircles[noteCircleIndex];
                let currentNoteCircleStartingRadius = self.rowVolumeAdjustmentTracker.noteCirclesStartingRadiuses[noteCircleIndex];
                currentNoteCircle.radius = Util.confineNumberToBounds(currentNoteCircleStartingRadius + volumeAdjustmentAmount, self.configurations.notes.volumes.minimumCircleRadius, self.configurations.notes.volumes.maximumCircleRadius);
                currentNoteCircle.guiData.radiusWhenUnplayed = currentNoteCircle.radius;
                let newVolume = self.calculateVolumeForCircleRadius(currentNoteCircle.radius);
                currentNoteCircle.guiData.volume = newVolume;
                currentNoteCircle.guiData.midiVelocity = self.convertWebAudioVolumeIntoMidiVelocity(newVolume);
                // replace the node in the sequencer data structure with an identical note that has the new volume we have set the note to.
                // open question: should we wait until mouse up to actually update the sequencer data structure instead of doing it on mouse move?
                let node = self.sequencer.rows[self.rowVolumeAdjustmentTracker.selectedRowIndex].removeNode(currentNoteCircle.guiData.label);
                node.data.volume = currentNoteCircle.guiData.volume;
                node.data.midiVelocity = currentNoteCircle.guiData.midiVelocity;
                self.sequencer.rows[self.rowVolumeAdjustmentTracker.selectedRowIndex].insertNode(node, currentNoteCircle.guiData.label);
            }
            // we will save the sequencer state to the URL in the 'mouse up' event instead of here, for performance reasons
        }
        let circle = self.components.shapes.volumeAdjusterRowHandles[self.rowVolumeAdjustmentTracker.selectedRowIndex]
        circle.stroke = self.configurations.subdivisionLines.color
        circle.linewidth = 3
        circle.fill = self.configurations.volumeAdjusterRowHandles.selectedColor
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[self.rowVolumeAdjustmentTracker.selectedRowIndex]
        rowSelectionRectangle.stroke = self.configurations.volumeAdjusterRowHandles.selectedColor
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.changeRowVolume
    }

    // this method is very messy. my top priority was to get it working, and not worry about duplicated code or using the most perfect straightforward logic flow.
    // this will definitely need to be refactored later, but that will be easier once we know exactly how everything will work / what the logic needs to do.
    shiftToolMouseMoveEventHandler(self, event){
        event = self.adjustEventCoordinates(event)
        let mouseX = event.pageX
        let mouseY = event.pageY
        let shiftingAnyResource = self.shiftToolTracker.resourcesToShift.notes || self.shiftToolTracker.resourcesToShift.subdivisionLines || self.shiftToolTracker.resourcesToShift.referenceLines
        if (!shiftingAnyResource) {
            return;
        }
        let mouseHasMoved = (mouseX !== self.shiftToolTracker.mouseStartingPosition.x || mouseY !== self.shiftToolTracker.mouseStartingPosition.y)
        if (mouseHasMoved) {
            let mouseMoveDistance = self.shiftToolTracker.mouseStartingPosition.x - mouseX; // calculate how far the mouse has moved. only look at one axis of change for now. if that seems weird it can be changed later.
            if (self.shiftToolTracker.resourcesToShift.subdivisionLines) { // adjust subdivision lines first, because if we move those, the way we move quantized notes also need to change.
                this.shiftSubdivisionsLogic(self, mouseMoveDistance);
            }
            // if the row is quantized and we are moving subdivision lines, move notes too regardless of whether 'shift' is turned on for notes, since the notes have to stay quantized to the subdivision lines
            let notesNeedToBeMovedWithSubdivisionLines = self.shiftToolTracker.resourcesToShift.subdivisionLines && self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].quantized;
            if (self.shiftToolTracker.resourcesToShift.notes || notesNeedToBeMovedWithSubdivisionLines) { // adjust note positions
                this.shiftNotesLogic(self, mouseMoveDistance, self.shiftToolTracker.resourcesToShift.subdivisionLines, self.shiftToolTracker.resourcesToShift.referenceLines)
            }
            if (self.shiftToolTracker.resourcesToShift.referenceLines) { // next deal with adjusting reference row positions
                this.shiftReferenceLinesLogic(self, mouseMoveDistance);
            }
        }
        if (self.shiftToolTracker.updateShiftRowButtonVisuals) {
            let circle = self.components.shapes.shiftToolRowHandles[self.shiftToolTracker.selectedRowIndex]
            circle.stroke = self.configurations.subdivisionLines.color
            circle.linewidth = 3
            circle.fill = self.configurations.shiftToolRowHandles.selectedColor
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[self.shiftToolTracker.selectedRowIndex]
            rowSelectionRectangle.stroke = self.configurations.shiftToolRowHandles.selectedColor
        }
        let shiftNotes = this.shiftToolTracker.resourcesToShift.notes;
        let shiftSubdivisionLines = this.shiftToolTracker.resourcesToShift.subdivisionLines;
        let shiftReferenceLines = this.shiftToolTracker.resourcesToShift.referenceLines;
        let rowIsQuantized = self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].quantized
        this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
    }

    shiftSubdivisionsLogic(self, mouseMoveDistance) {
        // this logic will always be the same regardless of whether the row is quantized or not, since subdivision lines _are_ the grid things get snapped to
        for (let lineIndex = 0; lineIndex < self.components.shapes.subdivisionLineLists[self.shiftToolTracker.selectedRowIndex].length; lineIndex++) {
            let line = self.components.shapes.subdivisionLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
            let hightlightLine = self.components.shapes.subdivisionHighlightLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
            let lineXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.subdivisionLinesStartingPositions[lineIndex] - mouseMoveDistance) - self.configurations.sequencer.left;
            if (lineXPositionAdjustedForSequencerLeftEdge < 0) {
                lineXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + lineXPositionAdjustedForSequencerLeftEdge
            } else if (lineXPositionAdjustedForSequencerLeftEdge > self.configurations.sequencer.width) {
                lineXPositionAdjustedForSequencerLeftEdge = lineXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
            }
            let newLineXPosition = self.configurations.sequencer.left + lineXPositionAdjustedForSequencerLeftEdge
            line.translation.x = newLineXPosition
            hightlightLine.translation.x = newLineXPosition;
        }
        // store values in relevant places
        let shiftInPixels = self.shiftToolTracker.subdivisionLinesStartingShiftInPixels - mouseMoveDistance; 
        shiftInPixels = shiftInPixels % self.configurations.sequencer.width; // shift values repeat when they get to the end of the sequencer, so use modular math to reduce them
        if (shiftInPixels < 0) { // convert negative shift values to equivalent positive ones, so that calculations with them always use a positive number later
            shiftInPixels = shiftInPixels + self.configurations.sequencer.width
        }
        self.subdivisionLinesShiftInPixelsPerRow[self.shiftToolTracker.selectedRowIndex] = shiftInPixels;
        // convert the new shift value to milliseconds, and store that to the sequencer. 
        let shiftAsPercentageOfFullLoop = shiftInPixels / self.configurations.sequencer.width;
        let shiftInMilliseconds = shiftAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis;
        self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].setSubdivisionLineShiftMilliseconds(shiftInMilliseconds)
    }

    shiftNotesLogic(self, mouseMoveDistance, subdivisionLinesAreBeingShiftedToo, referenceLinesAreBeingShiftedToo) {
        // we need to have some different logic here depending on whether the row is quantized or not.
        for (let noteCircleIndex = 0; noteCircleIndex < self.shiftToolTracker.noteCircles.length; noteCircleIndex++) {
            let currentNoteCircle = self.shiftToolTracker.noteCircles[noteCircleIndex];
            let newNoteXPosition;
            let newNoteBeatNumber;
            if (self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].quantized) { // handle note shifting for when the row is quantized)
                if (subdivisionLinesAreBeingShiftedToo) { 
                    // if subdivision lines are being moved along with the notes, just move the notes along with those then figure out new beat numbers afterwards.
                    let shiftInPixels = self.subdivisionLinesShiftInPixelsPerRow[self.shiftToolTracker.selectedRowIndex]
                    let noteXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.noteCirclesStartingPositions[noteCircleIndex] - self.configurations.sequencer.left - mouseMoveDistance);
                    if (noteXPositionAdjustedForSequencerLeftEdge < 0) { // wrap negative values back to the other end of the sequencer
                        noteXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + noteXPositionAdjustedForSequencerLeftEdge
                    } else if (noteXPositionAdjustedForSequencerLeftEdge >= self.configurations.sequencer.width) { // wrap notes beyond the right edge of the sequencer back to the other side
                        noteXPositionAdjustedForSequencerLeftEdge = noteXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
                    }
                    newNoteXPosition = self.configurations.sequencer.left + noteXPositionAdjustedForSequencerLeftEdge
                    let numberOfSubdivisionsInRow = self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].getNumberOfSubdivisions();
                    newNoteBeatNumber = self.getIndexOfClosestSubdivisionLine(newNoteXPosition, numberOfSubdivisionsInRow, shiftInPixels)
                } else { 
                    // if subdivision lines ARE NOT being moved, just check how many beats' distance we have moved the mouse, and base new beat quantizations on that.
                    // that way we can guarantee that all notes will be shifted to a new beat number at the same time, even if there are irregularities in how floating
                    // point precisision / rounding is handled between different beat numbers.
                    let numberOfSubdivisionsInRow = self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].getNumberOfSubdivisions();
                    let widthOfEachBeatInPixels = self.configurations.sequencer.width / numberOfSubdivisionsInRow
                    if (!referenceLinesAreBeingShiftedToo) {
                        // if we get here, we know we're ONLY moving _quantized notes_. in that case, we can set a maximum mouse move distance
                        // required to shift to the next beat, rather than always only relying on the actual width of each beat. this creates
                        // a more responsive user experience if the beats are very wide.
                        let maximumDistanceRequiredToShiftNotes = 50; //todo: move this into gui configurations file
                        widthOfEachBeatInPixels = Math.min(maximumDistanceRequiredToShiftNotes, widthOfEachBeatInPixels);
                    }
                    let shiftInPixels = self.subdivisionLinesShiftInPixelsPerRow[self.shiftToolTracker.selectedRowIndex]
                    let beatsMoved = -1 * (Math.round(mouseMoveDistance / widthOfEachBeatInPixels) % numberOfSubdivisionsInRow);
                    let circleStartingBeat = self.shiftToolTracker.noteCirclesStartingBeats[noteCircleIndex]
                    let startingBeatPlusBeatsMoved = circleStartingBeat + beatsMoved
                    newNoteBeatNumber = startingBeatPlusBeatsMoved;
                    if (newNoteBeatNumber < 0) {
                        newNoteBeatNumber = newNoteBeatNumber + numberOfSubdivisionsInRow
                    } else if (newNoteBeatNumber >= numberOfSubdivisionsInRow) {
                        newNoteBeatNumber = newNoteBeatNumber % numberOfSubdivisionsInRow
                    }
                    newNoteXPosition = self.getXPositionOfSubdivisionLine(newNoteBeatNumber, numberOfSubdivisionsInRow, shiftInPixels)
                }
            } else { // handle note shifting for when the row is _not_ quantized 
                let noteXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.noteCirclesStartingPositions[noteCircleIndex] - self.configurations.sequencer.left - mouseMoveDistance);
                if (noteXPositionAdjustedForSequencerLeftEdge < 0) { // wrap negative values back to the other end of the sequencer
                    noteXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + noteXPositionAdjustedForSequencerLeftEdge
                } else if (noteXPositionAdjustedForSequencerLeftEdge >= self.configurations.sequencer.width) { // wrap notes beyond the right edge of the sequencer back to the other side
                    noteXPositionAdjustedForSequencerLeftEdge = noteXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
                }
                newNoteXPosition = self.configurations.sequencer.left + noteXPositionAdjustedForSequencerLeftEdge
                newNoteBeatNumber = Sequencer.NOTE_IS_NOT_QUANTIZED;
            }
            currentNoteCircle.translation.x = newNoteXPosition;
            currentNoteCircle.guiData.beat = newNoteBeatNumber;
            // replace the node in the sequencer data structure with an identical note that has the new priority (time) we have set the note to.
            // open question: should we wait until mouse up to actually update the sequencer data structure instead of doing it on mouse move?
            let node = self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].removeNode(currentNoteCircle.guiData.label);
            let newNodeTimestampMillis = self.sequencer.loopLengthInMillis * ((newNoteXPosition - self.configurations.sequencer.left) / self.configurations.sequencer.width)
            node.priority = newNodeTimestampMillis;
            node.data.beat = newNoteBeatNumber;
            self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].insertNode(node, currentNoteCircle.guiData.label);
        }
    }

    shiftReferenceLinesLogic(self, mouseMoveDistance) {
        // this logic will always be the same regardless of whether the row is quantized or not, since reference lines can't be snapped to grid.
        for (let lineIndex = 0; lineIndex < self.components.shapes.referenceLineLists[self.shiftToolTracker.selectedRowIndex].length; lineIndex++) {
            let line = self.components.shapes.referenceLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
            let hightlightLine = self.components.shapes.referenceHighlightLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
            let lineXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.referenceLinesStartingPositions[lineIndex] - mouseMoveDistance) - self.configurations.sequencer.left;
            if (lineXPositionAdjustedForSequencerLeftEdge < 0) {
                lineXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + lineXPositionAdjustedForSequencerLeftEdge
            } else if (lineXPositionAdjustedForSequencerLeftEdge > self.configurations.sequencer.width) {
                lineXPositionAdjustedForSequencerLeftEdge = lineXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
            }
            let newLineXPosition = self.configurations.sequencer.left + lineXPositionAdjustedForSequencerLeftEdge
            line.translation.x = newLineXPosition
            hightlightLine.translation.x = newLineXPosition
        }
        // store values in relevant places
        let shiftInPixels = self.shiftToolTracker.referenceLinesStartingShiftInPixels - mouseMoveDistance; 
        shiftInPixels = shiftInPixels % self.configurations.sequencer.width; // shift values repeat when they get to the end of the sequencer, so use modular math to reduce them
        self.referenceLinesShiftInPixelsPerRow[self.shiftToolTracker.selectedRowIndex] = shiftInPixels;
        // convert the new shift value to milliseconds, and store that to the sequencer. 
        let shiftAsPercentageOfFullLoop = shiftInPixels / self.configurations.sequencer.width;
        let shiftInMilliseconds = shiftAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis;
        self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].setReferenceLineShiftMilliseconds(shiftInMilliseconds)
    }

    adjustNoteVolumeMouseMoveLogic(self, mouseX, mouseY) {
        let mouseHasMoved = (mouseX !== self.circleSelectionTracker.circleBeingMoved.translation.x || mouseY !== self.circleSelectionTracker.circleBeingMoved.translation.x)
        if (mouseHasMoved) {
            self.circleSelectionTracker.mostRecentMovementWasVolumeChange = true;
            let mouseMoveDistance = self.circleSelectionTracker.circleBeingMoved.translation.y - mouseY; // calculate how far the mouse has moved. only look at one axis of change for now. if that seems weird it can be changed later.
            let volumeAdjustmentAmount = mouseMoveDistance / self.configurations.notes.volumes.volumeAdjustmentSensitivityDivider;
            // set the note being changed to have the right new radius on the GUI. confine the new radius to the minimum and maximum radius allowed.
            self.circleSelectionTracker.circleBeingMoved.radius = Util.confineNumberToBounds(self.circleSelectionTracker.startingRadius + volumeAdjustmentAmount, self.configurations.notes.volumes.minimumCircleRadius, self.configurations.notes.volumes.maximumCircleRadius);
            self.circleSelectionTracker.circleBeingMoved.guiData.radiusWhenUnplayed = self.circleSelectionTracker.circleBeingMoved.radius;
            // convert the circle radius into a proportionate note volume.
            let newVolume = self.calculateVolumeForCircleRadius(self.circleSelectionTracker.circleBeingMoved.radius);
            if (self.circleSelectionTracker.currentRowNodeIsStoredIn < 0) { // the note we are changing the volume for is in the note bank.
                // todo: eventually, maybe changing the volume of any note in the note bank should change the volume of all notes
                // in the note bank, such that you can adjust the default volume of all new notes that will be pulled from the note bank.
                self.noteBankNoteVolumesTracker[self.circleSelectionTracker.circleBeingMoved.guiData.sampleName].volume = newVolume;
                self.circleSelectionTracker.circleBeingMoved.guiData.volume = newVolume;
                self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity = self.convertWebAudioVolumeIntoMidiVelocity(newVolume);
            } else { // the note we are changing the volume for is on an actual sequencer row (i.e. it's not in the note bank).
                self.circleSelectionTracker.circleBeingMoved.guiData.volume = newVolume;
                self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity = self.convertWebAudioVolumeIntoMidiVelocity(newVolume)
                // replace the node in the sequencer data structure with an identical note that has the new volume we have set the note to.
                // open question: should we wait until mouse up to actually update the sequencer data structure instead of doing it on mouse move?
                let node = self.sequencer.rows[self.circleSelectionTracker.currentRowNodeIsStoredIn].removeNode(self.circleSelectionTracker.circleBeingMoved.guiData.label)
                node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity
                self.sequencer.rows[self.circleSelectionTracker.currentRowNodeIsStoredIn].insertNode(node, self.circleSelectionTracker.circleBeingMoved.guiData.label)
                // we will save the sequencer state to the URL in the 'mouse up' event instead of here, for performance reasons
            }
        }
        self.circleSelectionTracker.circleBeingMoved.stroke = 'black'
        self.circleSelectionTracker.circleBeingMoved.linewidth = 2
        // adjust analytics bar 'note' mode text 
        self.setAnalyticsBarToNoteMode()
        self.setAnalyticsBarNotesModeBeatNumberText(self, self.circleSelectionTracker.circleBeingMoved.guiData.beat, self.circleSelectionTracker.circleBeingMoved.translation.x, self.circleSelectionTracker.circleBeingMoved.guiData.row)
        self.setAnalyticsBarNotesModeReferenceLineNumberText(self, self.circleSelectionTracker.circleBeingMoved.translation.x, self.circleSelectionTracker.circleBeingMoved.guiData.row)
        self.setAnalyticsBarNotesModeVolumeText(self, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
        self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, self.circleSelectionTracker.circleBeingMoved.translation.x, self.circleSelectionTracker.circleBeingMoved.guiData.row)
        self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, self.circleSelectionTracker.circleBeingMoved.translation.x, self.circleSelectionTracker.circleBeingMoved.guiData.row)
    }

    moveNotesAndChangeVolumesMouseMoveHandler(self, event){
        // clicking on a circle sets 'circleBeingMoved' to it. circle being moved will follow mouse movements (i.e. click-drag).
        if (self.circleSelectionTracker.circleBeingMoved !== null) { // handle mousemove events when a note is selected
            event = self.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY
            if (event.ctrlKey) {
                // when the 'ctrl' key is being held while moving a note, change its volume instead of moving it.
                self.adjustNoteVolumeMouseMoveLogic(self, mouseX, mouseY)
            } else {
                if (self.circleSelectionTracker.mostRecentMovementWasVolumeChange) {
                    self.sequencer.playDrumSampleNow(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName, self.circleSelectionTracker.circleBeingMoved.guiData.volume, self.circleSelectionTracker.circleBeingMoved.guiData.midiNote, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
                }
                self.circleSelectionTracker.mostRecentMovementWasVolumeChange = false;
                // store starting position of note before updating its position so we can determine whether it moved later
                let startingPositionOfNote = {
                    x: self.circleSelectionTracker.circleBeingMoved.translation.x,
                    y: self.circleSelectionTracker.circleBeingMoved.translation.y,
                }
                // start with default note movement behavior, for when the note doesn't fall within range of the trash bin, a sequencer line, etc.
                self.circleSelectionTracker.circleBeingMoved.translation.x = mouseX
                self.circleSelectionTracker.circleBeingMoved.translation.y = mouseY
                // update display
                self.circleSelectionTracker.circleBeingMoved.stroke = "black"
                self.components.domElements.images.trashClosedIcon.style.display = 'block'
                self.components.domElements.images.trashOpenIcon.style.display = 'none'
                // adjust analytics bar 'note' mode text 
                self.setAnalyticsBarToNoteMode()
                self.setAnalyticsBarNotesModeBeatNumberText(self, self.circleSelectionTracker.circleBeingMoved.guiData.beat, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                self.setAnalyticsBarNotesModeReferenceLineNumberText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                self.setAnalyticsBarNotesModeVolumeText(self, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
                self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)

                /**
                 * start by snapping the note into place if it is close to something
                 */
                let currentRowMouseIsOn = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW;
                let currentBeatMouseIsOn = Sequencer.NOTE_IS_NOT_QUANTIZED;
                let throwNoteAway = false
                /**
                 * adding stuff here for new 'snap to grid on move' behavior.
                 * this will be the first part of making it so that notes being moved 'snap' into place when they are close to the trash bin or a sequencer line.
                 * this will also be used for 'snapping' notes to subdivision lines (i.e. quantizing them) during placement onto quantized sequencer rows.
                 * todo: add 'update sequence on move' behavior, so that the sequence will be constantly updated as notes are removed / moved around 
                 * (i.e. the sequence will update in real time even before the note being moved is released).
                 */
                // check if the note is within range to be placed in the trash bin. if so, move the circle to the center of the trash bin.
                let centerOfTrashBinX = self.configurations.noteTrashBin.left + (self.configurations.noteTrashBin.width / 2)
                let centerOfTrashBinY = self.configurations.noteTrashBin.top + (self.configurations.noteTrashBin.height / 2)
                let withinHorizontalBoundaryOfNoteTrashBin = (mouseX >= self.configurations.noteTrashBin.left - self.configurations.mouseEvents.notePlacementPadding) && (mouseX <= self.configurations.noteTrashBin.left + self.configurations.noteTrashBin.width + self.configurations.mouseEvents.notePlacementPadding)
                let withinVerticalBoundaryOfNoteTrashBin = (mouseY >= self.configurations.noteTrashBin.top - self.configurations.mouseEvents.notePlacementPadding) && (mouseY <= self.configurations.noteTrashBin.top + self.configurations.noteTrashBin.height + self.configurations.mouseEvents.notePlacementPadding)
                self.components.shapes.noteTrashBinContainer.stroke = 'transparent'
                if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                    self.circleSelectionTracker.circleBeingMoved.translation.x = centerOfTrashBinX
                    self.circleSelectionTracker.circleBeingMoved.translation.y = centerOfTrashBinY
                    // store circle selection info about what row we're on
                    currentRowMouseIsOn = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                    throwNoteAway = true
                    // update some visuals
                    self.circleSelectionTracker.circleBeingMoved.stroke = "red"
                    self.components.domElements.images.trashClosedIcon.style.display = 'none'
                    self.components.domElements.images.trashOpenIcon.style.display = 'block'
                    self.components.shapes.noteTrashBinContainer.stroke = 'red'
                    // adjust analytics bar 'note' mode text 
                    self.setAnalyticsBarToNoteMode()
                    self.setAnalyticsBarNotesModeBeatNumberText(self, -1, -1, -1, true)
                    self.setAnalyticsBarNotesModeReferenceLineNumberText(self, -1, -1, true)
                    self.setAnalyticsBarNotesModeVolumeText(self, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
                    self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, -1, -1, true)
                    self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, -1, -1, true)
                }
                // check if the note is in range to be placed onto a sequencer row. if so, determine which row, and move the circle onto the line where it would be placed
                let sequencerLeftBoundary = self.configurations.sequencer.left - self.configurations.mouseEvents.notePlacementPadding
                let sequencerRightBoundary = (self.configurations.sequencer.left + self.configurations.sequencer.width) + self.configurations.mouseEvents.notePlacementPadding
                let sequencerTopBoundary = self.configurations.sequencer.top - self.configurations.mouseEvents.notePlacementPadding
                let sequencerBottomBoundary = self.configurations.sequencer.top + ((self.sequencer.numberOfRows - 1) * self.configurations.sequencer.spaceBetweenRows) + self.configurations.mouseEvents.notePlacementPadding
                let withinHorizonalBoundaryOfSequencer = (mouseX >= sequencerLeftBoundary) && (mouseX <= sequencerRightBoundary)
                let withinVerticalBoundaryOfSequencer = (mouseY >= sequencerTopBoundary) && (mouseY <= sequencerBottomBoundary)
                if (withinHorizonalBoundaryOfSequencer && withinVerticalBoundaryOfSequencer) {
                    // if we get here, we know the circle is within the vertical and horizontal boundaries of the sequencer.
                    // next we want to do a more fine-grained calculation, for whether it is in range to be placed onto one of the sequencer lines.
                    for(let rowIndex = 0; rowIndex < self.sequencer.numberOfRows; rowIndex++) {
                        let rowActualVerticalLocation = self.configurations.sequencer.top + (rowIndex * self.configurations.sequencer.spaceBetweenRows)
                        let rowActualLeftBound = self.configurations.sequencer.left
                        let rowActualRightBound = self.configurations.sequencer.left + self.configurations.sequencer.width
                        let rowTopLimit = rowActualVerticalLocation - self.configurations.mouseEvents.notePlacementPadding
                        let rowBottomLimit = rowActualVerticalLocation + self.configurations.mouseEvents.notePlacementPadding
                        let rowLeftLimit = rowActualLeftBound - self.configurations.mouseEvents.notePlacementPadding
                        let rowRightLimit = rowActualRightBound + self.configurations.mouseEvents.notePlacementPadding
                        if (mouseX >= rowLeftLimit && mouseX <= rowRightLimit && mouseY >= rowTopLimit && mouseY <= rowBottomLimit) {
                            // correct the padding so the circle falls precisely on an actual sequencer line once mouse is released
                            if (self.sequencer.rows[rowIndex].quantized === true) {
                                // determine which subdivision we are closest to
                                currentBeatMouseIsOn = self.getIndexOfClosestSubdivisionLine(mouseX, self.sequencer.rows[rowIndex].getNumberOfSubdivisions(), self.subdivisionLinesShiftInPixelsPerRow[rowIndex])
                                self.circleSelectionTracker.lastBeatSnappedTo = currentBeatMouseIsOn;
                                self.circleSelectionTracker.circleBeingMoved.translation.x = self.getXPositionOfSubdivisionLine(currentBeatMouseIsOn, self.sequencer.rows[rowIndex].getNumberOfSubdivisions(), self.subdivisionLinesShiftInPixelsPerRow[rowIndex])
                                self.circleSelectionTracker.lastPositionSnappedTo.x = self.circleSelectionTracker.circleBeingMoved.translation.x
                            } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                                self.circleSelectionTracker.circleBeingMoved.translation.x = Util.confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                                self.circleSelectionTracker.lastPositionSnappedTo.x = self.circleSelectionTracker.circleBeingMoved.translation.x
                                currentBeatMouseIsOn = Sequencer.NOTE_IS_NOT_QUANTIZED
                                self.circleSelectionTracker.lastBeatSnappedTo = currentBeatMouseIsOn;
                            }
                            // quantization has a more complicated effect on x position than y. y position will always just be on line, so always just put it there.
                            self.circleSelectionTracker.circleBeingMoved.translation.y = rowActualVerticalLocation;
                            self.circleSelectionTracker.lastPositionSnappedTo.y = self.circleSelectionTracker.circleBeingMoved.translation.y
                            currentRowMouseIsOn = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                            self.circleSelectionTracker.lastRowSnappedTo = currentRowMouseIsOn
                            throwNoteAway = false
                            // adjust analytics bar 'note' mode text 
                            self.setAnalyticsBarToNoteMode()
                            self.setAnalyticsBarNotesModeBeatNumberText(self, self.circleSelectionTracker.circleBeingMoved.guiData.beat, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                            self.setAnalyticsBarNotesModeReferenceLineNumberText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                            self.setAnalyticsBarNotesModeVolumeText(self, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
                            self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                            self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, self.circleSelectionTracker.lastPositionSnappedTo.x, self.circleSelectionTracker.lastRowSnappedTo)
                            break; // we found the row that the note will be placed on, so stop iterating thru rows early
                        }
                    }
                } else {
                    // new secondary trash bin logic: if the note is far enough away from the sequencer, we will throw it out
                    let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - self.configurations.mouseEvents.throwNoteAwaySidesPadding) || (mouseX >= sequencerRightBoundary + self.configurations.mouseEvents.throwNoteAwaySidesPadding)
                    let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding)
                    if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                        self.circleSelectionTracker.circleBeingMoved.stroke = "red" // make the note's outline red so it's clear it will be thrown out
                        currentRowMouseIsOn = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                        throwNoteAway = true
                        // update visuals
                        self.components.domElements.images.trashClosedIcon.style.display = 'none'
                        self.components.domElements.images.trashOpenIcon.style.display = 'block'
                        self.components.shapes.noteTrashBinContainer.stroke = 'red'
                        // adjust analytics bar 'note' mode text 
                        self.setAnalyticsBarToNoteMode()
                        self.setAnalyticsBarNotesModeBeatNumberText(self, -1, -1, -1, true)
                        self.setAnalyticsBarNotesModeReferenceLineNumberText(self, -1, -1, true)
                        self.setAnalyticsBarNotesModeVolumeText(self, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
                        self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, -1, -1, true)
                        self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, -1, -1, true)
                    }
                }
                self.circleSelectionTracker.throwNoteAway = throwNoteAway;
                /**
                 * we are done snapping the note into place. next, change its sequencer row if we need to based on what we previously calculated and stored
                 */
                let node = self.circleSelectionTracker.nodeIfNotStoredInSequencerRow
                // remove the moved note from its old sequencer row if necessary. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
                let noteWasPreviouslySomewhereElse = (startingPositionOfNote.x !== self.circleSelectionTracker.circleBeingMoved.translation.x || startingPositionOfNote.y !== self.circleSelectionTracker.circleBeingMoved.translation.y)
                let noteWasPreviouslyInSequencerRow = self.circleSelectionTracker.currentRowNodeIsStoredIn >= 0
                if (noteWasPreviouslySomewhereElse && noteWasPreviouslyInSequencerRow) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                    node = self.sequencer.rows[self.circleSelectionTracker.currentRowNodeIsStoredIn].removeNode(self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    self.circleSelectionTracker.nodeIfNotStoredInSequencerRow = node
                    self.refreshNoteDependentButtonsForRow(self.circleSelectionTracker.currentRowNodeIsStoredIn) // hide any buttons that should no longer be shown for the row
                    self.circleSelectionTracker.currentRowNodeIsStoredIn = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW;
                    self.circleSelectionTracker.currentBeatNodeIsStoredAt = Sequencer.NOTE_IS_NOT_QUANTIZED
                }
                // add the moved note to its new sequencer row if necessary
                let noteIsBeingAddedToSequencerRow = currentRowMouseIsOn >= 0
                let newNodeTimestampMillis;
                if (noteWasPreviouslySomewhereElse && noteIsBeingAddedToSequencerRow) {
                    // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                    newNodeTimestampMillis = self.sequencer.loopLengthInMillis * ((self.circleSelectionTracker.circleBeingMoved.translation.x - self.configurations.sequencer.left) / self.configurations.sequencer.width)
                    if (node === null) { // this should just mean the circle was pulled from the note bank, so we need to create a node for it
                        if (self.circleSelectionTracker.currentRowNodeIsStoredIn >= 0) { // should be an unreachable case, just checking for safety
                            throw "unexpected case: node was null but 'currentRowNodeIsStoredIn' was not < 0. currentRowNodeIsStoredIn: " + self.circleSelectionTracker.currentRowNodeIsStoredIn + ". node: " + node + "."
                        }
                        // create a new node for the sample that this note bank circle was for. note bank circles have a sample in their GUI data, 
                        // but no real node that can be added to the drum sequencer's data structure, so we need to create one.
                        node = self.sampleBankNodeGenerator.createNewNodeForSample(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName)
                        self.circleSelectionTracker.circleBeingMoved.guiData.label = node.label // the newly generated node will also have a real generated ID (label), use that
                        self.drawNoteBankCircleForSample(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName) // if the note was taken from the sound bank, refill the sound bank
                    }
                    node.priority = newNodeTimestampMillis
                    // add the moved note to its new sequencer row
                    self.sequencer.rows[currentRowMouseIsOn].insertNode(node, self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    node.data.beat = currentBeatMouseIsOn
                    node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                    node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity;
                    node.data.midiNote = self.circleSelectionTracker.circleBeingMoved.guiData.midiNote;
                    self.circleSelectionTracker.circleBeingMoved.guiData.beat = currentBeatMouseIsOn
                    self.refreshNoteDependentButtonsForRow(currentRowMouseIsOn) // show any buttons that should now be shown for the row
                    self.circleSelectionTracker.currentRowNodeIsStoredIn = currentRowMouseIsOn
                    self.circleSelectionTracker.currentBeatNodeIsStoredAt = currentBeatMouseIsOn
                }
            }
            this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.moveNote
        }
        if (self.rowVolumeAdjustmentTracker.selectedRowIndex !== null) { // handle mousemove events when adjusting note volumes for a row
            self.rowVolumeAdjustmentWindowMouseMoveHandler(self, event)
        }
        if (self.rowSelectionTracker.selectedRowIndex !== null) { // handle mousemove events when a row is being moved
            self.rowMovementWindowMouseMoveHandler(self, event);
        }
        if (self.shiftToolTracker.selectedRowIndex !== null) {
            self.shiftToolMouseMoveEventHandler(self, event);
        }
    }

    rowMovementWindowMouseMoveHandler(self, event) {
        event = self.adjustEventCoordinates(event)
        let mouseX = event.pageX
        let mouseY = event.pageY

        let circle = self.components.shapes.sequencerRowHandles[self.rowSelectionTracker.selectedRowIndex]
        circle.stroke = self.configurations.subdivisionLines.color
        circle.linewidth = 3
        circle.fill = self.configurations.sequencerRowHandles.selectedColor
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[self.rowSelectionTracker.selectedRowIndex]
        rowSelectionRectangle.stroke = self.configurations.sequencerRowHandles.selectedColor
        self.components.domElements.images.trashClosedIcon.style.display = 'block'
        self.components.domElements.images.trashOpenIcon.style.display = 'none'

        self.components.shapes.sequencerRowHandles[self.rowSelectionTracker.selectedRowIndex].translation.x = mouseX
        self.components.shapes.sequencerRowHandles[self.rowSelectionTracker.selectedRowIndex].translation.y = mouseY

        // check if the row handle is within range to be placed in the trash bin. if so, move the handle to the center of the trash bin.
        let centerOfTrashBinX = self.configurations.noteTrashBin.left + (self.configurations.noteTrashBin.width / 2)
        let centerOfTrashBinY = self.configurations.noteTrashBin.top + (self.configurations.noteTrashBin.height / 2)
        let withinHorizontalBoundaryOfTrashBin = (mouseX >= self.configurations.noteTrashBin.left - self.configurations.mouseEvents.notePlacementPadding) && (mouseX <= self.configurations.noteTrashBin.left + self.configurations.noteTrashBin.width + self.configurations.mouseEvents.notePlacementPadding)
        let withinVerticalBoundaryOfTrashBin = (mouseY >= self.configurations.noteTrashBin.top - self.configurations.mouseEvents.notePlacementPadding) && (mouseY <= self.configurations.noteTrashBin.top + self.configurations.noteTrashBin.height + self.configurations.mouseEvents.notePlacementPadding)
        if (withinHorizontalBoundaryOfTrashBin && withinVerticalBoundaryOfTrashBin) {
            circle.translation.x = centerOfTrashBinX
            circle.translation.y = centerOfTrashBinY
            rowSelectionRectangle.stroke = "red"
            self.rowSelectionTracker.removeRow = true;
            circle.stroke = "red"
            self.components.domElements.images.trashClosedIcon.style.display = 'none'
            self.components.domElements.images.trashOpenIcon.style.display = 'block'
            self.components.shapes.noteTrashBinContainer.stroke = 'red'
        } else {
            self.rowSelectionTracker.removeRow = false;
            self.components.shapes.noteTrashBinContainer.stroke = 'transparent'
        }

        let xChangeFromStart = self.components.shapes.sequencerRowHandles[self.rowSelectionTracker.selectedRowIndex].translation.x - self.rowSelectionTracker.rowHandleStartingPosition.x
        let yChangeFromStart = self.components.shapes.sequencerRowHandles[self.rowSelectionTracker.selectedRowIndex].translation.y - self.rowSelectionTracker.rowHandleStartingPosition.y

        for (let shapeIndex = 0; shapeIndex < self.rowSelectionTracker.shapes.length; shapeIndex++) {
            self.rowSelectionTracker.shapes[shapeIndex].translation.x = self.rowSelectionTracker.shapesOriginalPositions[shapeIndex].x + xChangeFromStart;
            self.rowSelectionTracker.shapes[shapeIndex].translation.y = self.rowSelectionTracker.shapesOriginalPositions[shapeIndex].y + yChangeFromStart;
        }

        for (let domElementIndex = 0; domElementIndex < self.rowSelectionTracker.domElements.length; domElementIndex++) {
            self.rowSelectionTracker.domElements[domElementIndex].style.left = "" + (self.rowSelectionTracker.domElementsOriginalPositions[domElementIndex].left + xChangeFromStart) + "px"
            self.rowSelectionTracker.domElements[domElementIndex].style.top = "" + (self.rowSelectionTracker.domElementsOriginalPositions[domElementIndex].top + yChangeFromStart) + "px";
        }

        // if the row is far enough away from the sequencer, we will throw it out
        let sequencerLeftBoundary = self.configurations.sequencer.left - self.configurations.mouseEvents.notePlacementPadding
        let sequencerRightBoundary = (self.configurations.sequencer.left + self.configurations.sequencer.width) + self.configurations.mouseEvents.notePlacementPadding
        let sequencerTopBoundary = self.configurations.sequencer.top - self.configurations.mouseEvents.notePlacementPadding
        let sequencerBottomBoundary = self.configurations.sequencer.top + ((self.sequencer.numberOfRows - 1) * self.configurations.sequencer.spaceBetweenRows) + self.configurations.mouseEvents.notePlacementPadding
        let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - self.configurations.mouseEvents.throwRowAwaySidesPadding) || (mouseX >= sequencerRightBoundary + self.configurations.mouseEvents.throwRowAwaySidesPadding)
        let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - self.configurations.mouseEvents.throwRowAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + self.configurations.mouseEvents.throwRowAwayTopAndBottomPadding)
        if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
            circle.stroke = "red"
            rowSelectionRectangle.stroke = "red"
            self.rowSelectionTracker.removeRow = true;
            self.components.domElements.images.trashClosedIcon.style.display = 'none'
            self.components.domElements.images.trashOpenIcon.style.display = 'block'
            self.components.shapes.noteTrashBinContainer.stroke = 'red'
        }

        for(let rowIndex = 0; rowIndex < self.sequencer.numberOfRows; rowIndex++) {
            if (rowIndex === self.rowSelectionTracker.selectedRowIndex) {
                continue;
            }
            let rowHandleActualVerticalLocation = self.configurations.sequencer.top + (self.configurations.sequencer.spaceBetweenRows * rowIndex) + self.configurations.sequencerRowHandles.topPadding;
            let rowHandleActualHorizontalLocation = self.configurations.sequencer.left + self.configurations.sequencerRowHandles.leftPadding;
            let topLimit = rowHandleActualVerticalLocation - self.configurations.mouseEvents.notePlacementPadding
            let bottomLimit = rowHandleActualVerticalLocation + self.configurations.mouseEvents.notePlacementPadding
            let leftLimit = rowHandleActualHorizontalLocation - self.configurations.mouseEvents.notePlacementPadding
            let rightLimit = rowHandleActualHorizontalLocation + self.configurations.mouseEvents.notePlacementPadding + self.configurations.sequencer.width

            if (mouseX >= leftLimit && mouseX <= rightLimit && mouseY >= topLimit && mouseY <= bottomLimit) {
                self.sequencer.moveRowToNewIndex(self.rowSelectionTracker.selectedRowIndex, rowIndex);
                self.rowSelectionTracker.selectedRowIndex = rowIndex
                self.redrawSequencer();
                break; // we found the row that the note will be placed on, so stop iterating thru rows early
            }
        }
        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.moveRow
    }

    /**
     * window 'mouse up' event listener logic
     */

    refreshWindowMouseUpEvent() {
        if (this.eventHandlerFunctions.windowMouseUp !== null && this.eventHandlerFunctions.windowMouseUp !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            window.removeEventListener('mouseup', this.eventHandlerFunctions.windowMouseUp);
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.windowMouseUp = (event) => this.windowMouseUpEventHandler(this, event);
        window.addEventListener('mouseup', this.eventHandlerFunctions.windowMouseUp);
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    windowMouseUpEventHandler(self, event) {
        self.moveNotesAndChangeVolumesMouseUpHandler(self, event);
    }

    rowVolumeAdjustmentWindowMouseUpHandler(self, event) {
        self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        self.rowVolumeAdjustmentTracker.selectedRowIndex = null
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    moveNotesAndChangeVolumesMouseUpHandler(self, event) {
        // handle letting go of notes. lifting your mouse anywhere means you're no longer click-dragging
        if (self.circleSelectionTracker.circleBeingMoved !== null) {
            // deal with moving notes
            /**
             * this is the workflow for determining where to put a circle that we were click-dragging once we release the mouse.
             * how this workflow works (todo: double check that this is all correct):
             * - in the circle.mousedown event, we: 
             *   - note down initial information about circle starting state before being moved
             * - in the window.mousemove event, we:
             *   - check for circle collision with the trash bin. if colliding, cricle's new row is -3.
             *   - check for collision with a sequencer row. if colliding, new row is >= 0 (specifically, the index of the sequencer row it's colliding with).
             *   - if colliding with nothing, new row is -1.
             *   - remove note from its sequencer row if was previously on one but has changed position (which means at least one of either row, beat, or time have changed)
             *   - add note to its new sequencer row if it is now placed onto one
             * - in this window.mouseup event, how we handle states, based on the values we previously set in the window.mousemove event:
             *   - if the note isn't colliding with a sequencer row or the trash bin, put it back wherever it was most recently snapped-in-place to, with no change.
             *   - if the note is in the trash bin, throw it away, unless it came from the note bank, in which case we just but it back onto the note bank 
             *     (i.e. put it back where it came from).
             */
            self.circleSelectionTracker.circleBeingMoved.stroke = "transparent"
            if (self.circleSelectionTracker.lastRowSnappedTo === DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK) {
                // put the note back where it came from (the note bank) without doing anything else
                self.circleSelectionTracker.circleBeingMoved.translation.x = self.circleSelectionTracker.lastPositionSnappedTo.x
                self.circleSelectionTracker.circleBeingMoved.translation.y = self.circleSelectionTracker.lastPositionSnappedTo.y
            } else {
                // we know the note has been snapped somewhere besides the note bank
                if (self.circleSelectionTracker.throwNoteAway) { // only bother throwing away things that came from a row (throwing away note bank notes is pointless)
                    self.removeCircleFromDisplay(self.circleSelectionTracker.circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles and from the two.js canvas
                } else {
                    // the note has been somewhere besides the note bank, and it's not in the trash bin.
                    // it's either already in a row, or it's floating away from the sequencer, not snapped anywhere, having previously been snapped to a sequencer row.
                    if (self.circleSelectionTracker.currentRowNodeIsStoredIn !== self.circleSelectionTracker.lastRowSnappedTo) {
                        // put the note back to the last place it was snapped to.
                        self.circleSelectionTracker.circleBeingMoved.translation.x = self.circleSelectionTracker.lastPositionSnappedTo.x
                        self.circleSelectionTracker.circleBeingMoved.translation.y = self.circleSelectionTracker.lastPositionSnappedTo.y
                        let node = self.circleSelectionTracker.nodeIfNotStoredInSequencerRow
                        if (node === null || node === undefined) { // this assertion is just included here for safety and testing
                            throw "reached an unexpected case. expected node to be stored in circle selection tracker, but it was not."
                        }
                        if (node.label !== self.circleSelectionTracker.circleBeingMoved.guiData.label) { // this assertion is just included here for safety and testing
                            throw "reached an unexpected case. stored node and its circle in circle selection tracker did not have the same label"
                        }
                        // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                        let newNodeTimestampMillis = self.sequencer.loopLengthInMillis * ((self.circleSelectionTracker.circleBeingMoved.translation.x - self.configurations.sequencer.left) / self.configurations.sequencer.width)
                        node.priority = newNodeTimestampMillis
                        // add the moved note to its new sequencer row
                        self.sequencer.rows[self.circleSelectionTracker.lastRowSnappedTo].insertNode(node, node.label)
                        node.data.lastScheduledOnIteration = Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED // mark note as 'not played yet on current iteration'
                        node.data.beat = self.circleSelectionTracker.lastBeatSnappedTo
                        node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                        node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity;
                        node.data.midiNote = self.circleSelectionTracker.circleBeingMoved.guiData.midiNote;
                        self.circleSelectionTracker.circleBeingMoved.guiData.beat = self.circleSelectionTracker.lastBeatSnappedTo
                        self.refreshNoteDependentButtonsForRow(self.circleSelectionTracker.lastRowSnappedTo) // show any buttons that should now be shown for the row
                    }
                }
            }
            // adjust analytics bar 'note' mode text 
            self.setAnalyticsBarToNoteMode()
            self.setAnalyticsBarNotesModeBeatNumberText(self, -1, -1, -1, true)
            self.setAnalyticsBarNotesModeReferenceLineNumberText(self, -1, -1, true)
            self.setAnalyticsBarNotesModeVolumeText(self, -1, true)
            self.setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, -1, -1, true)
            self.setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, -1, -1, true)

            /**
             * next deal with changing note volume 
             */
            let noteVolumeHasChanged = (self.circleSelectionTracker.startingRadius !== self.circleSelectionTracker.circleBeingMoved.guiData.radiusWhenUnplayed);
            if (noteVolumeHasChanged) { 
                // play note on 'mouse up' if the volume has changed, so that we can hear the end result of our volume adjustment.
                self.sequencer.playDrumSampleNow(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName, self.circleSelectionTracker.circleBeingMoved.guiData.volume, self.circleSelectionTracker.circleBeingMoved.guiData.midiNote, self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
            }
            self.setNoteTrashBinVisibility(false)
            // save sequencer state to the URL hash
            self.saveCurrentSequencerStateToUrlHash();
            /**
             * next update the volume of the note in the sample bank that has the same sample as the note being moved,
             * so that it matches the volume of the note being moved. this is meant to give an easy mechanism for 
             * creating many notes with the same volume.
             */
            // update the volume tracker to use the right volume
            self.noteBankNoteVolumesTracker[self.circleSelectionTracker.circleBeingMoved.guiData.sampleName].volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
            // update the actual note in the note bank to have that volume
            self.redrawSequencer(); // todo: this is probably an unnecessarily expensive call to make. we just want to update the note volume in the sample bank. but this seems like  a fast enough way for now. can optimize later if needed.
            self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        }
        event = self.adjustEventCoordinates(event)
        if (self.rowSelectionTracker.selectedRowIndex !== null) {
            self.rowMovementWindowMouseUpHandler(self, event);
        }
        if (self.rowVolumeAdjustmentTracker.selectedRowIndex !== null) {
            self.rowVolumeAdjustmentWindowMouseUpHandler(self, event);
        }
        if (self.shiftToolTracker.selectedRowIndex !== null) {
            self.shiftToolMouseUpEventHandler(self, event);
        }
        self.circleSelectionTracker.circleBeingMoved = null
        self.setNoteTrashBinVisibility(false)
        self.rowSelectionTracker.selectedRowIndex = null
        self.rowVolumeAdjustmentTracker.selectedRowIndex = null
        self.shiftToolTracker.selectedRowIndex = null
    }

    rowMovementWindowMouseUpHandler(self, event) {
        // un-selecting the row will be handled in 'redraw', as long as we set selected row index to null here
        if (self.rowSelectionTracker.removeRow) {
            self.sequencer.removeRowAtIndex(self.rowSelectionTracker.selectedRowIndex);
        }
        self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        self.rowSelectionTracker.selectedRowIndex = null
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    shiftToolMouseUpEventHandler(self, event) {
        self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
        self.unhighlightAllShiftableObjects(self.shiftToolTracker.selectedRowIndex);
        self.shiftToolTracker.selectedRowIndex = null
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }


    /**
     * GUI button icons
     */

    initializeIcons(hideIcons=false) {
        if (hideIcons) { // gives us a mechanism to leave the icons off the sequencer display if we want to
            for (let key of Object.keys(this.components.domElements.images)) {
                this.components.domElements.images[key].remove()
            }
            return;
        }
        // "add row" button icon
        this.components.domElements.images.addIcon.style.width = "" + this.configurations.addRowButton.icon.width + "px"
        this.components.domElements.images.addIcon.style.height = "" + this.configurations.addRowButton.icon.height + "px"
        let addRowButtonTop = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * (this.sequencer.rows.length - 1)) + this.configurations.addRowButton.topPadding
        let addRowButtonLeft = this.configurations.addRowButton.left + (this.configurations.addRowButton.width / 2) // centered within the button shape
        this.components.domElements.images.addIcon.style.top = "" + (addRowButtonTop) + "px"
        this.components.domElements.images.addIcon.style.left = "" + (addRowButtonLeft) + "px"
        // trash bin icon: open
        this.components.domElements.images.trashOpenIcon.style.width = "" + this.configurations.noteTrashBin.icon.width + "px"
        this.components.domElements.images.trashOpenIcon.style.height = "" + this.configurations.noteTrashBin.icon.height + "px"
        this.components.domElements.images.trashOpenIcon.style.left = "" + this.configurations.noteTrashBin.left + "px"
        this.components.domElements.images.trashOpenIcon.style.top = "" + this.configurations.noteTrashBin.top + "px"
        // trash bin icon: closed
        this.components.domElements.images.trashClosedIcon.style.width = "" + this.configurations.noteTrashBin.icon.width + "px"
        this.components.domElements.images.trashClosedIcon.style.height = "" + this.configurations.noteTrashBin.icon.height + "px"
        this.components.domElements.images.trashClosedIcon.style.left = "" + this.configurations.noteTrashBin.left + "px"
        this.components.domElements.images.trashClosedIcon.style.top = "" + this.configurations.noteTrashBin.top + "px"
        // "clear all rows" button
        this.components.domElements.images.clearAllIcon.style.width = "" + this.configurations.clearAllNotesButton.icon.width + "px"
        this.components.domElements.images.clearAllIcon.style.height = "" + this.configurations.clearAllNotesButton.icon.height + "px"
        this.components.domElements.images.clearAllIcon.style.left = "" + this.configurations.clearAllNotesButton.left + "px"
        this.components.domElements.images.clearAllIcon.style.top = "" + this.configurations.clearAllNotesButton.top + "px"
        // pause
        this.components.domElements.images.pauseIcon.style.width = "" + this.configurations.pauseButton.icon.width + "px"
        this.components.domElements.images.pauseIcon.style.height = "" + this.configurations.pauseButton.icon.height + "px"
        this.components.domElements.images.pauseIcon.style.left = "" + this.configurations.pauseButton.left + "px"
        this.components.domElements.images.pauseIcon.style.top = "" + this.configurations.pauseButton.top + "px"
        // play
        this.components.domElements.images.playIcon.style.width = "" + this.configurations.pauseButton.icon.width + "px"
        this.components.domElements.images.playIcon.style.height = "" + this.configurations.pauseButton.icon.height + "px"
        this.components.domElements.images.playIcon.style.left = "" + this.configurations.pauseButton.left + "px"
        this.components.domElements.images.playIcon.style.top = "" + this.configurations.pauseButton.top + "px"
        // loop length input mode: bpm
        this.components.domElements.images.bpmLoopLengthModeIcon.style.width = "" + this.configurations.tempoInputModeSelectionBpmButton.icon.width + "px"
        this.components.domElements.images.bpmLoopLengthModeIcon.style.height = "" + this.configurations.tempoInputModeSelectionBpmButton.icon.height + "px"
        this.components.domElements.images.bpmLoopLengthModeIcon.style.left = "" + this.configurations.tempoInputModeSelectionBpmButton.left + "px"
        this.components.domElements.images.bpmLoopLengthModeIcon.style.top = "" + this.configurations.tempoInputModeSelectionBpmButton.top + "px"
        // loop length input mode: milliseconds
        this.components.domElements.images.millisecondsLoopLengthModeIcon.style.width = "" + this.configurations.tempoInputModeSelectionMillisecondsButton.icon.width + "px"
        this.components.domElements.images.millisecondsLoopLengthModeIcon.style.height = "" + this.configurations.tempoInputModeSelectionMillisecondsButton.icon.height + "px"
        this.components.domElements.images.millisecondsLoopLengthModeIcon.style.left = "" + this.configurations.tempoInputModeSelectionMillisecondsButton.left + "px"
        this.components.domElements.images.millisecondsLoopLengthModeIcon.style.top = "" + this.configurations.tempoInputModeSelectionMillisecondsButton.top + "px"
        // tap tempo
        this.components.domElements.images.tapTempoIcon.style.width = "" + this.configurations.tapTempoButton.icon.width + "px"
        this.components.domElements.images.tapTempoIcon.style.height = "" + this.configurations.tapTempoButton.icon.height + "px"
        this.components.domElements.images.tapTempoIcon.style.left = "" + this.configurations.tapTempoButton.left + "px"
        this.components.domElements.images.tapTempoIcon.style.top = "" + this.configurations.tapTempoButton.top + "px"
        // export pattern to MIDI file
        this.components.domElements.images.exportPatternAsMidiFileIcon.style.width = "" + this.configurations.exportPatternToMidiFileButton.icon.width + "px"
        this.components.domElements.images.exportPatternAsMidiFileIcon.style.height = "" + this.configurations.exportPatternToMidiFileButton.icon.height + "px"
        this.components.domElements.images.exportPatternAsMidiFileIcon.style.left = "" + this.configurations.exportPatternToMidiFileButton.left + "px"
        this.components.domElements.images.exportPatternAsMidiFileIcon.style.top = "" + this.configurations.exportPatternToMidiFileButton.top + "px"
        // activate shift notes
        this.components.domElements.images.activateShiftNotesIcon.style.width = "" + this.configurations.shiftModeMoveNotesButton.icon.width + "px"
        this.components.domElements.images.activateShiftNotesIcon.style.height = "" + this.configurations.shiftModeMoveNotesButton.icon.height + "px"
        this.components.domElements.images.activateShiftNotesIcon.style.left = "" + this.configurations.shiftModeMoveNotesButton.left + "px"
        this.components.domElements.images.activateShiftNotesIcon.style.top = "" + this.configurations.shiftModeMoveNotesButton.top + "px"
        // activate shift subdivision lines
        this.components.domElements.images.activateShiftSubdivisionLinesIcon.style.width = "" + this.configurations.shiftModeMoveSubdivisionLinesButton.icon.width + "px"
        this.components.domElements.images.activateShiftSubdivisionLinesIcon.style.height = "" + this.configurations.shiftModeMoveSubdivisionLinesButton.icon.height + "px"
        this.components.domElements.images.activateShiftSubdivisionLinesIcon.style.left = "" + this.configurations.shiftModeMoveSubdivisionLinesButton.left + "px"
        this.components.domElements.images.activateShiftSubdivisionLinesIcon.style.top = "" + this.configurations.shiftModeMoveSubdivisionLinesButton.top + "px"
        // activate shift reference lines
        this.components.domElements.images.activateShiftReferenceLinesIcon.style.width = "" + this.configurations.shiftModeMoveReferenceLinesButton.icon.width + "px"
        this.components.domElements.images.activateShiftReferenceLinesIcon.style.height = "" + this.configurations.shiftModeMoveReferenceLinesButton.icon.height + "px"
        this.components.domElements.images.activateShiftReferenceLinesIcon.style.left = "" + this.configurations.shiftModeMoveReferenceLinesButton.left + "px"
        this.components.domElements.images.activateShiftReferenceLinesIcon.style.top = "" + this.configurations.shiftModeMoveReferenceLinesButton.top + "px"
        // clear row buttons -- one per row
        for (let icon of this.components.domElements.iconLists.clearRowIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.clearRowIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // create a new copy of the original clear row icon
            let clearRowIcon = this.components.domElements.images.clearRowIcon.cloneNode()
            // make the copy visible
            clearRowIcon.style.display = 'block'
            // set the copy's position -- we will have one per row
            clearRowIcon.style.width = "" + this.configurations.clearRowButtons.icon.width + "px";
            clearRowIcon.style.height = "" + this.configurations.clearRowButtons.icon.height + "px"
            clearRowIcon.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.clearRowButtons.leftPaddingPerRow) + "px"
            clearRowIcon.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.clearRowButtons.topPaddingPerRow) + "px"
            // add event listeners to our icon
            let shapesToAddEventListenersTo = [clearRowIcon] // we don't include the button shape here, only the icon, because the shape event listeners are set up elsewhere
            let eventHandlersHash = {
                "click": () => this.clearRowButtonClickHandler(this, rowIndex),
                "mouseenter": () => this.clearRowButtonMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.clearRowButtonMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("clearNotesForRowIcon" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.clearRowIcons.push(clearRowIcon)
            this.components.domElements.divs.newIcons.appendChild(clearRowIcon)
        }
        this.components.domElements.images.clearRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // lock / unlock (quantize / unquantize) row buttons -- need one per row
        for (let icon of this.components.domElements.iconLists.lockedIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.lockedIcons = [];
        for (let icon of this.components.domElements.iconLists.unlockedIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.unlockedIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // make copies of the original image so that we can freely throw them away or add more
            let lockedIcon = this.components.domElements.images.lockedIcon.cloneNode()
            let unlockedIcon = this.components.domElements.images.unlockedIcon.cloneNode()
            // set visibilty of each icon based on the row's current quantization setting
            // really, we could just make whichever icon is necessary and not make an invisible copy of the other
            // one, but making an invisible copy leaves the door open for optimizing the 'quantize' button a bit later.
            // there is a bit of unnecessary code duplication right now because of this.
            // may clean this up later, for now it's fine.
            if (this.sequencer.rows[rowIndex].quantized) {
                lockedIcon.style.display = 'block'
                unlockedIcon.style.display = 'none'
            } else {
                lockedIcon.style.display = 'none'
                unlockedIcon.style.display = 'block'
            }
            // put each lock icon into the right place, resize it, etc.
            let lockIconsVerticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.subdivisionLineTextInputs.topPaddingPerRow + this.configurations.quantizationButtons.icon.topPaddingPerRow
            let lockIconsHorizontalPosition = this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.quantizationButtons.icon.leftPaddingPerRow
            lockedIcon.style.width = "" + this.configurations.quantizationButtons.icon.width + "px"
            lockedIcon.style.height = "" + this.configurations.quantizationButtons.icon.height + "px"
            lockedIcon.style.left = "" + lockIconsHorizontalPosition + "px"
            lockedIcon.style.top = "" + lockIconsVerticalPosition + "px"
            unlockedIcon.style.width = "" + this.configurations.quantizationButtons.icon.width + "px"
            unlockedIcon.style.height = "" + this.configurations.quantizationButtons.icon.height + "px"
            unlockedIcon.style.left = "" + lockIconsHorizontalPosition + "px"
            unlockedIcon.style.top = "" + lockIconsVerticalPosition + "px"
            // add event listeners for 'locked icon' (row quantization toggle button)
            let shapesToAddEventListenersTo = [lockedIcon] // we don't include the button shape here, only the icon, to keep things simpler for now
            let eventHandlersHash = {
                "click": () => this.setQuantizationButtonClickHandler(this, rowIndex, false),
                "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex], this.configurations.helpText.quantized),
                "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex]),
            }
            this.addEventListenersWithoutDuplicates("turnOffQuantizationForRow" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
            // add event listeners for 'unlocked icon'
            shapesToAddEventListenersTo = [unlockedIcon] // we don't include the button shape here, only the icon, to keep things simpler for now
            eventHandlersHash = {
                "click": () => this.setQuantizationButtonClickHandler(this, rowIndex, true),
                "mouseenter": () => this.simpleButtonHoverMouseEnterLogic(this, this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex], this.configurations.helpText.unquantized),
                "mouseleave": () => this.simpleButtonHoverMouseLeaveLogic(this, this.components.shapes.toggleQuantizationButtonsRectangles[rowIndex]),
            }
            this.addEventListenersWithoutDuplicates("turnOnQuantizationForRow" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
            // add the icons to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.lockedIcons.push(lockedIcon)
            this.components.domElements.iconLists.unlockedIcons.push(unlockedIcon)
            this.components.domElements.divs.newIcons.appendChild(lockedIcon)
            this.components.domElements.divs.newIcons.appendChild(unlockedIcon)
        }
        this.components.domElements.images.unlockedIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        this.components.domElements.images.lockedIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // add reset subdivision lines shift for row icons (one per row)
        for (let icon of this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // create a new copy of the original icon
            let resetSubdivisionsShiftIcon = this.components.domElements.images.resetSubdvisionsLinesShiftForRowIcon.cloneNode()
            // make the copy visible
            resetSubdivisionsShiftIcon.style.display = 'block'
            // set the copy's position -- we will have one per row
            resetSubdivisionsShiftIcon.style.width = "" + this.configurations.shiftModeResetSubdivisionLinesForRowButtons.icon.width + "px";
            resetSubdivisionsShiftIcon.style.height = "" + this.configurations.shiftModeResetSubdivisionLinesForRowButtons.icon.height + "px"
            resetSubdivisionsShiftIcon.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.shiftModeResetSubdivisionLinesForRowButtons.leftPaddingPerRow) + "px"
            resetSubdivisionsShiftIcon.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.shiftModeResetSubdivisionLinesForRowButtons.topPaddingPerRow) + "px"
            // add event listeners to our icon
            let shapesToAddEventListenersTo = [resetSubdivisionsShiftIcon] // we don't include the button shape here, only the icon, because the shape event listeners are set up elsewhere
            let eventHandlersHash = {
                "click": () => this.resetSubdivisionLinesShiftClickHandler(this, rowIndex),
                "mouseenter": () => this.resetSubdivisionLinesShiftMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.resetSubdivisionLinesShiftMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("resetSubdvisionsLinesShiftForRowIcon" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons.push(resetSubdivisionsShiftIcon)
            this.components.domElements.divs.newIcons.appendChild(resetSubdivisionsShiftIcon)
        }
        this.components.domElements.images.resetSubdvisionsLinesShiftForRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // add reset reference lines shift for row icons (one per row)
        for (let icon of this.components.domElements.iconLists.resetReferenceLinesShiftIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.resetReferenceLinesShiftIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // create a new copy of the original icon
            let resetReferenceLinesShiftIcon = this.components.domElements.images.resetReferenceLinesShiftForRowIcon.cloneNode()
            // make the copy visible
            resetReferenceLinesShiftIcon.style.display = 'block'
            // set the copy's position -- we will have one per row
            resetReferenceLinesShiftIcon.style.width = "" + this.configurations.shiftModeResetReferenceLinesForRowButtons.icon.width + "px";
            resetReferenceLinesShiftIcon.style.height = "" + this.configurations.shiftModeResetReferenceLinesForRowButtons.icon.height + "px"
            resetReferenceLinesShiftIcon.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.shiftModeResetReferenceLinesForRowButtons.leftPaddingPerRow) + "px"
            resetReferenceLinesShiftIcon.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.shiftModeResetReferenceLinesForRowButtons.topPaddingPerRow) + "px"
            // add event listeners to our icon
            let shapesToAddEventListenersTo = [resetReferenceLinesShiftIcon] // we don't include the button shape here, only the icon, because the shape event listeners are set up elsewhere
            let eventHandlersHash = {
                "click": () => this.resetReferenceLinesShiftClickHandler(this, rowIndex),
                "mouseenter": () => this.resetReferenceLinesShiftMouseEnterHandler(this, rowIndex),
                "mouseleave": () => this.resetReferenceLinesShiftMouseLeaveHandler(this, rowIndex),
            }
            this.addEventListenersWithoutDuplicates("resetReferenceLinesShiftForRowIcon" + rowIndex, shapesToAddEventListenersTo, eventHandlersHash);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.resetReferenceLinesShiftIcons.push(resetReferenceLinesShiftIcon)
            this.components.domElements.divs.newIcons.appendChild(resetReferenceLinesShiftIcon)
        }
        this.components.domElements.images.resetReferenceLinesShiftForRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // set up 'shift row' icons.
        for (let icon of this.components.domElements.iconLists.shiftRowIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.shiftRowIcons = [];
        // only redraw shift tool icons if the shift tool is active (as in, if any resources are selected for use with the shift tool)
        let shiftToolIsActivated = this.shiftToolTracker.resourcesToShiftButtonStates.notes || this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines || this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines
        if (shiftToolIsActivated) {
            for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
                // make copies of the original image so that we can freely throw them away or add more
                let shiftIcon = this.components.domElements.images.shiftRowIcon.cloneNode();
                // put each icon into the right place, resize it, etc.
                let shiftIconVerticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.shiftToolRowHandles.topPadding + this.configurations.shiftToolRowHandles.icon.topPaddingPerRow;
                let shiftIconHorizontalPosition = this.configurations.sequencer.left + this.configurations.shiftToolRowHandles.leftPadding + this.configurations.shiftToolRowHandles.icon.leftPaddingPerRow;
                shiftIcon.style.width = "" + this.configurations.shiftToolRowHandles.icon.width + "px"
                shiftIcon.style.height = "" + this.configurations.shiftToolRowHandles.icon.height + "px"
                shiftIcon.style.left = "" + shiftIconHorizontalPosition + "px"
                shiftIcon.style.top = "" + shiftIconVerticalPosition + "px"
                // add event listeners to our icon
                if (this.eventHandlerFunctions["shiftRowIcon" + rowIndex] !== null && this.eventHandlerFunctions["shiftRowIcon" + rowIndex] !== undefined) {
                    // remove event listeners if they've already been added to avoid duplicates.
                    // for this one we will make each event type its own hash item, since we have multiple types.
                    shiftIcon.removeEventListener('mouseenter', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseenter'] );
                    shiftIcon.removeEventListener('mouseleave', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseleave'] );
                    shiftIcon.removeEventListener('mousedown', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mousedown'] );
                    shiftIcon.removeEventListener('mouseup', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseup'] );
                }
                // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
                this.eventHandlerFunctions["shiftRowIcon" + rowIndex] = {
                    mouseenter: () => {
                        if (this.shiftToolTracker.selectedRowIndex === null) {
                            let shiftNotes = this.shiftToolTracker.resourcesToShiftButtonStates.notes;
                            let shiftSubdivisionLines = this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines;
                            let shiftReferenceLines = this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines;
                            let rowIsQuantized = this.sequencer.rows[rowIndex].quantized
                            this.setHelpTextForShiftTool(rowIsQuantized, shiftNotes, shiftSubdivisionLines, shiftReferenceLines);
                            this.shiftRowMouseEnterEventHandler(this, rowIndex)
                        }
                    },
                    mouseleave: () => {
                        this.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
                        this.shiftRowMouseLeaveEventHandler(this, rowIndex)
                    },
                    mousedown: (event) => this.shiftRowMouseDownEventHandler(this, event, rowIndex),
                    mouseup: () => this.shiftRowMouseUpEventHandler(this, rowIndex),
                };
                shiftIcon.addEventListener('mouseenter', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseenter']);
                shiftIcon.addEventListener('mouseleave', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseleave']);
                shiftIcon.addEventListener('mousedown', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mousedown']);
                shiftIcon.addEventListener('mouseup', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseup']);
                // add the icons to the dom and to our list that tracks these icons
                this.components.domElements.iconLists.shiftRowIcons.push(shiftIcon)
                this.components.domElements.divs.newIcons.appendChild(shiftIcon)
                // hide the icons for now until they have event listeners and we adjust the layout to include them, etc.
                shiftIcon.style.display = 'block';
            }
        }
        // we can use original 'shift' icon image in the 'shift tool' menu to show what the shift tool looks like. we can still make more clones of it as we need to.
        this.components.domElements.images.shiftRowIcon.style.display = 'none'
        this.components.domElements.images.shiftRowIcon.style.left = "" + this.configurations.shiftModeMenuIcon.left + "px"
        this.components.domElements.images.shiftRowIcon.style.top = "" + this.configurations.shiftModeMenuIcon.top + "px"
        this.components.domElements.images.shiftRowIcon.style.width = "" + this.configurations.shiftModeMenuIcon.width + "px"
        this.components.domElements.images.shiftRowIcon.style.height = "" + this.configurations.shiftModeMenuIcon.height + "px"
        // set up 'move row' icons.
        for (let icon of this.components.domElements.iconLists.moveRowIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.moveRowIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // make copies of the original image so that we can freely throw them away or add more
            let moveIcon = this.components.domElements.images.moveRowIcon.cloneNode();
            // put each icon into the right place, resize it, etc.
            let moveIconVerticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.sequencerRowHandles.topPadding + this.configurations.sequencerRowHandles.icon.topPaddingPerRow;
            let moveIconHorizontalPosition = this.configurations.sequencer.left + this.configurations.sequencerRowHandles.leftPadding + this.configurations.sequencerRowHandles.icon.leftPaddingPerRow;
            moveIcon.style.width = "" + this.configurations.sequencerRowHandles.icon.width + "px"
            moveIcon.style.height = "" + this.configurations.sequencerRowHandles.icon.height + "px"
            moveIcon.style.left = "" + moveIconHorizontalPosition + "px"
            moveIcon.style.top = "" + moveIconVerticalPosition + "px"
            // add event listeners to our icon
            if (this.eventHandlerFunctions["moveRowIcon" + rowIndex] !== null && this.eventHandlerFunctions["moveRowIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates.
                // for this one we will make each event type its own hash item, since we have multiple types.
                moveIcon.removeEventListener('mouseenter', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseenter'] );
                moveIcon.removeEventListener('mouseleave', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseleave'] );
                moveIcon.removeEventListener('mousedown', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mousedown'] );
                moveIcon.removeEventListener('mouseup', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseup'] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["moveRowIcon" + rowIndex] = {
                mouseenter: () => this.moveRowMouseEnterEventHandler(this, rowIndex),
                mouseleave: () => this.moveRowMouseLeaveEventHandler(this, rowIndex),
                mousedown: () => this.moveRowMouseDownEventHandler(this, rowIndex),
                mouseup: () => this.moveRowMouseUpEventHandler(this, rowIndex),
            };
            moveIcon.addEventListener('mouseenter', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseenter']);
            moveIcon.addEventListener('mouseleave', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseleave']);
            moveIcon.addEventListener('mousedown', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mousedown']);
            moveIcon.addEventListener('mouseup', this.eventHandlerFunctions["moveRowIcon" + rowIndex]['mouseup']);
            // add the icons to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.moveRowIcons.push(moveIcon)
            this.components.domElements.divs.newIcons.appendChild(moveIcon)
            // hide the icons for now until they have event listeners and we adjust the layout to include them, etc.
            moveIcon.style.display = 'block';
        }
        // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        this.components.domElements.images.moveRowIcon.style.display = 'none'
        // set up 'change note volumes for row' icons.
        for (let icon of this.components.domElements.iconLists.changeRowVolumesIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.changeRowVolumesIcons = [];
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            // make copies of the original image so that we can freely throw them away or add more
            let changeRowVolumeIcon = this.components.domElements.images.changeRowVolumesIcon.cloneNode();
            // put each icon into the right place, resize it, etc.
            let changeRowVolumeIconVerticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.volumeAdjusterRowHandles.topPadding + this.configurations.volumeAdjusterRowHandles.icon.topPaddingPerRow;
            let changeRowVolumeIconHorizontalPosition = this.configurations.sequencer.left + this.configurations.volumeAdjusterRowHandles.leftPadding + this.configurations.volumeAdjusterRowHandles.icon.leftPaddingPerRow;
            changeRowVolumeIcon.style.width = "" + this.configurations.volumeAdjusterRowHandles.icon.width + "px"
            changeRowVolumeIcon.style.height = "" + this.configurations.volumeAdjusterRowHandles.icon.height + "px"
            changeRowVolumeIcon.style.left = "" + changeRowVolumeIconHorizontalPosition + "px"
            changeRowVolumeIcon.style.top = "" + changeRowVolumeIconVerticalPosition + "px"
            // add event listeners to our icon
            if (this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex] !== null && this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates.
                // for this one we will make each event type its own hash item, since we have multiple types.
                changeRowVolumeIcon.removeEventListener('mouseenter', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseenter'] );
                changeRowVolumeIcon.removeEventListener('mouseleave', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseleave'] );
                changeRowVolumeIcon.removeEventListener('mousedown', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mousedown'] );
                changeRowVolumeIcon.removeEventListener('mouseup', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseup'] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex] = {
                mouseenter: () => this.changeRowVolumesMouseEnterEventHandler(this, rowIndex),
                mouseleave: () => this.changeRowVolumesMouseLeaveEventHandler(this, rowIndex),
                mousedown: () => this.changeRowVolumesMouseDownEventHandler(this, rowIndex),
                mouseup: () => this.changeRowVolumesMouseUpEventHandler(this, rowIndex),
            };
            changeRowVolumeIcon.addEventListener('mouseenter', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseenter']);
            changeRowVolumeIcon.addEventListener('mouseleave', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseleave']);
            changeRowVolumeIcon.addEventListener('mousedown', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mousedown']);
            changeRowVolumeIcon.addEventListener('mouseup', this.eventHandlerFunctions["changeRowVolumesIcon" + rowIndex]['mouseup']);
            // add the icons to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.changeRowVolumesIcons.push(changeRowVolumeIcon)
            this.components.domElements.divs.newIcons.appendChild(changeRowVolumeIcon)
            changeRowVolumeIcon.style.display = 'block';
        }
        // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        this.components.domElements.images.changeRowVolumesIcon.style.display = 'none'
    }

    /**
     * we will hide buttons that don't need to be shown. for example, if there aren't any notes on a row,
     * we don't need to show the volume adjuster, the 'shift notes only' 
     */

    refreshNoteAndShiftDependentButtonsForAllRows() {
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            this.refreshNoteDependentButtonsForRow(rowIndex);
            this.refreshShiftDependentButtonsForRow(rowIndex);
        }
    }

    // some buttons don't need to be shown if a row doesn't have any notes. adjust the visibility of those buttons here.
    refreshNoteDependentButtonsForRow(rowIndex) {
        if (this.sequencer.rows[rowIndex]._notesList.head === null || this.sequencer.rows[rowIndex]._notesList.head === undefined) {
            // hide stuff that shouldn't be visible if there are no notes on the row. this includes..
            // 'change volume' button, 'delete all notes for row' button
            // start with 'change row volumes' button shape
            this.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents = false;
            this.components.shapes.volumeAdjusterRowHandles[rowIndex].stroke = 'transparent';
            // next do 'change row volumes' button icon
            this.components.domElements.iconLists.changeRowVolumesIcons[rowIndex].style.display = 'none'
            // 'delete all notes for row' button shape
            this.components.shapes.clearNotesForRowButtonShapes[rowIndex].guiData.respondToEvents = false;
            this.components.shapes.clearNotesForRowButtonShapes[rowIndex].stroke = 'transparent';
            // 'delete all notes for row' button icon
            this.components.domElements.iconLists.clearRowIcons[rowIndex].style.display = 'none'
            // if shift mode is active and we are only shifting notes but there aren't any notes present, don't show the shift button
            if (this.shiftToolTracker.resourcesToShiftButtonStates.notes && !this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines && !this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines) {
                // start with the button shape
                this.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents = false;
                this.components.shapes.shiftToolRowHandles[rowIndex].stroke = 'transparent'
                // then the button icon
                this.components.domElements.iconLists.shiftRowIcons[rowIndex].style.display = 'none'
            }
        } else {
            // show stuff that should be visible when there are notes on the row
            // start with 'change row volumes' button shape
            this.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents = true;
            this.components.shapes.volumeAdjusterRowHandles[rowIndex].stroke = this.configurations.volumeAdjusterRowHandles.selectedColor;
            // next do 'change row volumes' button icon
            this.components.domElements.iconLists.changeRowVolumesIcons[rowIndex].style.display = 'block'
            // 'delete all notes for row' button shape
            this.components.shapes.clearNotesForRowButtonShapes[rowIndex].guiData.respondToEvents = true;
            this.components.shapes.clearNotesForRowButtonShapes[rowIndex].stroke = 'black';
            // 'delete all notes for row' button icon
            this.components.domElements.iconLists.clearRowIcons[rowIndex].style.display = 'block'
            // if shift mode is active and we are only shifting notes and there are notes present, show the shift button
            if (this.shiftToolTracker.resourcesToShiftButtonStates.notes && !this.shiftToolTracker.resourcesToShiftButtonStates.subdivisionLines && !this.shiftToolTracker.resourcesToShiftButtonStates.referenceLines) {
                // start with the button shape
                this.components.shapes.shiftToolRowHandles[rowIndex].guiData.respondToEvents = true;
                this.components.shapes.shiftToolRowHandles[rowIndex].stroke = this.configurations.shiftToolRowHandles.selectedColor;
                // then the button icon
                this.components.domElements.iconLists.shiftRowIcons[rowIndex].style.display = 'block'
            }
        }
    }

    // some buttons don't need to be shown if a row ins't shifted. adjust the visibility of those buttons here.
    refreshShiftDependentButtonsForRow(rowIndex){
        if (this.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds() === 0) {
            // hide stuff that shouldn't be visible if the row's subdivisions aren't shifted. this includes..
            // 'reset subdivision shift for row' button shape
            this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].guiData.respondToEvents = false;
            this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].stroke = 'transparent';
            // 'reset subdivision shift for row' button icon
            this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons[rowIndex].style.display = 'none'
        } else {
            // show stuff that should be visible when the row's subdivisions are shifted
            // 'reset subdivision shift for row' button shape
            this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].guiData.respondToEvents = true;
            this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].stroke = 'black';
            // 'reset subdivision shift for row' button icon
            this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons[rowIndex].style.display = 'block'
        }
        if (this.sequencer.rows[rowIndex].getReferenceLineShiftInMilliseconds() === 0) {
            // hide stuff that shouldn't be visible if the row's reference lines aren't shifted. this includes..
            // 'reset reference lines shift for row' button shape
            this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].guiData.respondToEvents = false;
            this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].stroke = 'transparent';
            // 'reset reference lines shift for row' button icon
            this.components.domElements.iconLists.resetReferenceLinesShiftIcons[rowIndex].style.display = 'none'
        } else {
            // show stuff that should be visible when the row's reference lines are shifted
            // 'reset reference lines shift for row' button shape
            this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].guiData.respondToEvents = true;
            this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].stroke = 'black';
            // 'reset reference lines shift for row' button icon
            this.components.domElements.iconLists.resetReferenceLinesShiftIcons[rowIndex].style.display = 'block'
        }
    }

    /**
     * Analytics bar logic
     */

    // show the analytics bar on the GUI
    showAnalyticsBar(){
        this.components.domElements.divs.analyticsBar.style.display = 'block'
    }

    // hide the analytics bar on the GUI
    hideAnalyticsBar(){
        this.components.domElements.divs.analyticsBar.style.display = 'none'
    }

    // set the analytics bar to 'note' mode, where it will show text giving information about a particular note in the drum machine
    setAnalyticsBarToNoteMode(){
        this.components.domElements.divs.analyticsBarNoteModeText.style.display = 'block'
        this.components.domElements.divs.analyticsBarLinesModeText.style.display = 'none'
    }

    // set the analytics bar to 'lines' mode, where it will show text giving information about the beat 
    // lines and reference lines and their shift values for a particular sequencer row on the drum machine 
    setAnalyticsBarToLinesMode(){
        this.components.domElements.divs.analyticsBarNoteModeText.style.display = 'none'
        this.components.domElements.divs.analyticsBarLinesModeText.style.display = 'block'
    }

    /**
     * for the analytics bar when in 'note' mode, set the text that describes the beat number of the note being analyzed. 
     * 
     * @param self: search for comment "a general note about the 'self' paramater" within this file for info on its use here
     * @param beatNumber: the beat number that the note falls within, or closest beat number, counting from the left. 
     *                    this number is only defined for quantized sequencer rows. if a row is not quantized, we will have to
     *                    calculate what beat the note falls within using the noteXPosition parameter instead.
     * @param noteXPosition: the x position of the note being moved. this is needed for calculating what 'beat' we fall within
     *                       on an unquantized sequencer row, since such rows don't actually track beat numbers for notes.
     * @param sequencerRowIndex: the index of the sequencer row this note is on. will be used to determine that the note is on a legitimate row, 
     *                           then to determine the total number of beats on that row.
     * @param hideValues: if this is set to true, the beat number and total number of beats isn't relevant, so won't be shown.
     *                    for example, notes in the note bank don't have a relevant beat number to show, nor do notes on unquantized sequencer rows.
     *                    also hide values if no note is being analyzed currently.
     */
    setAnalyticsBarNotesModeBeatNumberText(self, beatNumber, noteXPosition, sequencerRowIndex, hideValues=false){
        if (hideValues || sequencerRowIndex < 0) {
            self.components.domElements.text.analyticsBarNoteModeBeatNumber.innerHTML = "beat line: -"
            return;
        }
        let totalNumberOfBeats = self.sequencer.rows[sequencerRowIndex].getNumberOfSubdivisions()
        if (self.sequencer.rows[sequencerRowIndex].quantized) {
            self.components.domElements.text.analyticsBarNoteModeBeatNumber.innerHTML = "beat line: " + (beatNumber + 1) + " of " + totalNumberOfBeats
        } else {
            let closestBeatNumberToTheLeft = self.getIndexOfClosestSubdivisionLineToTheLeft(noteXPosition, totalNumberOfBeats, self.subdivisionLinesShiftInPixelsPerRow[sequencerRowIndex])
            self.components.domElements.text.analyticsBarNoteModeBeatNumber.innerHTML = "beat line: " + (closestBeatNumberToTheLeft + 1) + " of " + totalNumberOfBeats
        }
        
    }

    /**
     * for the analytics bar when in 'note' mode, set the text that describes the beat number of the note being analyzed. 
     * 
     * @param self: search for comment "a general note about the 'self' paramater" within this file for info on its use here
     * @param noteXPosition: the x position of the note being moved. this is needed for calculating what reference line number we fall within,
     *                       since the sequencer doesn't actually track this value for each note.
     * @param sequencerRowIndex: the index of the sequencer row this note is on. will be used to determine that the note is on a legitimate row, 
     *                           then to determine the total number of reference lines on that row.
     * @param hideValues: if this is set to true, the reference line number and total number of reference lines isn't relevant, so won't be shown.
     *                    for example, notes in the note bank don't have a relevant reference line number to show, nor do notes on sequencer rows 
     *                    with zero reference lines. also hide values if no note is being analyzed currently.
     */
    setAnalyticsBarNotesModeReferenceLineNumberText(self, noteXPosition, sequencerRowIndex, hideValues=false){
        if (hideValues || sequencerRowIndex < 0) {
            self.components.domElements.text.analyticsBarNoteModeReferenceLineNumber.innerHTML = "visual line: -"
            return;
        }
        let totalNumberOfReferenceLines = self.sequencer.rows[sequencerRowIndex].getNumberOfReferenceLines()
        let closestReferenceLineNumberToTheLeft = self.getIndexOfClosestSubdivisionLineToTheLeft(noteXPosition, totalNumberOfReferenceLines, self.referenceLinesShiftInPixelsPerRow[sequencerRowIndex])
        self.components.domElements.text.analyticsBarNoteModeReferenceLineNumber.innerHTML = "visual line: " + (closestReferenceLineNumberToTheLeft + 1) + " of " + totalNumberOfReferenceLines
    }

    // for the analytics bar when in 'note' mode, set the text that describes the volume of the note being analyzed
    setAnalyticsBarNotesModeVolumeText(self, volume, hideValues=false){
        if (hideValues) {
            self.components.domElements.text.analyticsBarNoteModeVolume.innerHTML = "-"
            return;
        }
        self.components.domElements.text.analyticsBarNoteModeVolume.innerHTML = "" + volume + " of 127" // 127 is the maximum MIDI note volume, using that unless I think of a better way to express volume
    }

    /**
     * for the analytics bar when in 'note' mode, set the text that describes the distance of the note being analyzed from the nearest
     * beats to its left and right. These values are shown as both percentages of a beat, and as a number of milliseconds.
     * 
     * Note that if a note falls directly on a beat (such as when a row is quantized), the distance from left and the distance from right will both be described
     * as zero, since these values won't really be useful anyway and that seems like the least confusing way to handle that situation.
     * 
     * @param self: search for comment "a general note about the 'self' paramater" within this file for info on its use here
     * @param noteXPosition: the x position of the note being moved. this is needed for calculating what 'beat' we fall within
     *                       on an unquantized sequencer row, since such rows don't actually track beat numbers for notes,
     *                       then will also be used to calculate how far the note actually is from that beat.
     * @param sequencerRowIndex: the index of the sequencer row this note is on. will be used to determine that the note is on a legitimate row, 
     *                           then to determine the total number of beats on that row, and whether that row is quantized.
     * @param hideValues: if set to true, don't show any values. for example if no note is currently being analyzed.
     */
    setAnalyticsBarNotesModeDistanceFromBeatLinesText(self, noteXPosition, sequencerRowIndex, hideValues=false){
        if (hideValues || sequencerRowIndex < 0) {
            self.components.domElements.text.analyticsBarNoteModeDistanceFromBeatsPercent.innerHTML = "-"
            self.components.domElements.text.analyticsBarNoteModeDistanceFromBeatsMilliseconds.innerHTML = "-"
            return;
        }
        // if the sequencer row is quantized, the distances will always be 0, so initialize them as 0 to start
        let distanceFromLeftBeatAsPercent = 0
        let distanceFromRightBeatAsPercent = 0
        let distanceFromLeftBeatInMilliseconds = 0
        let distanceFromRightBeatInMilliseconds = 0
        let numberOfSubdivisions = self.sequencer.rows[sequencerRowIndex].getNumberOfSubdivisions()
        let widthOfEachSubdivision = self.configurations.sequencer.width / numberOfSubdivisions
        let subdivisionsLengthMillis = Math.round((widthOfEachSubdivision / self.configurations.sequencer.width) * self.sequencer.loopLengthInMillis)
        if (!self.sequencer.rows[sequencerRowIndex].quantized) {
            // figure out how far the note is from the nearest subdivision to its left.
            let remainderOfNoteXPositionWithinSubdivisionLines = self.getXDistanceFromClosestSubdivisionToTheLeft(noteXPosition, numberOfSubdivisions, self.subdivisionLinesShiftInPixelsPerRow[sequencerRowIndex])
            // now we can convert this distance value -- which has a unit of 'pixels' -- into a percentage of the width of each subdivision.
            let percentageWithinBeatFromTheLeft = remainderOfNoteXPositionWithinSubdivisionLines / widthOfEachSubdivision
            distanceFromLeftBeatAsPercent = Math.round(percentageWithinBeatFromTheLeft * 100)
            distanceFromRightBeatAsPercent = (100 - distanceFromLeftBeatAsPercent)
            if (distanceFromLeftBeatAsPercent === 0 || distanceFromRightBeatAsPercent === 0) {
                distanceFromLeftBeatAsPercent = 0
                distanceFromRightBeatAsPercent = 0
            }
            // now we can convert the distance value -- which has a unit of 'pixels' -- into milliseconds
            let distanceFromLeftBeatAsPercentageOfFullLoop = remainderOfNoteXPositionWithinSubdivisionLines / self.configurations.sequencer.width;
            distanceFromLeftBeatInMilliseconds = Math.round(distanceFromLeftBeatAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis);
            let distanceFromRightBeatAsPercentageOfFullLoop = (widthOfEachSubdivision - remainderOfNoteXPositionWithinSubdivisionLines) / self.configurations.sequencer.width
            distanceFromRightBeatInMilliseconds = Math.round(distanceFromRightBeatAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis);
            if (distanceFromLeftBeatInMilliseconds === 0 || distanceFromRightBeatInMilliseconds === 0) {
                distanceFromLeftBeatInMilliseconds = 0
                distanceFromRightBeatInMilliseconds = 0
            }
        }
        // update analytics bar text
        self.components.domElements.text.analyticsBarNoteModeDistanceFromBeatsPercent.innerHTML = "+" + distanceFromLeftBeatAsPercent + "% / -" + distanceFromRightBeatAsPercent + "%"
        self.components.domElements.text.analyticsBarNoteModeDistanceFromBeatsMilliseconds.innerHTML = "|+" + distanceFromLeftBeatInMilliseconds + "ms / -" + distanceFromRightBeatInMilliseconds + "ms| of " + subdivisionsLengthMillis + "ms"
    }

    /**
     * for the analytics bar when in 'note' mode, set the text that describes the distance of the note being analyzed from the nearest
     * reference lines to its left and right. These values are shown as both percentages of the distance between each reference line, 
     * and as a number of milliseconds.
     * 
     * Note that if a note falls directly on a reference line, the distance from left and the distance from right will both be described
     * as zero, since these values won't really be useful anyway and that seems like the least confusing way to handle that situation.
     * 
     * @param self: search for comment "a general note about the 'self' paramater" within this file for info on its use here
     * @param noteXPosition: the x position of the note being moved. this is needed for calculating which reference line we fall within
     *                       on an unquantized sequencer row, then will also be used to calculate how far the note actually is from those lines.
     * @param sequencerRowIndex: the index of the sequencer row this note is on. will be used to determine that the note is on a legitimate row, 
     *                           then to determine the total number of reference lines on that row.
     * @param hideValues: if set to true, don't show any values. for example if no note is currently being analyzed.
     */
    setAnalyticsBarNotesModeDistanceFromReferenceLinesText(self, noteXPosition, sequencerRowIndex, hideValues=false){
        if (hideValues || sequencerRowIndex < 0) {
            self.components.domElements.text.analyticsBarNoteModeDistanceFromReferenceLinesPercent.innerHTML = "-"
            self.components.domElements.text.analyticsBarNoteModeDistanceFromReferenceLinesMilliseconds.innerHTML = "-"
            return;
        }
        // notes can't be quantized to reference lines, so these initial values will always need to be overwritten
        let distanceFromLeftLineAsPercent = -1
        let distanceFromRightLineAsPercent = -1
        let distanceFromLeftLineInMilliseconds = -1
        let distanceFromRightLineInMilliseconds = -1
        let numberOfReferenceLines = self.sequencer.rows[sequencerRowIndex].getNumberOfReferenceLines()
        let widthOfEachReferenceLineSubdivision = self.configurations.sequencer.width / numberOfReferenceLines
        let referenceLineSubdivisionsLengthMillis = Math.round((widthOfEachReferenceLineSubdivision / self.configurations.sequencer.width) * self.sequencer.loopLengthInMillis)
        // figure out how far the note is from the nearest reference line to its left.
        let remainderOfNoteXPositionWithinReferenceLines = self.getXDistanceFromClosestSubdivisionToTheLeft(noteXPosition, numberOfReferenceLines, self.referenceLinesShiftInPixelsPerRow[sequencerRowIndex])
        // now we can convert this distance value -- which has a unit of 'pixels' -- into a percentage of the width of each reference line subdivision.
        let percentageWithinLineFromTheLeft = remainderOfNoteXPositionWithinReferenceLines / widthOfEachReferenceLineSubdivision
        distanceFromLeftLineAsPercent = Math.round(percentageWithinLineFromTheLeft * 100)
        distanceFromRightLineAsPercent = (100 - distanceFromLeftLineAsPercent)
        if (distanceFromLeftLineAsPercent === 0 || distanceFromRightLineAsPercent === 0) {
            distanceFromLeftLineAsPercent = 0
            distanceFromRightLineAsPercent = 0
        }
        // now we can convert the distance value -- which has a unit of 'pixels' -- into milliseconds
        let distanceFromLeftLineAsPercentageOfFullLoop = remainderOfNoteXPositionWithinReferenceLines / self.configurations.sequencer.width;
        distanceFromLeftLineInMilliseconds = Math.round(distanceFromLeftLineAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis);
        let distanceFromRightLineAsPercentageOfFullLoop = (widthOfEachReferenceLineSubdivision - remainderOfNoteXPositionWithinReferenceLines) / self.configurations.sequencer.width;
        distanceFromRightLineInMilliseconds = Math.round(distanceFromRightLineAsPercentageOfFullLoop * self.sequencer.loopLengthInMillis);
        if (distanceFromLeftLineInMilliseconds === 0 || distanceFromRightLineInMilliseconds === 0) {
            distanceFromLeftLineInMilliseconds = 0
            distanceFromRightLineInMilliseconds = 0
        }
        // update analytics bar text
        self.components.domElements.text.analyticsBarNoteModeDistanceFromReferenceLinesPercent.innerHTML = "+" + distanceFromLeftLineAsPercent + "% / -" + distanceFromRightLineAsPercent + "%"
        self.components.domElements.text.analyticsBarNoteModeDistanceFromReferenceLinesMilliseconds.innerHTML = "|+" + distanceFromLeftLineInMilliseconds + "ms / -" + distanceFromRightLineInMilliseconds + "ms| of " + referenceLineSubdivisionsLengthMillis + "ms"
    }

    // add param: sequencerRowIndex
    setAnalyticsBarLinesModeBeatLineShiftText(self, hideValues=false){
        // todo: implement this
        if (hideValues) {
            self.components.domElements.text.analyticsBarLinesModeBeatShiftPercent.innerHTML = "beat line shift: -"
            self.components.domElements.text.analyticsBarLinesModeBeatShiftMilliseconds.innerHTML = "-"
            self.components.domElements.text.analyticsBarLinesModeBeatShiftWithinReferenceLinesPercent.innerHTML = "within visual lines: -"
            self.components.domElements.text.analyticsBarLinesModeBeatShiftWithinReferenceLinesMilliseconds.innerHTML = "-"
            return;
        }
        let sequencerRowIndex = 0
        // consolidate necessary variables
        let beatLinesShiftInPixels = self.subdivisionLinesShiftInPixelsPerRow[sequencerRowIndex]
        //let referenceLinesShiftInPixels = self.referenceLinesShiftInPixelsPerRow[sequencerRowIndex]
        let numberOfSubdivisions = self.sequencer.rows[sequencerRowIndex].getNumberOfSubdivisions()
        let widthOfEachSubdivisionInPixels = self.configurations.sequencer.width / numberOfSubdivisions
        // convert to percent
        let beatLineShiftPercent = Math.round((beatLinesShiftInPixels / widthOfEachSubdivisionInPixels) * 100)
        // let numberOfReferenceLines = self.sequencer.rows[sequencerRowIndex].getNumberOfReferenceLines()
        // let widthOfEachReferenceLineSubdivision = self.configurations.sequencer.width / numberOfReferenceLines
        // beatShiftInPixels = 0
        // referenceShiftInPixels = 0
        // calculate beat shift as percent
        self.components.domElements.text.analyticsBarLinesModeBeatShiftPercent.innerHTML = "beat line shift: +" + beatLineShiftPercent + "% / -0%"
        self.components.domElements.text.analyticsBarLinesModeBeatShiftMilliseconds.innerHTML = "| +0ms / -0ms | of 0ms"
        self.components.domElements.text.analyticsBarLinesModeBeatShiftWithinReferenceLinesPercent.innerHTML = "within visual lines: +0% / -0%"
        self.components.domElements.text.analyticsBarLinesModeBeatShiftWithinReferenceLinesMilliseconds.innerHTML = "| +0ms / -0ms | of 0ms"
    }

    setAnalyticsBarLinesModeReferenceLineShiftText(self, hideValues=false){
        // todo: implement this
        if (hideValues) {
            self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftPercent.innerHTML = "visual line shift: -"
            self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftMilliseconds.innerHTML = "-"
            self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftWithinBeatLinesPercent.innerHTML = "within beat lines: -"
            self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftWithinBeatLinesMilliseconds.innerHTML = "-"
            return;
        }
        self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftPercent.innerHTML = "visual line shift: +0% / -0%"
        self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftMilliseconds.innerHTML = "| +0ms / -0ms | of 0ms"
        self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftWithinBeatLinesPercent.innerHTML = "within beat lines: +0% / -0%"
        self.components.domElements.text.analyticsBarLinesModeReferenceLineShiftWithinBeatLinesMilliseconds.innerHTML = "| +0ms / -0ms | of 0ms"
    }

    /**
     * general helper methods
     */

    /**
     * This function is for initializing event listeners while ensuring that duplicate event listeners are 
     * never added to a DOM element. It checks whether the event listeners already exist, and if they do, it 
     * deletes the existing event listeners before initializing new ones.
     * 
     * This is a reusable version of logic I have already created several times in this codebase, I may try
     * to eventually consolidate the various versions I have of this here to clean things up a bit. This 
     * cleanup also might be part of an eventual effort to standardize the logic for different buttons and
     * move them into their own classes (with a few button type interfaces as superclasses), to majorly
     * clean up this GUI file.
     * 
     * Parameters:
     * 
     * shapes: a list of shapes to add event listeners to
     * 
     * eventHandlersHash: a hash of event type => event handler.
     * for example:
     * { 
     *   "mousedown": eventHandlerFunction1,
     *   "mouseup": eventHandlerFunction2
     * }
     * 
     * uniqueHandlerIdentifier: a string by which we can identify this set of handlers, such as "addRowButton".
     * this is only used under the hood to disambiguate sets of event listeners and check whether they have
     * already been created, etc.
     */
    addEventListenersWithoutDuplicates(uniqueHandlerIdentifier, shapes, eventHandlersHash) {
        if (this.eventHandlerFunctions[uniqueHandlerIdentifier] !== null && this.eventHandlerFunctions[uniqueHandlerIdentifier] !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            for (let shape of shapes) {
                for (let [eventHandlerType, _] of Object.entries(eventHandlersHash)) {
                    // we could iterate through handlers in this.eventHandlerFunctions[uniqueHandlerIdentifier] instead of iterating
                    // through the hash that was passed in. for all of our use cases though, these should have the same outcome.
                    shape.removeEventListener(eventHandlerType, this.eventHandlerFunctions[uniqueHandlerIdentifier][eventHandlerType]);
                }
            }
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions[uniqueHandlerIdentifier] = {}
        for (let shape of shapes) {
            for (let [eventHandlerType, eventHandlerFunction] of Object.entries(eventHandlersHash)) {
                this.eventHandlerFunctions[uniqueHandlerIdentifier][eventHandlerType] = eventHandlerFunction
                shape.addEventListener(eventHandlerType, this.eventHandlerFunctions[uniqueHandlerIdentifier][eventHandlerType]);
            }
        }
    }

    simpleButtonHoverMouseEnterLogic(self, buttonShape, helpText=this.configurations.helpText.defaultText, strokeColor="black", fillColor=self.configurations.buttonBehavior.buttonHoverColor) {
        if (buttonShape.guiData.respondToEvents) {
            self.components.domElements.divs.bottomBarText.innerHTML = helpText
            if (buttonShape.fill !== self.configurations.buttonBehavior.clickedButtonColor) {
                // don't change to hover color if we are still waiting for a 'click' color change to complete
                buttonShape.fill = fillColor
                buttonShape.stroke = strokeColor
            }
        }
    }

    simpleButtonHoverMouseLeaveLogic(self, buttonShape, strokeColor="black", fillColor='transparent') {
        if (buttonShape.guiData.respondToEvents) {
            self.components.domElements.divs.bottomBarText.innerHTML = this.configurations.helpText.defaultText
            if (buttonShape.fill !== self.configurations.buttonBehavior.clickedButtonColor) {
                // don't change to hover color if we are still waiting for a 'click' color change to complete
                buttonShape.fill = fillColor
                buttonShape.stroke = strokeColor
            }
        }
    }

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
        shape.stroke = 'black' // this.configurations.sequencer.color
        shape.fill = 'transparent'
        shape.guiData = {
            respondToEvents: true, // this will be used to let us hide shapes onscreen without having to fully delete them
        }
        return shape
    }

    initializeLabelText(text, left, top, alignment="left") {
        let label = new Two.Text(text, left, top);
        label.fill = "black";
        // label.stroke = "white";
        label.size = 20;
        label.alignment = alignment
        label.family = "Arial, sans-serif"
        // label.family = "Courier New, monospace"
        this.two.add(label);
        this.two.update();
        // prevent text selection
        label._renderer.elem.addEventListener('mousedown', (event) => {
            event.preventDefault();
        })
        label._renderer.elem.style.userSelect = "none";
        label._renderer.elem.style.cursor = "default";
        return label
    }

    initializeButtonPerSequencerRow(topPaddingPerRow, leftPaddingPerRow, height, width) {
        let shapes = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let top = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + topPaddingPerRow
            let left = this.configurations.sequencer.left + this.configurations.sequencer.width + leftPaddingPerRow
            let shape = this.initializeRectangleShape(top, left, height, width);
            shape.guiData = {
                respondToEvents: true, // this will be used to let us hide shapes onscreen without having to fully delete them
            }
            shapes[rowIndex] = shape;
        }
        return shapes
    }

    // these are circles that are to the left of the sequencer, which we can click on to select sequencer rows,
    // so that we can move those rows by clicking and dragging, to rearrange the sequencer row order, throw 
    // rows away, etc.
    initializeCirclesPerSequencerRow(leftPaddingPerRow, topPaddingPerRow, radius, unselectedColor) {
        let allCircles = []
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let horizontalPosition = this.configurations.sequencer.left + leftPaddingPerRow
            let verticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + topPaddingPerRow
            let circle = this.two.makeCircle(horizontalPosition, verticalPosition, radius);
            circle.fill = 'transparent'
            circle.linewidth = 3
            circle.stroke = this.configurations.sequencerRowHandles.selectedColor
            circle.guiData = {
                respondToEvents: true, // this will be used to let us hide shapes onscreen without having to fully delete them
            }
            allCircles.push(circle)
        }
        return allCircles
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

    initializeMultiLineText(textLines, left, top, fontSize, spaceBetweenLines, color="black", alignment="left") {
        let textObjects = []
        for (let lineNumber = 0; lineNumber < textLines.length; lineNumber++) {
            // Two.js 2D graphics library doesn't currently support wrapping text, so just make one text object per line of text we want.
            let textLineContents = textLines[lineNumber];
            let lineTopPosition = top + (spaceBetweenLines * lineNumber)
            let textLine = this.initializeLabelText(textLineContents, left, lineTopPosition, alignment)
            textLine.size = fontSize
            textLine.fill = color
            textObjects.push(textLine);
        }
        return textObjects;
    }

    /**
     * Two.js library helper methods
     */

    // initialize Two.js library object and append it to the given DOM element
    initializeTwoJs(twoJsDomElement) {
        return new Two({
            fullscreen: false,
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
        let scrollAmountX = window.pageXOffset;
        let scrollAmountY = window.pageYOffset
        return {
            ctrlKey: event.ctrlKey, // include any other attributes from the event that we want to be preserved
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            pageX: (event.pageX - svgOrigin.left - scrollAmountX) / svgScale,
            pageY: (event.pageY - svgOrigin.top - scrollAmountY) / svgScale
        }
    }

    refreshTwoJsCanvasSize() {
        // this width calculation is a bit messy, but it's the most accurate way we currently have to calculate the width of the sequencer. 
        // it is based on the dimensions of row selection rectangles, which are the widest thing in the sequencer.
        let minimumSequencerWidth = this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.sequencerRowSelections.leftPadding + this.configurations.sequencerRowSelections.width + this.configurations.scroll.extraWidthPadding;
        let currentWidthOfWindow = document.documentElement.clientWidth;
        // set the width of the canvas to the width of sequencer, or the width of the window, whichever is bigger, so that we can always scroll to at least the width of the sequencer.
        this.two.width = Math.max(minimumSequencerWidth, currentWidthOfWindow)
        // next handle height in a similar way to how we handled width
        let minimumSequencerHeight = this.configurations.sequencer.top + this.configurations.sequencerRowSelections.topPadding + (this.configurations.sequencerRowSelections.height * this.sequencer.numberOfRows) + this.configurations.addRowButton.topPadding + this.configurations.addRowButton.height + this.configurations.scroll.extraHeightPadding;
        let currentHeightOfWindow = document.documentElement.clientHeight; 
        this.two.height = Math.max(minimumSequencerHeight, currentHeightOfWindow)
        this.two.renderer.setSize(this.two.width, this.two.height);
    }

    /**
     * Write sequencer pattern to URL hash
     */

    saveCurrentSequencerStateToUrlHash() {
        // encode sequencer pattern to json and add it to url. 
        // 'btoa(plaintext)' converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using 'atob(base64)'.
        this.mostRecentSavedUrlHash = btoa(this.sequencer.serialize());
        window.location.hash = this.mostRecentSavedUrlHash;
    }

    loadSequencerPatternFromBase64String(base64String) {
        this.sequencer.clear()
        // btoa(plaintext) converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using atob(base64).
        this.sequencer.deserialize(atob(base64String), this.sampleBankNodeGenerator);
        this.initializeTempoTextInputValuesAndStyles();
        this.refreshTempoMenuState();
        // to do: check what the sample name list is in the sequencer after deserializing. 
        if (this.allDrumKitsHash[this.sequencer.sampleListName]) {
            // if the sample list name matches an existing drum kit,
            // - select that drum kit from the dropdown.
            this.components.domElements.selectors.drumkit.value = this.sequencer.sampleListName;
            // - set the sequencer to use the samples from the selected drum kit
            this.sequencer.samples = this.allDrumKitsHash[this.sequencer.sampleListName];
            // if the drum kit name wasn't found in the drum kit list, do nothing.
            this.sequencer.audioDrivers[0].muted = false;
        }
        if (this.sequencer.sampleListName === this.configurations.drumkitSelector.noWebAudioOutputOptionText) {
            // if 'no live audio output' is serialized drum kit, configure the sequencer for that
            this.components.domElements.selectors.drumkit.value = this.sequencer.sampleListName;
            this.sequencer.audioDrivers[0].muted = true;
        }
        // then save the currently-loaded drum kit to the 'selectedDrumKitName' variable.
        this.selectedDrumKitName = this.sequencer.sampleListName
        this.sequencer.restart();
        this.saveCurrentSequencerStateToUrlHash();
        this.redrawSequencer();
    }

    /**
     * MIDI file export helper methods
     */

    configureMidiFileWriterLibrary() {
        /**
         * Configure the MidiWriterJS library for writing sequencer patterns to MIDI files.
         * 
         * MIDI files store BPM information, then support storing timing of notes as either beat lengths, or as 'tick' values, where every beat is made up of a defineable numbder
         * of ticks. When exporting MIDI files, we will use 'ticks' rather than traditional beat lengths, since our sequencer supports unusual beat divisions and unquantized notes. 
         * 
         * Set the number of 'ticks' to use per beat in exported MIDI files. By default the value is 128 ticks per beat, but we can set it higher to get higher-resolution timing
         * in our exported MIDI files.
         * 
         * The time that each MIDI tick takes is BPM-dependent. On the other hand, the drum sequener schedules note from raw time values (in milliseconds). So if we try to 
         * export a low-enough BPM sequencer pattern to  MIDI, it's possible that the MIDI file's time resolution wont' be high enough to accurately represent the rhythms in 
         * the sequence. If this becomes an issue we can raise the number of ticks per beat set here, or we can raise the minimum beats per minute value. For now we will just 
         * try to use a value that's good enough for the average BPM range use case (probably between 40 and 200 beats per minute).
         * 
         * Later update: it looks like updating the number of ticks per beat doesn't work the way I expected, so for now I will just use the default value (128 ticks per beat).
         * I will look further into this if it causes any issues with the accuracy of exported MIDI files. 
         */
        MidiWriter.Constants.HEADER_CHUNK_DIVISION = [0, DrumMachineGui.MIDI_FILE_EXPORT_NUMBER_OF_TICKS_PER_BEAT];
    }

    exportSequencerPatternToMidiDataUri() {
        // create the MIDI track we will export
        let midiTrack = new MidiWriter.Track();
        // set the tempo of the MIDI track
        midiTrack.setTempo(this.sequencer.tempoRepresentation.beatsPerMinute); 
        // set the key signature of the MIDI track
        let timeSignatureNumerator = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop;
        let timeSignatureDenominator = 4; // assume the time signature denominator is always 4 for convenience, since we don't let the user actually set a denominator currently
        midiTrack.setTimeSignature(timeSignatureNumerator, timeSignatureDenominator)
        // iterate through all sequencer rows and write relevant information from their notes to a single list of objects with details about midi messages.
        // the MIDI file writer library we are using has some convenient features so that we only need to create 'note on' events with durations, rather than
        // also worrying about 'note off' events. but if we _did_ need to create 'note off' events too, we would add them here, with timestamps incremented
        // by whatever MIDI note duration we choose, so that all of the events would then get sorted before being turned into real MIDI messages later.
        let midiNoteDurationInTicks = 2 // just use an arbitrary short amount of time for now. make this longer if notes aren't showing up, etc.
        let allMidiMessagesDetails = [];
        for (let row of this.sequencer.rows) {
            let note = row._notesList.head
            while (note !== null) {
                let noteOn = {
                    noteOn: true,
                    timeInTicks: this.convertMillisecondTimeToMidiTicks(note.priority),
                    velocity: note.data.midiVelocity,
                    pitch: note.data.midiNote,
                }
                allMidiMessagesDetails.push(noteOn);
                note = note.next
            }
        }
        // sort the list of note MIDI data objects by their times in MIDI ticks
        allMidiMessagesDetails.sort( (note1, note2) => { return note1.timeInTicks - note2.timeInTicks} )
        // create actual MIDI events and add them to the MIDI track
        let allMidiMessages = []
        for (let noteMidiDetails of allMidiMessagesDetails) {
            allMidiMessages.push(
                new MidiWriter.NoteEvent({
                    pitch: noteMidiDetails.pitch,
                    duration: 'T' + midiNoteDurationInTicks, // a duration such as 'T10' specifies a number of ticks (in this example, 10 ticks)
                    velocity: noteMidiDetails.velocity,
                    startTick: noteMidiDetails.timeInTicks
			}));
        }
        midiTrack.addEvent(allMidiMessages);
        // write MIDI track to a file
        let midiTrackWriter = new MidiWriter.Writer(midiTrack);
        let midiUint8Array = midiTrackWriter.buildFile()
        let blob = new Blob([midiUint8Array.buffer])
        saveAs(blob, "drums.midi"); // the 'saveAs()' function here is implemented within the FileSaver.js library dependency
    }

    // convert a time in milliseconds (assumed to be within the sequencer length) to its corresponding MIDI tick number within the sequencer pattern
    convertMillisecondTimeToMidiTicks(milliseconds) {
        let numberOfMidiTicksInFullLoop = this.sequencer.tempoRepresentation.numberOfBeatsPerLoop * DrumMachineGui.MIDI_FILE_EXPORT_NUMBER_OF_TICKS_PER_BEAT;
        return Math.round(Util.calculateLinearConversion(milliseconds, 0, this.sequencer.loopLengthInMillis, 0, numberOfMidiTicksInFullLoop));
    }
}