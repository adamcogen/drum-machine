/**
 * Make an object to contain constants that will be used 
 * to configure the way the GUI is drawn and behaves.
 */

let defaultSequencerLineColor = '#707070'
let guiConfigurations = {
    sequencer: {
        top: 100,
        left: 150,
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
        color: '#ababab', // meant to be slightly lighter than the subdivision line color
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
    }
}