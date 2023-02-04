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
            clearedPatternBase64String: "eyJsb29wTGVuZ3RoIjoyMDAwLCJyb3dzIjpbIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjoxNixcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W119Il0sImJwbSI6MTIwLCJudW1iZXJPZkJlYXRzIjo0LCJpc0luQnBtTW9kZSI6dHJ1ZX0=",
            startingPatternBase64String: "eyJsb29wTGVuZ3RoIjoyMDAwLCJyb3dzIjpbIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjoxNixcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W119Iiwie1wicXVhbnRpemVkXCI6dHJ1ZSxcInN1YmRpdmlzaW9uc1wiOjE2LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjowLFwibm90ZXNcIjpbXX0iLCJ7XCJxdWFudGl6ZWRcIjp0cnVlLFwic3ViZGl2aXNpb25zXCI6MTYsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjAsXCJub3Rlc1wiOltdfSIsIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjoxNixcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W119Iiwie1wicXVhbnRpemVkXCI6ZmFsc2UsXCJzdWJkaXZpc2lvbnNcIjoxNixcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W119Il0sImJwbSI6MTIwLCJudW1iZXJPZkJlYXRzIjo0LCJpc0luQnBtTW9kZSI6dHJ1ZSwic2FtcGxlTGlzdE5hbWUiOiJCYXNpYyBEcnVtIEtpdCAzIn0="
        },
        sequencerRowHighlightLines: {
            lineWidth: 6,
            color: 'black',
        },
        defaultFont: {
            color: 'black' // "#575757",
        },
        notes: {
            circleRadiusUsedForNoteBankSpacing: 8,
            circleRadiusIncreaseWhenPlayingNote: 2,
            circleRadiusIncreaseWhenMovingNote: 1,
            volumes: {
                defaultVolume: .75,
                minimumVolume: .05,
                maximumVolume: 2,
                minimumCircleRadius: 6,
                maximumCircleRadius: 14,
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
            height: 18,
            color: 'black', // defaultSequencerLineColor,
        },
        subdivisionLines: {
            height: 18,
            color: defaultSequencerLineColor,
        },
        subdivisionHighlightLines: {
            height: 20,
            color: 'black',
            lineWidth: 6,
        },
        referenceLines: {
            height: 22,
            color: lighterSequencerColor, // meant to be slightly lighter than the subdivision line color
        },
        referenceHighlightLines: {
            height: 24,
            color: 'black',
            lineWidth: 6,
        },
        noteTrashBin: {
            top: 264,
            left: 30,
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
        clearAllNotesButton: {
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
            buttonHoverColor: "#cacaca"
        },
        clearRowButtons: {
            topPaddingPerRow: -24,
            leftPaddingPerRow: 138,
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
            leftPaddingPerRow: 196,
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
            leftPaddingPerRow: 196,
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
            text: "row shifting"
        },
        shiftModeLabelMenuExplanation: {
            left: 493,
            top: 48,
            lines: ["row shifters let you", "shift the timing of all", "notes or beats on a", "row, to sound early", "or late. select what will get", "moved when shifting a row."],
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
        },
        helpText: {
            defaultText: "", // "share this beat by copying and pasting the URL from the address bar. undo and redo changes using your browser's back and forward buttons.",
            moveNote: "click and drag to move note. ctrl+click and drag up and down to change note volume",
            addRow: "add another row to the sequencer",
            play: "play the sequencer",
            stop: "stop the sequencer",
            deletePattern: "delete the whole sequencer pattern",
            quantized: "notes will snap to beat lines for this row. turn off snapping notes to beat lines (turn off quantization)",
            unquantized: "notes will not snap to beat lines for this row. turn on snapping notes to beat lines (turn on quantization)",
            moveRow: "move sequencer row around, or throw it away",
            changeRowVolume: "adjust volume for all notes in row",
            setNumberOfSubdivisionLines: "set number of beat lines for row",
            setNumberOfReferenceLines: "set number of visual reference lines for row",
            deleteAllNotesForRow: "delete all notes from row",
            resetSubdivisionLineShift: "realign beat lines to default position (reset timing shift)",
            resetRefernceLineShift: "realign visual reference lines to default position (reset timing shift)",
            shiftRow: {
                prefix: "shift the timing of ",
                postfix: " for row",
                subdivisionLinesName: "beat lines",
                referenceLinesName: "visual reference lines",
                notesName: "notes",
                referenceLinesOnly: "shift visual reference lines for row"
            },
            shiftNotes: "",
            shiftSubdivisionLines: "",
            shiftRefernceLines: "",
            saveMidi: "export sequencer pattern to a MIDI file",
            tapTempo: "tap tempo: click this button at the tempo you'd like to use",
            loopLengthBpmMode: "display tempo in beats per minute",
            loopLengthMillisecondsMode: "display loop length in milliseconds",
            setBeatsPerMinute: "set tempo in beats per minute (BPM)",
            setBeatsPerLoop: "set number of beats in loop (used to calculate the loop's length based on its tempo in beats per minute)",
            setMillisecondsPerLoop: "set loop length in milliseconds",
            selectLiveMidiOutputPort: "select live MIDI output port",
            selectDrumKit: "select drum kit to use for live audio output",
            selectExampleSequencerPattern: "load an example sequencer pattern",
        }
    }
}