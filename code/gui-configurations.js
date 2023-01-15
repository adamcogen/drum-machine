/**
 * Make an object to contain constants that will be used 
 * to configure the way the GUI is drawn and behaves.
 */

let defaultSequencerLineColor = '#707070'
let lighterSequencerColor = "#ababab"
function getGuiConfigurations(hideIcons=false) {
    return {
        hideIcons: hideIcons,
        sequencer: {
            top: 180,
            left: 320,
            width: 700,
            spaceBetweenRows: 80,
            color: defaultSequencerLineColor,
            lineWidth: 3,
            // the following serialized (base64) sequencer pattern string will be loaded when we click the 'delete sequencer pattern' button:
            clearedPatternBase64String: "eyJsb29wTGVuZ3RoIjoyMDAwLCJyb3dzIjpbIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjo4LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjowLFwibm90ZXNcIjpbXX0iXSwiYnBtIjoxMjAsIm51bWJlck9mQmVhdHMiOjQsImlzSW5CcG1Nb2RlIjp0cnVlfQ=="
        },
        defaultFont: {
            color: 'black' // "#575757",
        },
        notes: {
            circleRadiusUsedForNoteBankSpacing: 8,
            circleRadiusIncreaseWhenPlayingNote: 2,
            circleRadiusIncreaseWhenMovingNote: 1,
            volumes: {
                defaultVolume: .5,
                minimumVolume: .05,
                maximumVolume: 2,
                minimumCircleRadius: 4,
                maximumCircleRadius: 24,
                volumePresets: [.25, .5, .75, 1], // when you click a note in 'edit volumes' mode, it will iterate through this preset list of volumes
                volumeAdjustmentSensitivityDivider: 4 // when adjusting a notes volume by clicking and dragging it, the distance your mouse moves will be divided by this value to make volume adjustments more fine-tuned.
            }
        },
        midi: {
            velocity: {
                minimumVelocity: 1,
                maximumVelocity: 127,
            },
        },
        sampleBank: {
            top: 144,
            left: 100,
            spaceBetweenNotes: 40,
            borderPadding: 20
        },
        timeTrackingLines: {
            height: 20,
            color: 'black', // defaultSequencerLineColor,
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
            top: 530,
            left: 100,
            width: 48,
            height: 48,
            color: "red",
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            }
        },
        pauseButton: {
            top: 144,
            left: 30,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            }
        },
        restartSequencerButton: {
            top: 204,
            left: 30,
            width: 48,
            height: 48,
            icon: {
                width: 48,
                height: 48,
                topPadding: 0,
                leftPadding: 0,
            }
        },
        clearAllNotesButton: {
            top: 264,
            left: 30,
            width: 48,
            height: 48,
            icon: {
                width: 48,
                height: 48,
                topPadding: 0,
                leftPadding: 0,
            }
        },
        moveNotesModeButton: {
            top: 324,
            left: 30,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        editVolumesModeButton: {
            top: 384,
            left: 30,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        mouseEvents: {
            notePlacementPadding: 20, // give this many pixels of padding on either side of things when we're placing, so we don't have to place them _precisely_ on the line, the trash bin, etc.
            throwNoteAwaySidesPadding: 50, // 90, // throw notes away if they are this far from the left or right side of the sequencer
            throwNoteAwayTopAndBottomPadding: 50, // throw notes away if they are this far from the top or bottom of the sequencer
            throwRowAwaySidesPadding: 70,
            throwRowAwayTopAndBottomPadding: 70,
        },
        tempoTextInputBeatsPerLoop: {
            top: 95,
            left: 170,
            maximumValue: 9999 // fractional numbers less than this could go over the width of the text input
        },
        tempoTextInputBpm: {
            top: 57,
            left: 170,
            maximumValue: 99999 // fractional numbers less than this could go over the width of the text input
        },
        tempoTextInputMilliseconds: {
            top: 73,
            left: 170,
            maximumValue: 99999 // fractional numbers less than this could go over the width of the text input
        },
        tempoTextLabelMenuTitle: {
            text: "tempo or time",
            top: 30,
            left: 170,
        },
        tempoTextLabelMenuTitleTempoWord: {
            text: "tempo",
            top: 30,
            left: 170
        },
        tempoTextLabelMenuTitleTimeWord: {
            text: "time",
            top: 30,
            left: 275.5
        },
        tempoTextLabelBeats: {
            text: "beats long",
            color: "black",
            top: 114,
            left: 234,
        },
        tempoTextLabelBeatsPerMinute: {
            text: "beats per minute",
            color: "black",
            top: 78,
            left: 245,
        },
        tempoTextLabelMilliseconds: {
            text: "milliseconds long",
            color: "black",
            top: 94,
            left: 245,
        },
        subdivisionLineTextInputs: {
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
            showClicksForHowManyMilliseconds: 100,
            clickedButtonColor: "#b8b8b8",
        },
        clearRowButtons: {
            topPaddingPerRow: -24,
            leftPaddingPerRow: 178,
            height: 48,
            width: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            }
        },
        addRowButton: {
            topPadding: 60, // this button will always be a certain distance from the bottom of the sequencer
            left: 320, // leftPadding: 0, // this button used to be calculated to be centered on the sequencer, but now it's wider to also be manually centered on subdivision / reference line text inputs
            height: 48,
            width: 765,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        tempoInputModeSelectionBpmButton: { // button for toggling between different modes of inputting tempo. this one is to select 'beats per minute' input mode.
            top: 10,
            left: 354,
            height: 48,
            width: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        tempoInputModeSelectionMillisecondsButton: { // button for toggling between different modes of inputting tempo. this one is to select 'loop length in milliseconds' input mode.
            top: 10,
            left: 410,
            height: 48,
            width: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        tapTempoButton: {
            top: 70,
            left: 410,
            height: 48,
            width: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        sequencerRowHandles: { // these will be circles, one to the left of each sequencer row, that allow you to select the row and click-drag it.
            topPadding: 0,
            leftPadding: -45,
            radius: 18,
            unselectedColor: 'transparent',
            selectedColor: lighterSequencerColor,
            icon: {
                height: 30,
                width: 30,
                topPaddingPerRow: -15,
                leftPaddingPerRow: -15,
            }
        },
        volumeAdjusterRowHandles: { // these will probably be replaced with an icon eventually, but adding circles for now as a placeholder. click and drag these to adjust the volume for one row
            topPadding: 0,
            leftPadding: -90,
            radius: 18,
            unselectedColor: 'transparent',
            selectedColor: lighterSequencerColor,
            icon: {
                height: 30,
                width: 30,
                topPaddingPerRow: -15,
                leftPaddingPerRow: -15,
            }
        },
        shiftToolRowHandles: { // these will probably be replaced with an icon eventually, but adding circles for now as a placeholder. click and drag these to use the 'shift' tool
            topPadding: 0,
            leftPadding: -135,
            radius: 18,
            unselectedColor: 'transparent',
            selectedColor: lighterSequencerColor,
            icon: {
                height: 30,
                width: 30,
                topPaddingPerRow: -15,
                leftPaddingPerRow: -15,
            }
        },
        sequencerRowSelections: {
            leftPadding: -160,
            topPadding: -40,
            width: 405,
            height: 80,
        },
        quantizationButtons: {
            topPaddingPerRow: -24,
            leftPaddingPerRow: 80,
            height: 48,
            width: 48,
            icon: {
                width: 48,
                height: 48,
                topPaddingPerRow: -24,
                leftPaddingPerRow: 80,
            }
        },
        shiftModeMoveNotesButton: {
            top: 41,
            left: 615,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        shiftModeMoveSubdivisionLinesButton: {
            top: 71,
            left: 670,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        shiftModeMoveReferenceLinesButton: {
            top: 15,
            left: 670,
            width: 48,
            height: 48,
            icon: {
                height: 48,
                width: 48,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        shiftModeResetReferenceLinesForRowButtons: {
            topPaddingPerRow: -33,
            leftPaddingPerRow: 138,
            height: 30,
            width: 30,
            icon: {
                height: 30,
                width: 30,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        shiftModeResetSubdivisionLinesForRowButtons: {
            topPaddingPerRow: 2,
            leftPaddingPerRow: 138,
            height: 30,
            width: 30,
            icon: {
                height: 30,
                width: 30,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        shiftModeLabelMenuTitle: {
            left: 490,
            top: 30,
            text: "shifter tool"
        },
        shiftModeLabelMenuExplanation: {
            left: 493,
            top: 55,
            lines: ["select what will get", "moved when using", "the row shifter tool."],
        },
        shiftModeMenuIcon: {
            left: 522,
            top: 93,
            height: 35,
            width: 35,
        },
        exportPatternToMidiFileButton: {
            top: 47,
            left: 802,
            height: 27,
            width: 27,
            icon: {
                height: 27,
                width: 27,
                topPadding: 0,
                leftPadding: 0,
            },
        },
        midiOutputSelector: {
            position: {
                top: 45,
                left: 834,
            },
            maximumTextLength: 20
        },
        drumkitSelector: {
            position: {
                top: 80,
                left: 800,
            },
            noWebAudioOutputOptionText: "No Live Audio Output",
        },
        outputMenuTitle: {
            left: 740,
            top: 30,
            text: "outputs"
        },
        outputMenuAudioLabel: {
            left: 797,
            top: 95,
            text: "audio:"
        },
        outputMenuMidiLabel: {
            left: 797,
            top: 63,
            text: "midi:"
        },
        examplePatternsMenuTitle: {
            left: 1070,
            top: 30,
            text: "examples"
        },
        examplePatternSelector: {
            position: {
                left: 1070,
                top: 45,
            },
            noExamplePatternSelectedText: ""
        },
        examplePatternMenuExplanation: {
            left: 1073,
            top: 90,
            lines: ["load some example sequencer", " patterns to see what the drum", "machine can do."],
        }
    }
}