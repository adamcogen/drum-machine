/**
 * Make an object to contain constants that will be used 
 * to configure the way the GUI is drawn and behaves.
 */

let defaultSequencerLineColor = '#707070'
let lighterSequencerColor = "#ababab"
let guiConfigurations = {
    sequencer: {
        top: 110,
        left: 160,
        width: 400,
        spaceBetweenRows: 80,
        color: defaultSequencerLineColor,
        lineWidth: 3,
    },
    defaultFont: {
        color: "#575757",
    },
    notes: {
        unplayedCircleRadius: 8,
        playedCircleRadius: 10,
        movingCircleRadius: 9
    },
    sampleBank: {
        top: 135,
        left: 40,
        spaceBetweenNotes: 40,
        borderPadding: 20
    },
    timeTrackingLines: {
        height: 20,
        color: defaultSequencerLineColor, // 'black'
    },
    subdivisionLines: {
        height: 20,
        color: defaultSequencerLineColor,
    },
    referenceLines: {
        height: 20,
        color: lighterSequencerColor, // meant to be slightly lighter than the subdivision line color
    },
    noteTrashBin: {
        top: 380,
        left: 40,
        width: 48,
        height: 48,
        color: "red",
    },
    pauseButton: {
        top: 74,
        left: 40,
        width: 48,
        height: 48,
    },
    restartSequencerButton: {
        top: 440,
        left: 40,
        width: 48,
        height: 48,
    },
    clearAllNotesButton: {
        top: 500,
        left: 40,
        width: 48,
        height: 48,
    },
    mouseEvents: {
        notePlacementPadding: 20, // give this many pixels of padding on either side of things when we're placing, so we don't have to place them _precisely_ on the line, the trash bin, etc.
        throwNoteAwaySidesPadding: 50, // throw notes away if they are this far from the side of the sequencer
        throwNoteAwayTopAndBottomPadding: 50 // throw notes away if they are this far from the top or bottom of the sequencer
    },
    tempoTextInput: {
        top: 25,
        left: 477,
        maximumValue: 99999 // fractional numbers less than this could go over the width of the text input
    },
    subdivionLineTextInputs: {
        topPaddingPerRow: 0, // centered on sequencer line would be: -17
        leftPaddingPerRow: 10,
        maximumValue: 1000,
    },
    referenceLineTextInputs: {
        topPaddingPerRow: -35,
        leftPaddingPerRow: 10,
        maximumValue: 1000,
    },
    buttonBehavior: {
        showClicksForHowManyMilliseconds: 200,
        clickedButtonColor: "#c4c4c4",
    },
    clearRowButtons: {
        topPaddingPerRow: -30,
        leftPaddingPerRow: 102,
        height: 20,
        width: 20,
    },
    addRowButton: {
        topPadding: 50,
        leftPadding: 0,
        height: 48,
        width: 48
    },
    sequencerRowHandles: { // these will be circles, one to the left of each sequencer row, that allow you to select the row and click-drag it.
        topPadding: 0,
        leftPadding: -30,
        radius: 6,
        unselectedColor: lighterSequencerColor,
        selectedColor: defaultSequencerLineColor,
    },
    sequencerRowSelections: {
        leftPadding: -60,
        topPadding: -40,
        width: 200,
        height: 80,
    }
}