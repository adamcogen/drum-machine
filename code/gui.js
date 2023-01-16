/**
 * This will be a class for storing, managing, and updating
 * all GUI components and their event listeners, etc.
 */
class DrumMachineGui {
    // create constants that will be used to denote special sequencer 'row' numbers, to indicate special places notes can go on the GUI, such as the note bank or the trash bin
    static get NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW() { return -1 }
    static get NOTE_ROW_NUMBER_FOR_NOTE_BANK() { return -2 }
    static get NOTE_ROW_NUMBER_FOR_TRASH_BIN() { return -3 }
    // create constants that will be used to denote sequencer modes
    static get MOVE_NOTES_MODE() { return "MOVE_NOTES_MODE" }
    static get CHANGE_NOTE_VOLUMES_MODE() { return "CHANGE_NOTE_VOLUMES_MODE" }
    // create constants relating to exporting sequencer patterns to MIDI files
    static get MIDI_FILE_EXPORT_NUMBER_OF_TICKS_PER_BEAT() { return 128 };

    constructor(sequencer, sampleNameList, sampleBankNodeGenerator, allDrumKitsHash, selectedDrumKitName) {
        this.sequencer = sequencer
        this.two = this.initializeTwoJs(document.getElementById('draw-shapes')) // Initialize Two.js library
        this.sampleNameList = sampleNameList
        this.samples = allDrumKitsHash[selectedDrumKitName];
        this.selectedDrumKitName = selectedDrumKitName;
        this.allDrumKitsHash = allDrumKitsHash;
        this.sampleBankNodeGenerator = sampleBankNodeGenerator;
        this.configurations = getGuiConfigurations()
        this.components = {
            shapes: {}, // this hash will contain all of the two.js shapes (either as shapes, lists of shapes, or lists of lists of shapes)
            domElements: {} // this hash will contain all of the HTML DOM elements (either as individual elements, lists of elements, or lists of lists of elements, etc.)
        }

        this.exampleSequencerPatternsHash = { // this hash will contain all of the example sequencer patterns that will show up in the 'example patterns' menu dropdown
            "Shifted Bossa": "eyJsb29wTGVuZ3RoIjoyNjk2LjYyOTIxMzQ4MzE0Niwicm93cyI6WyJ7XCJxdWFudGl6ZWRcIjp0cnVlLFwic3ViZGl2aXNpb25zXCI6MTYsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjI2Ljk2NjI5MjEzNDgzMTQ2MyxcIm5vdGVzXCI6W3tcInNhbXBsZVwiOlwid29vZGJsb2NrXCIsXCJiZWF0XCI6MCxcInZvbHVtZVwiOjAuMzI5Mzc1MDAwMDAwMDAwMTQsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MTl9LHtcInNhbXBsZVwiOlwid29vZGJsb2NrXCIsXCJiZWF0XCI6MyxcInZvbHVtZVwiOjAuMzI5Mzc1MDAwMDAwMDAwMTQsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MTl9LHtcInNhbXBsZVwiOlwid29vZGJsb2NrXCIsXCJiZWF0XCI6NixcInZvbHVtZVwiOjAuMzI5Mzc1MDAwMDAwMDAwMTQsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MTl9LHtcInNhbXBsZVwiOlwid29vZGJsb2NrXCIsXCJiZWF0XCI6MTAsXCJ2b2x1bWVcIjowLjMyOTM3NTAwMDAwMDAwMDE0LFwibWlkaU5vdGVcIjozOSxcIm1pZGlWZWxvY2l0eVwiOjE5fSx7XCJzYW1wbGVcIjpcIndvb2RibG9ja1wiLFwiYmVhdFwiOjEzLFwidm9sdW1lXCI6MC4zMjkzNzUwMDAwMDAwMDAxNCxcIm1pZGlOb3RlXCI6MzksXCJtaWRpVmVsb2NpdHlcIjoxOX1dfSIsIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjoxNixcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W3tcInNhbXBsZVwiOlwiaGktaGF0LW9wZW5cIixcImJlYXRcIjowLFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0NCxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1jbG9zZWRcIixcImJlYXRcIjoyLFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1vcGVuXCIsXCJiZWF0XCI6NCxcInZvbHVtZVwiOjAuMzUzNzUwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDQsXCJtaWRpVmVsb2NpdHlcIjoyMH0se1wic2FtcGxlXCI6XCJoaS1oYXQtY2xvc2VkXCIsXCJiZWF0XCI6NixcInZvbHVtZVwiOjAuMzUzNzUwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDMsXCJtaWRpVmVsb2NpdHlcIjoyMH0se1wic2FtcGxlXCI6XCJoaS1oYXQtb3BlblwiLFwiYmVhdFwiOjgsXCJ2b2x1bWVcIjowLjM1Mzc1MDAwMDAwMDAwMDEsXCJtaWRpTm90ZVwiOjQ0LFwibWlkaVZlbG9jaXR5XCI6MjB9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwiYmVhdFwiOjEwLFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1vcGVuXCIsXCJiZWF0XCI6MTIsXCJ2b2x1bWVcIjowLjM1Mzc1MDAwMDAwMDAwMDEsXCJtaWRpTm90ZVwiOjQ0LFwibWlkaVZlbG9jaXR5XCI6MjB9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwiYmVhdFwiOjE0LFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIwfV19Iiwie1wicXVhbnRpemVkXCI6dHJ1ZSxcInN1YmRpdmlzaW9uc1wiOjE2LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjoxNS40MDkzMDk3OTEzMzIyNjIsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcImhpLWhhdC1vcGVuXCIsXCJiZWF0XCI6MSxcInZvbHVtZVwiOjAuMzkxMjUsXCJtaWRpTm90ZVwiOjQ0LFwibWlkaVZlbG9jaXR5XCI6MjN9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwiYmVhdFwiOjMsXCJ2b2x1bWVcIjowLjM5MTI1LFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIzfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1vcGVuXCIsXCJiZWF0XCI6NSxcInZvbHVtZVwiOjAuMzkxMjUsXCJtaWRpTm90ZVwiOjQ0LFwibWlkaVZlbG9jaXR5XCI6MjN9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwiYmVhdFwiOjcsXCJ2b2x1bWVcIjowLjM5MTI1LFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIzfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1vcGVuXCIsXCJiZWF0XCI6OSxcInZvbHVtZVwiOjAuMzkxMjUsXCJtaWRpTm90ZVwiOjQ0LFwibWlkaVZlbG9jaXR5XCI6MjN9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwiYmVhdFwiOjExLFwidm9sdW1lXCI6MC4zOTEyNSxcIm1pZGlOb3RlXCI6NDMsXCJtaWRpVmVsb2NpdHlcIjoyM30se1wic2FtcGxlXCI6XCJoaS1oYXQtb3BlblwiLFwiYmVhdFwiOjEzLFwidm9sdW1lXCI6MC4zOTEyNSxcIm1pZGlOb3RlXCI6NDQsXCJtaWRpVmVsb2NpdHlcIjoyM30se1wic2FtcGxlXCI6XCJoaS1oYXQtY2xvc2VkXCIsXCJiZWF0XCI6MTUsXCJ2b2x1bWVcIjowLjM5MTI1LFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjIzfV19Iiwie1wicXVhbnRpemVkXCI6dHJ1ZSxcInN1YmRpdmlzaW9uc1wiOjE2LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjowLFwibm90ZXNcIjpbe1wic2FtcGxlXCI6XCJnaG9zdC1ub3RlLXNuYXJlXCIsXCJiZWF0XCI6MCxcInZvbHVtZVwiOjAuMzUzNzUwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDAsXCJtaWRpVmVsb2NpdHlcIjoyMH0se1wic2FtcGxlXCI6XCJnaG9zdC1ub3RlLXNuYXJlXCIsXCJiZWF0XCI6NixcInZvbHVtZVwiOjAuMzUzNzUwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDAsXCJtaWRpVmVsb2NpdHlcIjoyMH0se1wic2FtcGxlXCI6XCJnaG9zdC1ub3RlLXNuYXJlXCIsXCJiZWF0XCI6MTAsXCJ2b2x1bWVcIjowLjM1Mzc1MDAwMDAwMDAwMDEsXCJtaWRpTm90ZVwiOjQwLFwibWlkaVZlbG9jaXR5XCI6MjB9LHtcInNhbXBsZVwiOlwiZ2hvc3Qtbm90ZS1zbmFyZVwiLFwiYmVhdFwiOjE0LFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MCxcIm1pZGlWZWxvY2l0eVwiOjIwfV19Iiwie1wicXVhbnRpemVkXCI6dHJ1ZSxcInN1YmRpdmlzaW9uc1wiOjE2LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjoxNS40MDkzMDk3OTEzMzIyNjIsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcImdob3N0LW5vdGUtc25hcmVcIixcImJlYXRcIjoxLFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MCxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImdob3N0LW5vdGUtc25hcmVcIixcImJlYXRcIjozLFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MCxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImdob3N0LW5vdGUtc25hcmVcIixcImJlYXRcIjo3LFwidm9sdW1lXCI6MC4zNTM3NTAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MCxcIm1pZGlWZWxvY2l0eVwiOjIwfSx7XCJzYW1wbGVcIjpcImdob3N0LW5vdGUtc25hcmVcIixcImJlYXRcIjoxMSxcInZvbHVtZVwiOjAuMzUzNzUwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDAsXCJtaWRpVmVsb2NpdHlcIjoyMH0se1wic2FtcGxlXCI6XCJnaG9zdC1ub3RlLXNuYXJlXCIsXCJiZWF0XCI6MTMsXCJ2b2x1bWVcIjowLjM1Mzc1MDAwMDAwMDAwMDEsXCJtaWRpTm90ZVwiOjQwLFwibWlkaVZlbG9jaXR5XCI6MjB9XX0iLCJ7XCJxdWFudGl6ZWRcIjp0cnVlLFwic3ViZGl2aXNpb25zXCI6MTYsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjAsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwiYmVhdFwiOjAsXCJ2b2x1bWVcIjowLjg5MDAwMDAwMDAwMDAwMDIsXCJtaWRpTm90ZVwiOjM2LFwibWlkaVZlbG9jaXR5XCI6NTV9LHtcInNhbXBsZVwiOlwiYmFzcy1kcnVtXCIsXCJiZWF0XCI6NCxcInZvbHVtZVwiOjAuODkwMDAwMDAwMDAwMDAwMixcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjo1NX0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjo4LFwidm9sdW1lXCI6MC44OTAwMDAwMDAwMDAwMDAyLFwibWlkaU5vdGVcIjozNixcIm1pZGlWZWxvY2l0eVwiOjU1fSx7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwiYmVhdFwiOjEyLFwidm9sdW1lXCI6MC44OTAwMDAwMDAwMDAwMDAyLFwibWlkaU5vdGVcIjozNixcIm1pZGlWZWxvY2l0eVwiOjU1fSx7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwiYmVhdFwiOjE0LFwidm9sdW1lXCI6MC41NjE4NzUsXCJtaWRpTm90ZVwiOjM2LFwibWlkaVZlbG9jaXR5XCI6MzR9XX0iLCJ7XCJxdWFudGl6ZWRcIjp0cnVlLFwic3ViZGl2aXNpb25zXCI6MTYsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjI2Ljk2NjI5MjEzNDgzMTQ2MyxcIm5vdGVzXCI6W3tcInNhbXBsZVwiOlwiYmFzcy1kcnVtXCIsXCJiZWF0XCI6MyxcInZvbHVtZVwiOjAuNTYxODc1LFwibWlkaU5vdGVcIjozNixcIm1pZGlWZWxvY2l0eVwiOjM0fSx7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwiYmVhdFwiOjcsXCJ2b2x1bWVcIjowLjU2MTg3NSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjozNH0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjoxMSxcInZvbHVtZVwiOjAuNTYxODc1LFwibWlkaU5vdGVcIjozNixcIm1pZGlWZWxvY2l0eVwiOjM0fV19Il0sImJwbSI6ODksIm51bWJlck9mQmVhdHMiOjQsImlzSW5CcG1Nb2RlIjp0cnVlfQ==",
            "Funk Mess": "eyJsb29wTGVuZ3RoIjoyNDAwLCJyb3dzIjpbIntcInF1YW50aXplZFwiOmZhbHNlLFwic3ViZGl2aXNpb25zXCI6MTYsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjAsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwicHJpb3JpdHlcIjoxODguNTcxNDI4NTcxNDI4NTYsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjM2LFwibWlkaVZlbG9jaXR5XCI6MzB9LHtcInNhbXBsZVwiOlwiYmFzcy1kcnVtXCIsXCJwcmlvcml0eVwiOjkzOS40Mjg1NzE0Mjg1NzEzLFwidm9sdW1lXCI6MC41LFwibWlkaU5vdGVcIjozNixcIm1pZGlWZWxvY2l0eVwiOjMwfSx7XCJzYW1wbGVcIjpcImJhc3MtZHJ1bVwiLFwicHJpb3JpdHlcIjoxMDkwLjI4NTcxNDI4NTcxNDIsXCJ2b2x1bWVcIjowLjY4Mzc1MDAwMDAwMDAwMDEsXCJtaWRpTm90ZVwiOjM2LFwibWlkaVZlbG9jaXR5XCI6NDF9LHtcInNhbXBsZVwiOlwiYmFzcy1kcnVtXCIsXCJwcmlvcml0eVwiOjEzOTUuNDI4NTcxNDI4NTcxMyxcInZvbHVtZVwiOjAuNSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjozMH0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcInByaW9yaXR5XCI6MjE1My4xNDI4NTcxNDI4NTczLFwidm9sdW1lXCI6MC4yMDc1MDAwMDAwMDAwMDAxMyxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjoxMX1dfSIsIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjo4LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjowLFwibm90ZXNcIjpbe1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjowLFwidm9sdW1lXCI6MS4yNjg3NSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjo3OX0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjoyLFwidm9sdW1lXCI6MS4yNjg3NSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjo3OX0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjo0LFwidm9sdW1lXCI6MS4yNjg3NSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjo3OX0se1wic2FtcGxlXCI6XCJiYXNzLWRydW1cIixcImJlYXRcIjo2LFwidm9sdW1lXCI6MS4yNjg3NSxcIm1pZGlOb3RlXCI6MzYsXCJtaWRpVmVsb2NpdHlcIjo3OX1dfSIsIntcInF1YW50aXplZFwiOmZhbHNlLFwic3ViZGl2aXNpb25zXCI6OCxcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W3tcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwicHJpb3JpdHlcIjowLFwidm9sdW1lXCI6MC41LFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjMwfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1jbG9zZWRcIixcInByaW9yaXR5XCI6MzQ2LjI4NTcxNDI4NTcxNDMzLFwidm9sdW1lXCI6MC4xMTAwMDAwMDAwMDAwMDAxNCxcIm1pZGlOb3RlXCI6NDMsXCJtaWRpVmVsb2NpdHlcIjo0fSx7XCJzYW1wbGVcIjpcImhpLWhhdC1jbG9zZWRcIixcInByaW9yaXR5XCI6NjI3LjQyODU3MTQyODU3MTQsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjQzLFwibWlkaVZlbG9jaXR5XCI6MzB9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwicHJpb3JpdHlcIjo5MzkuNDI4NTcxNDI4NTcxMyxcInZvbHVtZVwiOjAuMDg1NjI1MDAwMDAwMDAwMTUsXCJtaWRpTm90ZVwiOjQzLFwibWlkaVZlbG9jaXR5XCI6M30se1wic2FtcGxlXCI6XCJoaS1oYXQtY2xvc2VkXCIsXCJwcmlvcml0eVwiOjExMDQsXCJ2b2x1bWVcIjowLjEyMzEyNSxcIm1pZGlOb3RlXCI6NDMsXCJtaWRpVmVsb2NpdHlcIjo1fSx7XCJzYW1wbGVcIjpcImhpLWhhdC1jbG9zZWRcIixcInByaW9yaXR5XCI6MTIyMC41NzE0Mjg1NzE0Mjg0LFwidm9sdW1lXCI6MC41MjQzNzUwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjMxfSx7XCJzYW1wbGVcIjpcImhpLWhhdC1jbG9zZWRcIixcInByaW9yaXR5XCI6MTU0Mi44NTcxNDI4NTcxNDMsXCJ2b2x1bWVcIjowLjExMDAwMDAwMDAwMDAwMDE0LFwibWlkaU5vdGVcIjo0MyxcIm1pZGlWZWxvY2l0eVwiOjR9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwicHJpb3JpdHlcIjoxODM0LjI4NTcxNDI4NTcxNDIsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjQzLFwibWlkaVZlbG9jaXR5XCI6MzB9LHtcInNhbXBsZVwiOlwiaGktaGF0LWNsb3NlZFwiLFwicHJpb3JpdHlcIjoyMTI5LjE0Mjg1NzE0Mjg1NyxcInZvbHVtZVwiOjAuMjU2MjUwMDAwMDAwMDAwMTQsXCJtaWRpTm90ZVwiOjQzLFwibWlkaVZlbG9jaXR5XCI6MTR9XX0iLCJ7XCJxdWFudGl6ZWRcIjp0cnVlLFwic3ViZGl2aXNpb25zXCI6NCxcInJlZmVyZW5jZUxpbmVzXCI6NCxcInJlZmVyZW5jZUxpbmVzU2hpZnRcIjowLFwic3ViZGl2aXNpb25MaW5lc1NoaWZ0XCI6MCxcIm5vdGVzXCI6W3tcInNhbXBsZVwiOlwic25hcmVcIixcImJlYXRcIjoxLFwidm9sdW1lXCI6MC41LFwibWlkaU5vdGVcIjozNyxcIm1pZGlWZWxvY2l0eVwiOjMwfSx7XCJzYW1wbGVcIjpcInNuYXJlXCIsXCJiZWF0XCI6MyxcInZvbHVtZVwiOjAuNSxcIm1pZGlOb3RlXCI6MzcsXCJtaWRpVmVsb2NpdHlcIjozMH1dfSIsIntcInF1YW50aXplZFwiOnRydWUsXCJzdWJkaXZpc2lvbnNcIjo4LFwicmVmZXJlbmNlTGluZXNcIjo0LFwicmVmZXJlbmNlTGluZXNTaGlmdFwiOjAsXCJzdWJkaXZpc2lvbkxpbmVzU2hpZnRcIjowLFwibm90ZXNcIjpbe1wic2FtcGxlXCI6XCJ3b29kYmxvY2tcIixcImJlYXRcIjowLFwidm9sdW1lXCI6MC41LFwibWlkaU5vdGVcIjozOSxcIm1pZGlWZWxvY2l0eVwiOjMwfSx7XCJzYW1wbGVcIjpcIndvb2RibG9ja1wiLFwiYmVhdFwiOjQsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MzB9XX0iLCJ7XCJxdWFudGl6ZWRcIjpmYWxzZSxcInN1YmRpdmlzaW9uc1wiOjgsXCJyZWZlcmVuY2VMaW5lc1wiOjgsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjAsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcIndvb2RibG9ja1wiLFwicHJpb3JpdHlcIjozNDIuODU3MTQyODU3MTQyODMsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MzB9LHtcInNhbXBsZVwiOlwid29vZGJsb2NrXCIsXCJwcmlvcml0eVwiOjkzNixcInZvbHVtZVwiOjAuNSxcIm1pZGlOb3RlXCI6MzksXCJtaWRpVmVsb2NpdHlcIjozMH0se1wic2FtcGxlXCI6XCJ3b29kYmxvY2tcIixcInByaW9yaXR5XCI6MTU0Mi44NTcxNDI4NTcxNDMsXCJ2b2x1bWVcIjowLjUsXCJtaWRpTm90ZVwiOjM5LFwibWlkaVZlbG9jaXR5XCI6MzB9XX0iLCJ7XCJxdWFudGl6ZWRcIjpmYWxzZSxcInN1YmRpdmlzaW9uc1wiOjgsXCJyZWZlcmVuY2VMaW5lc1wiOjQsXCJyZWZlcmVuY2VMaW5lc1NoaWZ0XCI6MCxcInN1YmRpdmlzaW9uTGluZXNTaGlmdFwiOjAsXCJub3Rlc1wiOlt7XCJzYW1wbGVcIjpcInRvbVwiLFwicHJpb3JpdHlcIjo1MTQuMjg1NzE0Mjg1NzE0MixcInZvbHVtZVwiOjAuMzA1MDAwMDAwMDAwMDAwMSxcIm1pZGlOb3RlXCI6NDIsXCJtaWRpVmVsb2NpdHlcIjoxN30se1wic2FtcGxlXCI6XCJ0b21cIixcInByaW9yaXR5XCI6MTcwNy40Mjg1NzE0Mjg1NzEzLFwidm9sdW1lXCI6MC4zMDUwMDAwMDAwMDAwMDAxLFwibWlkaU5vdGVcIjo0MixcIm1pZGlWZWxvY2l0eVwiOjE3fV19Il0sImJwbSI6MTAwLCJudW1iZXJPZkJlYXRzIjo0LCJpc0luQnBtTW9kZSI6dHJ1ZX0=",
        };

        this.configureMidiFileWriterLibrary();

        this.currentGuiMode = DrumMachineGui.MOVE_NOTES_MODE; // start the GUI in 'move notes' mode

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
        this.initializeModeSelectionButtonStyles();
        this.initializeTempoBpmTextLabelsStyles();
        this.initializeTempoMillisecondsTextLabelsStyles();
        this.setNoteTrashBinVisibility(false) // trash bin only gets shown when we're moving a note or a sequencer row, so make sure it starts out as not visible

        this.lastButtonClickTimeTrackers = this.initializeLastButtonClickTimeTrackers(); // a hash used keep track of the last time each button was clicked
        this.initializeComponentEventListeners();
        this.initializeWindowEventListeners();

        // create object which will be used to track info about the note that is being clicked and dragged
        this.circleSelectionTracker = {
            circleBeingMoved: null,
            circleBeingMovedStartingPosition: {
                x: null,
                y: null,
            },
            circleBeingMovedOldRow: null,
            circleBeingMovedNewRow: null,
            circleBeingMovedOldBeatNumber: null,
            circleBeingMovedNewBeatNumber: null,
            firstClickPosition: {
                x: null,
                y: null,
            },
            startingRadius: null,
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
            selectedRowIndex: null,
            noteCircles: [],
            noteCirclesStartingPositions: [],
            noteCirclesStartingBeats: [],
            referenceLinesStartingShiftInPixels: 0,
            referenceLinesStartingPositions: [],
            subdivisionLinesStartingShiftInPixels: 0,
            subdivisionLinesStartingPositions: [],
            rowHandleStartingPosition: {
                x: null,
                y: null,
            }
        }

        this.noteBankNoteVolumesTracker = {}
        for (let sampleName of this.sampleNameList) {
            this.noteBankNoteVolumesTracker[sampleName] = {
                volume: this.configurations.notes.volumes.defaultVolume,
            }
        }

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

        this.initializeShiftToolToggleButtonActionListeners();
        this.initializeMidiOutputSelectorActionListeners();
        this.initializeDrumKitSelectorActionListeners();
        this.initializeExamplePatternSelectorActionListeners()
        this.initializeLoopLengthInMillisecondsTextInputActionListeners();
        this.initializeBeatsPerMinuteTextInputActionListeners();
        this.initializeNumberOfBeatsInLoopInputActionListeners();
        this.addPauseButtonActionListeners();
        this.addRestartSequencerButtonActionListeners();
        this.addClearAllNotesButtonActionListeners();
        this.addMoveNotesModeButtonActionListeners();
        this.addEditVolumesModeButtonActionListeners();
        this.addTempoInputModeSelectionButtonsActionListeners();
        this.addTapTempoButtonActionListeners();
        this.refreshWindowMouseMoveEvent();
        this.refreshWindowMouseUpEvent();
        this.initializeExportPatternToMidiFileButtonActionListener();

        this.pause(); // start the sequencer paused
        this.redrawSequencer(); // redraw the display
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
            if (circle.translation.x <= timeTrackingLinesXPosition - circleResizeRange || circle.translation.x >= timeTrackingLinesXPosition + circleResizeRange) {
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
         */
        for (let buttonName in this.lastButtonClickTimeTrackers) {
            let buttonClickTimeTracker = this.lastButtonClickTimeTrackers[buttonName]
            if (this.sequencer.currentTime - buttonClickTimeTracker.lastClickTime > this.configurations.buttonBehavior.showClicksForHowManyMilliseconds) {
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
    }
    
    // create and store on-screen lines, shapes, etc. (these will be Two.js 'path' objects).
    // these are drawn in the order that they are layered on-screen, i.e. the bottom layer 
    // is drawn first.
    initializeGuiShapes() {
        let shapes = {};
        // add shapes for menu outlines
        // edit mode buttons outline
        shapes.editModeSelectionButtonsOutline = this.initializeRectangleShape(this.configurations.moveNotesModeButton.top, this.configurations.moveNotesModeButton.left, this.configurations.moveNotesModeButton.height + (this.configurations.editVolumesModeButton.top - this.configurations.moveNotesModeButton.top), this.configurations.moveNotesModeButton.width)
        shapes.editModeSelectionButtonsOutline.stroke = this.configurations.subdivisionLines.color;
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
        // shift tool menu
        shapes.shiftMenuOutline = this.initializeRectangleShape(this.configurations.tempoInputModeSelectionBpmButton.top - 5, this.configurations.shiftModeLabelMenuTitle.left - 5, 128, 240) // use bpm button as a reference again to keep the top of all the menus aligned
        shapes.shiftMenuOutline.stroke = "#bfbfbf";
        shapes.shiftMenuTitle = this.initializeLabelText(this.configurations.shiftModeLabelMenuTitle.text, this.configurations.shiftModeLabelMenuTitle.left, this.configurations.shiftModeLabelMenuTitle.top, "left");
        shapes.shiftMenuTitle.size = 25
        shapes.shiftMenuTitle.fill = this.configurations.subdivisionLines.color
        this.initializeMultiLineText(this.configurations.shiftModeLabelMenuExplanation.lines, this.configurations.shiftModeLabelMenuExplanation.left, this.configurations.shiftModeLabelMenuExplanation.top, 13, 15, this.configurations.subdivisionLines.color, "left") // i'm not saving these shapes anywhere right now, since they never change after being initiailized
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
        shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        shapes.referenceLineLists = this.initializeAllReferenceLines() // list of lists, storing 'reference' lines for each sequencer row (one list of reference lines per row)
        shapes.sequencerRowLines = this.initializeAllSequencerRowLines() // list of sequencer row lines
        shapes.subdivisionLineLists = this.initializeAllSubdivisionLines() // list of lists, storing subdivison lines for each sequencer row (one list of subdivision lines per row)
        shapes.timeTrackingLines = this.initializeTimeTrackingLines() // list of lines that move to represent the current time within the loop
        shapes.noteBankContainer = this.initializeNoteBankContainer() // a rectangle that goes around the note bank
        shapes.noteTrashBinContainer = this.initializeNoteTrashBinContainer() // a rectangle that acts as a trash can for deleting notes
        shapes.pauseButtonShape = this.initializeRectangleShape(this.configurations.pauseButton.top, this.configurations.pauseButton.left, this.configurations.pauseButton.height, this.configurations.pauseButton.width) // a rectangle that will act as the pause button
        shapes.restartSequencerButtonShape = this.initializeRectangleShape(this.configurations.restartSequencerButton.top, this.configurations.restartSequencerButton.left, this.configurations.restartSequencerButton.height, this.configurations.restartSequencerButton.width) // a rectangle that will act as the button for restarting the sequencer for now
        shapes.clearAllNotesButtonShape = this.initializeRectangleShape(this.configurations.clearAllNotesButton.top, this.configurations.clearAllNotesButton.left, this.configurations.clearAllNotesButton.height, this.configurations.clearAllNotesButton.width) // a rectangle that will act as the button for clearing all notes on the sequencer
        shapes.addRowButtonShape = this.initializeRectangleShape(this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * (this.sequencer.rows.length - 1)) + this.configurations.addRowButton.topPadding, this.configurations.addRowButton.left, this.configurations.addRowButton.height, this.configurations.addRowButton.width) // clicking this button will add a new empty row to the sequencer
        shapes.clearNotesForRowButtonShapes = this.initializeButtonPerSequencerRow(this.configurations.clearRowButtons.topPaddingPerRow, this.configurations.clearRowButtons.leftPaddingPerRow, this.configurations.clearRowButtons.height, this.configurations.clearRowButtons.width) // this is a list of button rectangles, one per row, to clear the notes on that row
        shapes.sequencerRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.sequencerRowHandles.leftPadding, this.configurations.sequencerRowHandles.topPadding, this.configurations.sequencerRowHandles.radius, this.configurations.sequencerRowHandles.unselectedColor)
        shapes.volumeAdjusterRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.volumeAdjusterRowHandles.leftPadding, this.configurations.volumeAdjusterRowHandles.topPadding, this.configurations.volumeAdjusterRowHandles.radius, this.configurations.volumeAdjusterRowHandles.unselectedColor)
        shapes.shiftToolRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.shiftToolRowHandles.leftPadding, this.configurations.shiftToolRowHandles.topPadding, this.configurations.shiftToolRowHandles.radius, this.configurations.shiftToolRowHandles.unselectedColor)
        shapes.moveNotesModeButton = this.initializeRectangleShape(this.configurations.moveNotesModeButton.top, this.configurations.moveNotesModeButton.left, this.configurations.moveNotesModeButton.height, this.configurations.moveNotesModeButton.width) // a rectangle that will eventually be used to select between different modes of the sequencer (move notes, edit note volumes, select notes, etc.)
        shapes.editVolumesModeButton = this.initializeRectangleShape(this.configurations.editVolumesModeButton.top, this.configurations.editVolumesModeButton.left, this.configurations.editVolumesModeButton.height, this.configurations.editVolumesModeButton.width);
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
                tempoTextInputBpm: document.getElementById('tempo-text-inputs-bpm'),
                tempoTextInputMillis: document.getElementById('tempo-text-inputs-milliseconds'),
                tempoTextInputBeatsPerLoop: document.getElementById('tempo-text-inputs-beats-per-loop'),
                subdivisionTextInputs: document.getElementById('subdivision-text-inputs'),
                midiOutputSelector: document.getElementById('midi-output-selector-div'),
                drumkitSelector: document.getElementById('drum-kit-selector-div'),
                examplePatternSelector: document.getElementById('example-pattern-selector-div'),
            },
            textInputs: {
                loopLengthMillis: document.getElementById('text-input-loop-length-millis'),
                loopLengthBpm: document.getElementById('text-input-loop-length-bpm'),
                numberOfBeatsInLoop: document.getElementById('text-input-number-of-beats-in-loop'),
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
                moveNotesModeIcon: document.getElementById('edit-mode-move-notes-icon'),
                changeVolumesModeIcon: document.getElementById('edit-mode-change-note-volumes-icon'),
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

    // todo: clean this up a bit once we're sure we want to keep separate row handles for 'move rows' and 'change row volumes'
    initializeRowMovementVariablesAndVisuals(rowIndex) {
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
        this.rowSelectionTracker.shapes.push(...this.components.shapes.referenceLineLists[rowIndex])
        this.rowSelectionTracker.shapes.push(this.components.shapes.sequencerRowLines[rowIndex])
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
        if (this.configurations.hideIcons) {
            this.rowSelectionTracker.domElements.push(this.components.domElements.checkboxes.quantizationCheckboxes[rowIndex])
        } else {
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
        }
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

    initializeRowVolumeAdjustmentVariablesAndVisuals(rowIndex) {
        // save relevant info about whichever row is selected
        this.rowVolumeAdjustmentTracker.selectedRowIndex = rowIndex;
        // save a list of all the note circles that are associated with the selected row. we are saving this list so that we can 
        // perform operations on all the notes in a row if we want to (such as changing all of their volumes at the same time).
        // also track the starting radius of each circle on the row. this will also be used in adjusting note volumes for the row.
        this.rowVolumeAdjustmentTracker.noteCircles = [];
        this.rowVolumeAdjustmentTracker.noteCirclesStartingRadiuses = [];
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.rowVolumeAdjustmentTracker.noteCircles.push(circle)
                this.rowVolumeAdjustmentTracker.noteCirclesStartingRadiuses.push(circle.guiData.radiusWhenUnplayed)
            }
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

    initializeRowShiftToolVariablesAndVisuals(rowIndex) {
        this.shiftToolTracker.selectedRowIndex = rowIndex;
        this.shiftToolTracker.noteCircles = [];
        this.shiftToolTracker.noteCirclesStartingPositions = [];
        this.shiftToolTracker.noteCirclesStartingBeats = []
        for (let circle of this.allDrawnCircles) {
            if (circle.guiData.row === rowIndex) {
                this.shiftToolTracker.noteCircles.push(circle)
                this.shiftToolTracker.noteCirclesStartingPositions.push(circle.translation.x)
                this.shiftToolTracker.noteCirclesStartingBeats.push(circle.guiData.beat)
            }
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
        this.shiftToolTracker.rowHandleStartingPosition.x = this.components.shapes.shiftToolRowHandles[rowIndex].translation.x
        this.shiftToolTracker.rowHandleStartingPosition.y = this.components.shapes.shiftToolRowHandles[rowIndex].translation.y
        // update visuals
        let circle = this.components.shapes.shiftToolRowHandles[rowIndex]
        circle.fill = this.configurations.shiftToolRowHandles.selectedColor
        circle.stroke = this.configurations.subdivisionLines.color
        let rowSelectionRectangle = this.components.shapes.sequencerRowSelectionRectangles[rowIndex];
        rowSelectionRectangle.stroke = this.configurations.shiftToolRowHandles.selectedColor
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
            referenceLinesForRow = this.initializeReferenceLinesForRow(rowsDrawn)
            allReferenceLineLists.push(referenceLinesForRow) // keep a list of all rows' reference line lists
        }
        return allReferenceLineLists
    }

    initializeReferenceLinesForRow(rowIndex) {
        let shiftInPixelsForRow = this.referenceLinesShiftInPixelsPerRow[rowIndex];
        let referenceLinesForRow = []
        if (this.sequencer.rows[rowIndex].getNumberOfReferenceLines() <= 0) {
            return [] // don't draw reference lines for this row if it has 0 or fewer
        }
        let xIncrementBetweenLines = this.configurations.sequencer.width / this.sequencer.rows[rowIndex].getNumberOfReferenceLines()
        for (let linesDrawnForRow = 0; linesDrawnForRow < this.sequencer.rows[rowIndex].getNumberOfReferenceLines(); linesDrawnForRow++) {
            let sequencerLineCenterY = this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows)
            let halfOfLineWidth = Math.floor(this.configurations.sequencer.lineWidth / 2)
            // calculate the x position of this row line. incorporate the 'reference line shift' value for the row.
            let referenceLineXPosition = (xIncrementBetweenLines * linesDrawnForRow); // start with basic reference line position based on width of each beat and which beat we're on
            referenceLineXPosition += shiftInPixelsForRow // add offset to account for 'shift' tool changes made to reference lines for row
            if (referenceLineXPosition < 0) { // if the x position of the reference line is past the left edge of the sequencer, wrap it to the other side
                referenceLineXPosition = this.configurations.sequencer.width + referenceLineXPosition
            } else { // if the x position of the reference line is past the right edge of the sequencer, wrap it to the other side
                referenceLineXPosition = referenceLineXPosition % this.configurations.sequencer.width
            }
            referenceLineXPosition += this.configurations.sequencer.left // move the reference line position to account for the left position of the whole sequencer
            // draw the actual line
            let lineStart = {
                x: referenceLineXPosition,
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
            })
            this.addDefaultKeypressEventListenerToTextInput(referenceLineTextInput, false)
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
            // calculate the x position of this row line. incorporate the 'subdivision line shift' value for the row.
            let shiftInPixelsForRow = this.subdivisionLinesShiftInPixelsPerRow[rowIndex] % xIncrementBetweenSubdivisions;
            let subdivisionLineXPosition = (xIncrementBetweenSubdivisions * subdivisionsDrawnForRow) // start with basic subdivision line position based on width of each beat and which beat we're on
            subdivisionLineXPosition += shiftInPixelsForRow; // add offset to account for 'shift' tool changes made to subdivision lines for row
            if (subdivisionLineXPosition < 0) { // if the x position of the subdivision line is past the left edge of the sequencer, wrap it to the other side
                subdivisionLineXPosition = this.configurations.sequencer.width + subdivisionLineXPosition
            } else { // if the x position of the subdivision line is past the right edge of the sequencer, wrap it to the other side
                subdivisionLineXPosition = subdivisionLineXPosition % this.configurations.sequencer.width
            }
            subdivisionLineXPosition += this.configurations.sequencer.left // move the subdivision line position to account for the left position of the whole sequencer
            // draw the actual line
            let lineStart = {
                x: subdivisionLineXPosition,
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

    initializeSubdivisionTextInputsActionListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.numberOfRows; rowIndex++) {
            let subdivisionTextInput = this.components.domElements.textInputs.subdivisionTextInputs[rowIndex]
            subdivisionTextInput.addEventListener('blur', () => {
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
            })
            this.addDefaultKeypressEventListenerToTextInput(subdivisionTextInput, false)
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

    initializeSequencerRowHandlesActionListeners() {
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
        let circle = self.components.shapes.sequencerRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        if (self.rowSelectionTracker.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
            rowSelectionRectangle.stroke = self.configurations.sequencerRowHandles.unselectedColor
        }
    }

    moveRowMouseLeaveEventHandler(self, rowIndex) {
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
    }

    // 'adjust row volumes' row handles event listener initializations

    initializeVolumeAdjusterRowHandlesActionListeners() {
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
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            if (self.rowSelectionTracker.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
                circle.fill = self.configurations.volumeAdjusterRowHandles.unselectedColor
                rowSelectionRectangle.stroke = self.configurations.volumeAdjusterRowHandles.unselectedColor
            }
        }
    }

    changeRowVolumesMouseLeaveEventHandler(self, rowIndex) {
        if (self.components.shapes.volumeAdjusterRowHandles[rowIndex].guiData.respondToEvents) {
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.volumeAdjusterRowHandles.unselectedColor
            rowSelectionRectangle.stroke = 'transparent'
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
            let circle = self.components.shapes.volumeAdjusterRowHandles[rowIndex];
            let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
            circle.fill = self.configurations.volumeAdjusterRowHandles.unselectedColor
            rowSelectionRectangle.stroke = self.configurations.volumeAdjusterRowHandles.unselectedColor
        }
    }

    // 'shift row' row handles event listener initializations

    initializeShiftToolRowHandlesActionListeners() {
        for (let rowIndex = 0; rowIndex < this.components.shapes.shiftToolRowHandles.length; rowIndex++) {
            let circle = this.components.shapes.shiftToolRowHandles[rowIndex];

            // add border to circle on mouseover
            circle._renderer.elem.addEventListener('mouseenter', () => {
                this.shiftRowMouseEnterEventHandler(this, rowIndex);
            });
            // remove border from circle when mouse is no longer over it
            circle._renderer.elem.addEventListener('mouseleave', () => {
                this.shiftRowMouseLeaveEventHandler(this, rowIndex);
            });
            // when you hold your mouse down on the row handle circle, select that row.
            // we will de-select it later whenever you lift your mouse.
            circle._renderer.elem.addEventListener('mousedown', () => {
                this.shiftRowMouseDownEventHandler(this, rowIndex);
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
        let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        if (self.rowSelectionTracker.selectedRowIndex === null) { // if a row is already selected (i.e being moved), don't do any of this
            circle.fill = self.configurations.shiftToolRowHandles.unselectedColor
            rowSelectionRectangle.stroke = self.configurations.shiftToolRowHandles.unselectedColor
        }
    }

    shiftRowMouseLeaveEventHandler(self, rowIndex) {
        let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        circle.fill = self.configurations.shiftToolRowHandles.unselectedColor
        rowSelectionRectangle.stroke = 'transparent'
    }

    shiftRowMouseDownEventHandler(self, rowIndex) {
        // save relevant info about whichever row is selected
        self.initializeRowShiftToolVariablesAndVisuals(rowIndex);
    }

    shiftRowMouseUpEventHandler(self, rowIndex) {
        let circle = self.components.shapes.shiftToolRowHandles[rowIndex];
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[rowIndex]
        circle.fill = self.configurations.shiftToolRowHandles.unselectedColor
        rowSelectionRectangle.stroke = self.configurations.shiftToolRowHandles.unselectedColor
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

    initializeLoopLengthInMillisecondsTextInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'loop length in millis' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        this.components.domElements.textInputs.loopLengthMillis.addEventListener('blur', () => {
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
        })
        this.addDefaultKeypressEventListenerToTextInput(this.components.domElements.textInputs.loopLengthMillis, true)
    }

    // return the minimum beats per minute value the user can currently set the sequencer to, based on a couple other values.
    getMinimumAllowedSequencerBeatsPerMinute() {
        return Util.convertLoopLengthInMillisToBeatsPerMinute(this.configurations.tempoTextInputBpm.maximumValue, this.sequencer.tempoRepresentation.numberOfBeatsPerLoop);
    }

    // return the maximum beats per minute value the user can currently set the sequencer to, based on a couple other values.
    getMaximumAllowedSequencerBeatsPerMinute() {
        return Util.convertLoopLengthInMillisToBeatsPerMinute(this.sequencer.lookAheadMillis, this.sequencer.tempoRepresentation.numberOfBeatsPerLoop);
    }

    initializeBeatsPerMinuteTextInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'beats per minute' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
         this.components.domElements.textInputs.loopLengthBpm.addEventListener('blur', () => {
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
        })
        this.addDefaultKeypressEventListenerToTextInput(this.components.domElements.textInputs.loopLengthBpm, true)
    }

    initializeNumberOfBeatsInLoopInputActionListeners() {
        /**
         * set up 'focus' and 'blur' events for the 'number of beats in loop' text input.
         * the plan is that when you update the values in the text box, they will be applied
         * after you click away from the text box automaticaly, unless the input isn't a valid
         * number. if something besides a valid number is entered, the value will just go back
         * to whatever it was before, and not make any change to the sequencer.
         */
        this.components.domElements.textInputs.numberOfBeatsInLoop.addEventListener('blur', () => {
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
        })
        this.addDefaultKeypressEventListenerToTextInput(this.components.domElements.textInputs.numberOfBeatsInLoop, true)
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
                    // let midiId = " [ID: " + output[0] + "]"
                    // midiName = midiName + " [ID: " + midiId + "]"
                    if (midiName.length >= this.configurations.midiOutputSelector.maximumTextLength) {
                        midiName = midiName.substring(0, this.configurations.midiOutputSelector.maximumTextLength - 3);
                        midiName += "..."
                    }
                    option.text = midiName;
                    this.midiOutputsMap[option.text] = output[0]
                    this.components.domElements.selectors.midiOutput.add(option);
                }
            });
        }
    }

    initializeMidiOutputSelectorActionListeners() {
        this.components.domElements.selectors.midiOutput.addEventListener('change', () => {
            navigator.requestMIDIAccess().then((midiAccess) => {
                let midiAudioDriver = this.sequencer.audioDrivers[1]; // index 1 is just a hard-coded to always be the index of the MIDI audio driver. and index 0 is the WebAudio driver.
                let selectedMidiPortId = this.midiOutputsMap[this.components.domElements.selectors.midiOutput.value];
                // now that the asynchronous request for MIDI access has been completed, retrieve the particular port we want to use.
                // just use null if no MIDI output was specified. the MIDI audio driver is set up to nit play audio if its MIDI port is null.
                let midiOutput = (selectedMidiPortId === null ? null : midiAccess.outputs.get(selectedMidiPortId));
                midiAudioDriver.setMidiOutput(midiOutput); // update the MIDI driver we created earlier to use the MIDI port we just retrieved. 
            })
        });
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
    }

    initializeDrumKitSelectorActionListeners() {
        this.components.domElements.selectors.drumkit.addEventListener('change', () => {
            if (this.components.domElements.selectors.drumkit.value === this.configurations.drumkitSelector.noWebAudioOutputOptionText) { // if the 'no live audio' option is seleted
                this.sequencer.audioDrivers[0].muted = true;
            } else {
                this.sequencer.audioDrivers[0].muted = false;
                this.sequencer.samples = this.allDrumKitsHash[this.components.domElements.selectors.drumkit.value];
            }
        });
    }

    initializeExamplePatternSelectorValuesAndStyles() {
        this.components.domElements.divs.examplePatternSelector.style.left = "" + this.configurations.examplePatternSelector.position.left + "px";
        this.components.domElements.divs.examplePatternSelector.style.top = "" + this.configurations.examplePatternSelector.position.top + "px";
        // Add a default option to the selector for 'custom pattern'
        let customPattern = document.createElement("option");
        customPattern.text = this.configurations.examplePatternSelector.noExamplePatternSelectedText;
        this.components.domElements.selectors.examplePatterns.add(customPattern);
        // add an option for each different example pattern we want to include
        for(let [patternName, patternUrl] of Object.entries(this.exampleSequencerPatternsHash)) {
            let option = document.createElement("option");
            option.text = patternName;
            this.components.domElements.selectors.examplePatterns.add(option);
        }
    }

    initializeExamplePatternSelectorActionListeners() {
        this.components.domElements.selectors.examplePatterns.addEventListener('change', () => {
            let selectedValue = this.components.domElements.selectors.examplePatterns.value;
            if (selectedValue === this.configurations.examplePatternSelector.noExamplePatternSelectedText) { // if the 'don't use an example pattern' option is selected
                // do nothing. we don't want to load or change anything when someone selects the 'don't use an example pattern' option
            } else {
                // if an example pattern was selected, here we will want to load it. we will do that be deserializing it from the serialized sequencer string we stored in our 'example patterns' hash.
                this.loadSequencerPatternFromBase64String(this.exampleSequencerPatternsHash[selectedValue]);
                // change the selected value back to 'no selection' right away. that way we allow re-selecting the same option over and over to reload the same example pattern
                this.components.domElements.selectors.examplePatterns.value = this.configurations.examplePatternSelector.noExamplePatternSelectedText
            }
        });
    }

    // add action listeners to the buttons that let you select which resources will be moved by the shift tool.
    // there is one button each for: notes, subdivision lines, and refernce lines.
    initializeShiftToolToggleButtonActionListeners() {
        // shift notes
        this.components.shapes.shiftModeMoveNotesButton._renderer.elem.addEventListener('click', () => this.shiftModeMoveNotesClickHandler(this));
        this.components.domElements.images.activateShiftNotesIcon.addEventListener('click', () => this.shiftModeMoveNotesClickHandler(this))
        // shift subdivision lines
        this.components.shapes.shiftModeMoveSubdivisionLinesButton._renderer.elem.addEventListener('click', () => this.shiftModeMoveSubdivisionLinesClickHandler(this));
        this.components.domElements.images.activateShiftSubdivisionLinesIcon.addEventListener('click', () => this.shiftModeMoveSubdivisionLinesClickHandler(this))
        // shift reference lines
        this.components.shapes.shiftModeMoveReferenceLinesButton._renderer.elem.addEventListener('click', () => this.shiftModeMoveReferenceLinesClickHandler(this));
        this.components.domElements.images.activateShiftReferenceLinesIcon.addEventListener('click', () => this.shiftModeMoveReferenceLinesClickHandler(this))
    }

    shiftModeMoveNotesClickHandler(self) {
        self.shiftToolTracker.resourcesToShift.notes = !self.shiftToolTracker.resourcesToShift.notes
        if (self.shiftToolTracker.resourcesToShift.notes) {
            // move notes
            self.components.shapes.shiftModeMoveNotesButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        } else {
            // don't move notes
            self.components.shapes.shiftModeMoveNotesButton.fill = 'transparent'
        }
        self.redrawSequencer(); // redraw sequencer so we can show or hide the 'shift' tool row handles if necessary
    }

    shiftModeMoveSubdivisionLinesClickHandler(self) {
        self.shiftToolTracker.resourcesToShift.subdivisionLines = !self.shiftToolTracker.resourcesToShift.subdivisionLines
        if (self.shiftToolTracker.resourcesToShift.subdivisionLines) {
            // move subdivision lines
            self.components.shapes.shiftModeMoveSubdivisionLinesButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        } else {
            // don't move subdivision lines
            self.components.shapes.shiftModeMoveSubdivisionLinesButton.fill = 'transparent'
        }
        self.redrawSequencer(); // redraw sequencer so we can show or hide the 'shift' tool row handles if necessary
    }

    shiftModeMoveReferenceLinesClickHandler(self) {
        self.shiftToolTracker.resourcesToShift.referenceLines = !self.shiftToolTracker.resourcesToShift.referenceLines
        if (self.shiftToolTracker.resourcesToShift.referenceLines) {
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
            textArea.style.top = "" + (this.configurations.sequencer.top + (rowIndex * this.configurations.sequencer.spaceBetweenRows) + this.configurations.subdivisionLineTextInputs.topPaddingPerRow) + "px"
            textArea.style.left = "" + (this.configurations.sequencer.left + this.configurations.sequencer.width + this.configurations.subdivisionLineTextInputs.leftPaddingPerRow) + "px"
            textArea.style.borderColor = this.configurations.sequencer.color
            textArea.value = this.sequencer.rows[rowIndex].getNumberOfSubdivisions()
            textArea.style.color = this.configurations.defaultFont.color // set font color
            textArea.title = "Number of beats"
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
            let verticalPosition = this.configurations.sequencer.top + (this.configurations.sequencer.spaceBetweenRows * rowIndex) + this.configurations.subdivisionLineTextInputs.topPaddingPerRow + 4
            let horizontalPosition = this.configurations.sequencer.left + this.configurations.sequencer.width + 73
            let checkbox = this.initializeCheckbox(verticalPosition, horizontalPosition)
            if (this.sequencer.rows[rowIndex].quantized) {
                checkbox.checked = true;
            }
            this.components.domElements.checkboxes.quantizationCheckboxes.push(checkbox)
        }
    }

    initializeQuantizationCheckboxActionListeners() {
        if (!this.configurations.hideIcons) {
            return 
        }
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            let checkbox = this.components.domElements.checkboxes.quantizationCheckboxes[rowIndex]
            if (this.eventHandlerFunctions["quantizationCheckbox" + rowIndex] !== null && this.eventHandlerFunctions["quantizationCheckbox" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                checkbox.removeEventListener('click', this.eventHandlerFunctions["quantizationCheckbox" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["quantizationCheckbox" + rowIndex] = () => this.setQuantizationButtonClickHandler(this, rowIndex, checkbox.checked);
            checkbox.addEventListener('click', this.eventHandlerFunctions["quantizationCheckbox" + rowIndex])
        }
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    setQuantizationButtonClickHandler(self, rowIndex, quantize) {
        if (self.sequencer.rows[rowIndex].getNumberOfSubdivisions() === 0) {
            // you can't quantize a row if it has 0 subdivisions, so automatically change the value to 1 in this case
            self.updateNumberOfSubdivisionsForRow(1, rowIndex)
        }
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

    initializeAddRowButtonActionListener() {
        this.lastButtonClickTimeTrackers.addRow.shape = this.components.shapes.addRowButtonShape;
        if (this.eventHandlerFunctions.addRowButton !== null && this.eventHandlerFunctions.addRowButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.addRowButtonShape._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.addRowButton)
            this.components.domElements.images.addIcon.removeEventListener('click', this.eventHandlerFunctions.addRowButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.addRowButton = () => this.addRowClickHandler(this)
        this.components.shapes.addRowButtonShape._renderer.elem.addEventListener('click', this.eventHandlerFunctions.addRowButton)
        this.components.domElements.images.addIcon.addEventListener('click', this.eventHandlerFunctions.addRowButton)
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    addRowClickHandler(self) {
        self.lastButtonClickTimeTrackers.addRow.lastClickTime = self.sequencer.currentTime
        self.components.shapes.addRowButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.addEmptySequencerRow();
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

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
        self.saveCurrentSequencerStateToUrlHash();
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
        if (self.components.shapes.clearNotesForRowButtonShapes[rowIndex].guiData.respondToEvents) {
            self.lastButtonClickTimeTrackers["clearNotesForRow" + rowIndex].lastClickTime = self.sequencer.currentTime
            self.components.shapes.clearNotesForRowButtonShapes[rowIndex].fill = self.configurations.buttonBehavior.clickedButtonColor
            self.clearNotesForRow(rowIndex);
            self.resetNotesAndLinesDisplayForRow(rowIndex);
            self.saveCurrentSequencerStateToUrlHash();
        }
    }

    clearNotesForRow(rowIndex) { 
        this.sequencer.clearRow(rowIndex)
        this.refreshNoteDependentButtonsForRow(rowIndex)
    }

    /**
     * add action listener to the 'export sequencer pattern to midi file' button
     */
    initializeExportPatternToMidiFileButtonActionListener() {
        this.lastButtonClickTimeTrackers.exportPatternToMidiFile.shape = this.components.shapes.exportPatternToMidiFileButton;
        if (this.eventHandlerFunctions.exportPatternToMidiFile !== null && this.eventHandlerFunctions.exportPatternToMidiFile !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.exportPatternToMidiFile._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.exportPatternToMidiFile)
            this.components.domElements.images.exportPatternAsMidiFileIcon.removeEventListener('click', this.eventHandlerFunctions.exportPatternToMidiFile)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.exportPatternToMidiFile = () => this.exportPatternToMidiFileButtonClickHandler(this)
        this.components.shapes.exportPatternToMidiFileButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.exportPatternToMidiFile)
        this.components.domElements.images.exportPatternAsMidiFileIcon.addEventListener('click', this.eventHandlerFunctions.exportPatternToMidiFile)
    }

    exportPatternToMidiFileButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers["exportPatternToMidiFile"].lastClickTime = self.sequencer.currentTime
        self.components.shapes.exportPatternToMidiFileButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.exportSequencerPatternToMidiDataUri();
    }

    /**
     * shift tool 'reset reference lines shift' button (one button per row) logic
     */
    
    addShiftToolResetReferenceLinesButtonsActionListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            this.lastButtonClickTimeTrackers["resetReferenceLinesShift" + rowIndex] = {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex],
            }
            if (this.eventHandlerFunctions["resetReferenceLinesShiftShape" + rowIndex] !== null && this.eventHandlerFunctions["resetReferenceLinesShiftShape" + rowIndex] !== undefined){
                // remove event listeners if they've already been added to avoid duplicates
                this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex]._renderer.elem.removeEventListener('click', this.eventHandlerFunctions["resetReferenceLinesShiftShape" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["resetReferenceLinesShiftShape" + rowIndex] = () => this.resetReferenceLinesShiftClickHandler(this, rowIndex);
            this.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex]._renderer.elem.addEventListener('click', this.eventHandlerFunctions["resetReferenceLinesShiftShape" + rowIndex] );
        }
    }

    resetReferenceLinesShiftClickHandler(self, rowIndex) {
        self.lastButtonClickTimeTrackers["resetReferenceLinesShift" + rowIndex].lastClickTime = self.sequencer.currentTime
        self.components.shapes.shiftModeResetReferenceLinesButtons[rowIndex].fill = self.configurations.buttonBehavior.clickedButtonColor
        self.resetReferenceLineShiftForRow(rowIndex);
        self.referenceLinesShiftInPixelsPerRow[rowIndex] = self.sequencer.rows[rowIndex].getReferenceLineShiftInMilliseconds();
        self.resetNotesAndLinesDisplayForRow(rowIndex);
        self.saveCurrentSequencerStateToUrlHash();
    }

    resetReferenceLineShiftForRow(rowIndex) {
        this.sequencer.rows[rowIndex].setReferenceLineShiftMilliseconds(0);
    }

    /**
     * shift tool 'reset subdivision lines shift' button (one button per row) logic
     */
    
     addShiftToolResetSubdivisionLinesButtonsActionListeners() {
        for (let rowIndex = 0; rowIndex < this.sequencer.rows.length; rowIndex++) {
            this.lastButtonClickTimeTrackers["resetSubdivisionLinesShift" + rowIndex] = {
                lastClickTime: Number.MIN_SAFE_INTEGER,
                shape: this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex],
            }
            if (this.eventHandlerFunctions["resetSubdivisionLinesShiftShape" + rowIndex] !== null && this.eventHandlerFunctions["resetSubdivisionLinesShiftShape" + rowIndex] !== undefined){
                // remove event listeners if they've already been added to avoid duplicates
                this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex]._renderer.elem.removeEventListener('click', this.eventHandlerFunctions["resetSubdivisionLinesShiftShape" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["resetSubdivisionLinesShiftShape" + rowIndex] = () => this.resetSubdivisionLinesShiftClickHandler(this, rowIndex);
            this.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex]._renderer.elem.addEventListener('click', this.eventHandlerFunctions["resetSubdivisionLinesShiftShape" + rowIndex] );
        }
    }

    resetSubdivisionLinesShiftClickHandler(self, rowIndex) {
        self.lastButtonClickTimeTrackers["resetSubdivisionLinesShift" + rowIndex].lastClickTime = self.sequencer.currentTime
        self.components.shapes.shiftModeResetSubdivisionLinesButtons[rowIndex].fill = self.configurations.buttonBehavior.clickedButtonColor
        self.resetSubdivisionLineShiftForRow(rowIndex);
        self.subdivisionLinesShiftInPixelsPerRow[rowIndex] = self.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds();
        self.resetNotesAndLinesDisplayForRow(rowIndex);
        self.saveCurrentSequencerStateToUrlHash();
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
    }

    /**
     * 'clear all sequencer notes' logic
     */

    addClearAllNotesButtonActionListeners() {
        if (this.eventHandlerFunctions.clearAllNotesButton !== null && this.eventHandlerFunctions.clearAllNotesButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.clearAllNotesButtonShape._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.clearAllNotesButton)
            this.components.domElements.images.clearAllIcon.removeEventListener('click', this.eventHandlerFunctions.clearAllNotesButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.clearAllNotesButton = () => this.clearAllNotesButtonClickHandler(this);
        this.components.shapes.clearAllNotesButtonShape._renderer.elem.addEventListener('click', this.eventHandlerFunctions.clearAllNotesButton)
        this.components.domElements.images.clearAllIcon.addEventListener('click', this.eventHandlerFunctions.clearAllNotesButton)
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    clearAllNotesButtonClickHandler(self) {
        self.lastButtonClickTimeTrackers.clearAllNotes.lastClickTime = self.sequencer.currentTime
        self.components.shapes.clearAllNotesButtonShape.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.loadSequencerPatternFromBase64String(this.configurations.sequencer.clearedPatternBase64String); 
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    initializeModeSelectionButtonStyles() {
        if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE) {
            this.components.shapes.moveNotesModeButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
            this.components.shapes.editVolumesModeButton.fill = 'transparent';
        } else if (this.currentGuiMode === DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE) {
            this.components.shapes.moveNotesModeButton.fill = 'transparent';
            this.components.shapes.editVolumesModeButton.fill = this.configurations.buttonBehavior.clickedButtonColor;
        }
    }

    addMoveNotesModeButtonActionListeners() {
        if (this.eventHandlerFunctions.moveNotesModeButton !== null && this.eventHandlerFunctions.moveNotesModeButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.moveNotesModeButton._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.moveNotesModeButton)
            this.components.domElements.images.moveNotesModeIcon.removeEventListener('click', this.eventHandlerFunctions.moveNotesModeButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.moveNotesModeButton = () => this.moveNotesModeButtonClickHandler(this);
        this.components.shapes.moveNotesModeButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.moveNotesModeButton)
        this.components.domElements.images.moveNotesModeIcon.addEventListener('click', this.eventHandlerFunctions.moveNotesModeButton)
    }

    addEditVolumesModeButtonActionListeners() {
        if (this.eventHandlerFunctions.editVolumesModeButton !== null && this.eventHandlerFunctions.editVolumesModeButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.editVolumesModeButton._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.editVolumesModeButton)
            this.components.domElements.images.changeVolumesModeIcon.removeEventListener('click', this.eventHandlerFunctions.editVolumesModeButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.editVolumesModeButton = () => this.editVolumesModeButtonClickHandler(this);
        this.components.shapes.editVolumesModeButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.editVolumesModeButton)
        this.components.domElements.images.changeVolumesModeIcon.addEventListener('click', this.eventHandlerFunctions.editVolumesModeButton)
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    moveNotesModeButtonClickHandler(self) {
        if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE) {
            return;
        }
        this.currentGuiMode = DrumMachineGui.MOVE_NOTES_MODE;
        self.components.shapes.moveNotesModeButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        self.components.shapes.editVolumesModeButton.fill = 'transparent'
        // reset circle selection variables
        self.circleSelectionTracker.circleBeingMoved = null
        self.setNoteTrashBinVisibility(false)
    }

    // search for comment "a general note about the 'self' paramater" within this file for info on its use here
    editVolumesModeButtonClickHandler(self) {
        if(this.currentGuiMode === DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE) {
            return;
        }
        this.currentGuiMode = DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE;
        self.components.shapes.moveNotesModeButton.fill = 'transparent'
        self.components.shapes.editVolumesModeButton.fill = self.configurations.buttonBehavior.clickedButtonColor
        // reset circle selection variables
        self.circleSelectionTracker.circleBeingMoved = null
        self.setNoteTrashBinVisibility(false)
    }

    addTempoInputModeSelectionButtonsActionListeners() {
        this.addTempoInputModeSelectionBpmButtonActionListener();
        this.addTempoInputModeSelectionMillisecondsButtonActionListener();
    }

    addTempoInputModeSelectionBpmButtonActionListener() {
        if (this.eventHandlerFunctions.tempoInputModeSelectionBpmButton !== null && this.eventHandlerFunctions.tempoInputModeSelectionBpmButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.tempoInputModeSelectionBpmButton._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
            this.components.domElements.images.bpmLoopLengthModeIcon.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
            this.components.shapes.tempoLabelMenuTitleTempoWord._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.tempoInputModeSelectionBpmButton = () => this.tempoInputModeSelectionBpmClickHandler(this);
        this.components.shapes.tempoInputModeSelectionBpmButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
        this.components.domElements.images.bpmLoopLengthModeIcon.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
        this.components.shapes.tempoLabelMenuTitleTempoWord._renderer.elem.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionBpmButton)
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

    addTempoInputModeSelectionMillisecondsButtonActionListener() {
        if (this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton !== null && this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.tempoInputModeSelectionMillisecondsButton._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
            this.components.domElements.images.millisecondsLoopLengthModeIcon.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
            this.components.shapes.tempoLabelMenuTitleTimeWord._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton = () => this.tempoInputModeSelectionMillisecondsClickHandler(this);
        this.components.shapes.tempoInputModeSelectionMillisecondsButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
        this.components.domElements.images.millisecondsLoopLengthModeIcon.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
        this.components.shapes.tempoLabelMenuTitleTimeWord._renderer.elem.addEventListener('click', this.eventHandlerFunctions.tempoInputModeSelectionMillisecondsButton)
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
        this.addTapTempoButtonActionListeners();
    }

    addTapTempoButtonActionListeners() {
        if (this.eventHandlerFunctions.tapTempoButton !== null && this.eventHandlerFunctions.tapTempoButton !== undefined) {
            // remove event listeners if they've already been added to avoid duplicates
            this.components.shapes.tapTempoButton._renderer.elem.removeEventListener('click', this.eventHandlerFunctions.tapTempoButton)
            this.components.domElements.images.tapTempoIcon.removeEventListener('click', this.eventHandlerFunctions.tapTempoButton)
        }
        // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
        this.eventHandlerFunctions.tapTempoButton = () => this.tapTempoClickHandler(this);
        this.components.shapes.tapTempoButton._renderer.elem.addEventListener('click', this.eventHandlerFunctions.tapTempoButton)
        this.components.domElements.images.tapTempoIcon.addEventListener('click', this.eventHandlerFunctions.tapTempoButton)
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
        this.components.shapes.tapTempoButton.fill = 'transparent'
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
            circle.stroke = 'black'
            circle.linewidth = 2
        });
        // remove border from circle when mouse is no longer over it
        circle._renderer.elem.addEventListener('mouseleave', (event) => {
            circle.stroke = 'transparent'
        });
        // select circle (for moving) if we click it
        circle._renderer.elem.addEventListener('mousedown', (event) => {
            this.adjustEventCoordinates(event);
            let mouseX = event.pageX;
            let mouseY = event.pageY;
            this.circleSelectionTracker.circleBeingMoved = circle
            this.circleSelectionTracker.circleBeingMovedStartingPosition.x = this.circleSelectionTracker.circleBeingMoved.translation.x
            this.circleSelectionTracker.circleBeingMovedStartingPosition.y = this.circleSelectionTracker.circleBeingMoved.translation.y
            this.circleSelectionTracker.firstClickPosition.x = mouseX;
            this.circleSelectionTracker.firstClickPosition.y = mouseY;
            this.circleSelectionTracker.startingRadius = circle.radius;
            this.circleSelectionTracker.circleBeingMovedOldRow = this.circleSelectionTracker.circleBeingMoved.guiData.row
            this.circleSelectionTracker.circleBeingMovedNewRow = this.circleSelectionTracker.circleBeingMovedOldRow
            this.circleSelectionTracker.circleBeingMovedOldBeatNumber = this.circleSelectionTracker.circleBeingMoved.guiData.beat
            this.circleSelectionTracker.circleBeingMovedNewBeatNumber = this.circleSelectionTracker.circleBeingMovedOldBeatNumber
            // todo: make notes being moved a little bit transparent (just while they're being moved, so we can see what's behind them)
            if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE){
                this.setNoteTrashBinVisibility(true);
            }
            this.components.shapes.noteTrashBinContainer.stroke = 'transparent'
            if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE) {
                this.sequencer.playDrumSampleNow(this.circleSelectionTracker.circleBeingMoved.guiData.sampleName, this.circleSelectionTracker.circleBeingMoved.guiData.volume, this.circleSelectionTracker.circleBeingMoved.guiData.midiNote, this.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
            } else if (this.currentGuiMode === DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE) {
                // do nothing, as in don't play the note's sound now. when changing note volumes, the note's sound will play on mouse up instead of mouse down, so we can hear the end result of our volume adjustment.
            }
            
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
        return parseInt(Util.calculateLinearConversion(webAudioVolume, this.configurations.notes.volumes.minimumVolume, this.configurations.notes.volumes.maximumVolume, this.configurations.midi.velocity.minimumVelocity, this.configurations.midi.velocity.maximumVelocity));
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
        for (let circle of this.components.shapes.volumeAdjusterRowHandles) {
            circle.remove();
        }
        this.components.shapes.volumeAdjusterRowHandles = []
        for (let circle of this.components.shapes.shiftToolRowHandles) {
            circle.remove();
        }
        this.components.shapes.shiftToolRowHandles = []
        this.components.shapes.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        this.components.shapes.referenceLineLists = this.initializeAllReferenceLines();
        this.components.shapes.subdivisionLineLists = this.initializeAllSubdivisionLines();
        this.components.shapes.sequencerRowLines = this.initializeAllSequencerRowLines();
        this.components.shapes.volumeAdjusterRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.volumeAdjusterRowHandles.leftPadding, this.configurations.volumeAdjusterRowHandles.topPadding, this.configurations.volumeAdjusterRowHandles.radius, this.configurations.volumeAdjusterRowHandles.unselectedColor)
        this.components.shapes.sequencerRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.sequencerRowHandles.leftPadding, this.configurations.sequencerRowHandles.topPadding, this.configurations.sequencerRowHandles.radius, this.configurations.sequencerRowHandles.unselectedColor);
        this.components.shapes.timeTrackingLines = this.initializeTimeTrackingLines();
        this.drawAllNoteBankCircles();
        this.drawNotesToReflectSequencerCurrentState();
        // only draw shift tool row handles if the shift tool is active (as in, if any resources are selected for use with the shift tool)
        let shiftToolIsActivated = this.shiftToolTracker.resourcesToShift.notes || this.shiftToolTracker.resourcesToShift.referenceLines || this.shiftToolTracker.resourcesToShift.subdivisionLines
        if (shiftToolIsActivated) {
            this.components.shapes.shiftToolRowHandles = this.initializeCirclesPerSequencerRow(this.configurations.shiftToolRowHandles.leftPadding, this.configurations.shiftToolRowHandles.topPadding, this.configurations.shiftToolRowHandles.radius, this.configurations.shiftToolRowHandles.unselectedColor)
        }
    }

    redrawSequencer() {
        // update mouse event listeners to reflect current state of sequencer (number of rows, etc.)
        this.refreshWindowMouseMoveEvent();
        this.initializeReferenceLinesShiftPixelsTracker(); // set up variables for handling reference line 'shift' values
        this.initializeSubdivisionLinesShiftPixelsTracker(); // set up variables for handling subdivision line 'shift' values
        // redraw notes and lines
        this.resetNotesAndLinesDisplayForAllRows();
        // redraw html inputs, such as subdivision and reference line text areas, quantization checkboxes
        this.initializeSubdivisionTextInputsValuesAndStyles();
        this.initializeReferenceLineTextInputsValuesAndStyles();
        this.initializeQuantizationCheckboxes(); // add checkboxes for toggling quantization on each row. these might be replaced with hand-drawn buttons of some sort later for better UI
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

        // update two.js so we can add action listeners to shapes
        this.two.update()
        // initialize action listeners
        this.initializeSubdivisionTextInputsActionListeners();
        this.initializeReferenceLineTextInputsActionListeners();
        this.addClearNotesForRowButtonsActionListeners();
        this.addShiftToolResetReferenceLinesButtonsActionListeners();
        this.addShiftToolResetSubdivisionLinesButtonsActionListeners();
        this.initializeQuantizationCheckboxActionListeners();
        this.initializeAddRowButtonActionListener();
        this.initializeSequencerRowHandlesActionListeners();
        this.initializeVolumeAdjusterRowHandlesActionListeners();
        this.initializeShiftToolRowHandlesActionListeners();
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
        if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE) {
            self.moveNotesModeMouseMoveEventHandler(self, event);
        } else if (this.currentGuiMode === DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE) {
            self.changeNoteVolumesModeMouseMoveEventHandler(self, event);
        }
    }

    changeNoteVolumesModeMouseMoveEventHandler(self, event) {
        if (self.circleSelectionTracker.circleBeingMoved !== null) {
            self.adjustEventCoordinates(event);
            let mouseX = event.pageX;
            let mouseY = event.pageY;
            let mouseHasMoved = (mouseX !== self.circleSelectionTracker.firstClickPosition.x || mouseY !== self.circleSelectionTracker.firstClickPosition.y)
            if (mouseHasMoved) {
                let mouseMoveDistance = self.circleSelectionTracker.firstClickPosition.y - mouseY; // calculate how far the mouse has moved. only look at one axis of change for now. if that seems weird it can be changed later.
                let volumeAdjustmentAmount = mouseMoveDistance / self.configurations.notes.volumes.volumeAdjustmentSensitivityDivider;
                // set the note being changed to have the right new radius on the GUI. confine the new radius to the minimum and maximum radius allowed.
                self.circleSelectionTracker.circleBeingMoved.radius = Util.confineNumberToBounds(self.circleSelectionTracker.startingRadius + volumeAdjustmentAmount, self.configurations.notes.volumes.minimumCircleRadius, self.configurations.notes.volumes.maximumCircleRadius);
                self.circleSelectionTracker.circleBeingMoved.guiData.radiusWhenUnplayed = self.circleSelectionTracker.circleBeingMoved.radius;
                // convert the circle radius into a proportionate note volume.
                let newVolume = self.calculateVolumeForCircleRadius(self.circleSelectionTracker.circleBeingMoved.radius);
                if (self.circleSelectionTracker.circleBeingMovedOldRow < 0) { // the note we are changing the volume for is in the note bank.
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
                    let node = self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedOldRow].removeNode(self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                    node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity
                    self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedNewRow].insertNode(node, self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    // we will save the sequencer state to the URL in the 'mouse up' event instead of here, for performance reasons
                }
            }
        }
        if (self.rowVolumeAdjustmentTracker.selectedRowIndex !== null) { // handle mousemove events when adjusting note volumes for a row
            self.rowVolumeAdjustmentWindowMouseMoveHandler(self, event)
        }
        if (self.rowSelectionTracker.selectedRowIndex !== null) {
            self.rowMovementWindowMouseMoveHandler(self, event);
        }
        if (self.shiftToolTracker.selectedRowIndex !== null) {
            self.shiftToolMouseMoveEventHandler(self, event);
        }
    }

    rowVolumeAdjustmentWindowMouseMoveHandler(self, event) {
        self.adjustEventCoordinates(event)
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
    }

    // this method is very messy. my top priority was to get it working, and not worry about duplicated code or using the most perfect straightforward logic flow.
    // this will definitely need to be refactored later, but that will be easier once we know exactly how everything will work / what the logic needs to do.
    shiftToolMouseMoveEventHandler(self, event){
        self.adjustEventCoordinates(event)
        let mouseX = event.pageX
        let mouseY = event.pageY
        let mouseHasMoved = (mouseX !== self.shiftToolTracker.rowHandleStartingPosition.x || mouseY !== self.shiftToolTracker.rowHandleStartingPosition.y)
        if (mouseHasMoved) {
            let mouseMoveDistance = self.shiftToolTracker.rowHandleStartingPosition.x - mouseX; // calculate how far the mouse has moved. only look at one axis of change for now. if that seems weird it can be changed later.
            if (self.shiftToolTracker.resourcesToShift.subdivisionLines) { // adjust subdivision lines first, because if we move those, the way we move quantized notes also need to change.
                // this logic will always be the same regardless of whether the row is quantized or not, since subdivision lines _are_ the grid things get snapped to
                for (let lineIndex = 0; lineIndex < self.components.shapes.subdivisionLineLists[self.shiftToolTracker.selectedRowIndex].length; lineIndex++) {
                    let line = self.components.shapes.subdivisionLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
                    let lineXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.subdivisionLinesStartingPositions[lineIndex] - mouseMoveDistance) - self.configurations.sequencer.left;
                    if (lineXPositionAdjustedForSequencerLeftEdge < 0) {
                        lineXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + lineXPositionAdjustedForSequencerLeftEdge
                    } else if (lineXPositionAdjustedForSequencerLeftEdge > self.configurations.sequencer.width) {
                        lineXPositionAdjustedForSequencerLeftEdge = lineXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
                    }
                    let newLineXPosition = self.configurations.sequencer.left + lineXPositionAdjustedForSequencerLeftEdge
                    line.translation.x = newLineXPosition
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
            // if the row is quantized and we are moving subdivision lines, move notes too regardless of whether 'shift' is turned on for notes, since the notes have to stay quantized to the subdivision lines
            let notesNeedToBeMovedWithSubdivisionLines = self.shiftToolTracker.resourcesToShift.subdivisionLines && self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].quantized;
            if (self.shiftToolTracker.resourcesToShift.notes || notesNeedToBeMovedWithSubdivisionLines) { // adjust note positions
                // we need to have some different logic here depending on whether the row is quantized or not.
                for (let noteCircleIndex = 0; noteCircleIndex < self.shiftToolTracker.noteCircles.length; noteCircleIndex++) {
                    let currentNoteCircle = self.shiftToolTracker.noteCircles[noteCircleIndex];
                    let newNoteXPosition;
                    let newNoteBeatNumber;
                    if (self.sequencer.rows[self.shiftToolTracker.selectedRowIndex].quantized) { // handle note shifting for when the row is quantized)
                        if (self.shiftToolTracker.resourcesToShift.subdivisionLines) { 
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
            if (self.shiftToolTracker.resourcesToShift.referenceLines) { // next deal with adjusting reference row positions
                // this logic will always be the same regardless of whether the row is quantized or not, since reference lines can't be snapped to grid.
                for (let lineIndex = 0; lineIndex < self.components.shapes.referenceLineLists[self.shiftToolTracker.selectedRowIndex].length; lineIndex++) {
                    let line = self.components.shapes.referenceLineLists[self.shiftToolTracker.selectedRowIndex][lineIndex];
                    let lineXPositionAdjustedForSequencerLeftEdge = (self.shiftToolTracker.referenceLinesStartingPositions[lineIndex] - mouseMoveDistance) - self.configurations.sequencer.left;
                    if (lineXPositionAdjustedForSequencerLeftEdge < 0) {
                        lineXPositionAdjustedForSequencerLeftEdge = self.configurations.sequencer.width + lineXPositionAdjustedForSequencerLeftEdge
                    } else if (lineXPositionAdjustedForSequencerLeftEdge > self.configurations.sequencer.width) {
                        lineXPositionAdjustedForSequencerLeftEdge = lineXPositionAdjustedForSequencerLeftEdge % self.configurations.sequencer.width
                    }
                    let newLineXPosition = self.configurations.sequencer.left + lineXPositionAdjustedForSequencerLeftEdge
                    line.translation.x = newLineXPosition
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
        }
        let circle = self.components.shapes.shiftToolRowHandles[self.shiftToolTracker.selectedRowIndex]
        circle.stroke = self.configurations.subdivisionLines.color
        circle.linewidth = 3
        circle.fill = self.configurations.shiftToolRowHandles.selectedColor
        let rowSelectionRectangle = self.components.shapes.sequencerRowSelectionRectangles[self.shiftToolTracker.selectedRowIndex]
        rowSelectionRectangle.stroke = self.configurations.shiftToolRowHandles.selectedColor
    }

    moveNotesModeMouseMoveEventHandler(self, event) {
        // clicking on a circle sets 'circleBeingMoved' to it. circle being moved will follow mouse movements (i.e. click-drag).
        if (self.circleSelectionTracker.circleBeingMoved !== null) { // handle mousemove events when a note is selected
            self.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY
            // start with default note movement behavior, for when the note doesn't fall within range of the trash bin, a sequencer line, etc.
            self.circleSelectionTracker.circleBeingMoved.translation.x = mouseX
            self.circleSelectionTracker.circleBeingMoved.translation.y = mouseY
            self.circleSelectionTracker.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW // start with "it's not colliding with anything", and update the value from there if we find a collision
            self.circleSelectionTracker.circleBeingMoved.stroke = "black"
            self.components.domElements.images.trashClosedIcon.style.display = 'block'
            self.components.domElements.images.trashOpenIcon.style.display = 'none'
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
            if (withinHorizontalBoundaryOfNoteTrashBin && withinVerticalBoundaryOfNoteTrashBin) {
                self.circleSelectionTracker.circleBeingMoved.translation.x = centerOfTrashBinX
                self.circleSelectionTracker.circleBeingMoved.translation.y = centerOfTrashBinY
                self.circleSelectionTracker.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                self.circleSelectionTracker.circleBeingMoved.stroke = "red"
                self.components.domElements.images.trashClosedIcon.style.display = 'none'
                self.components.domElements.images.trashOpenIcon.style.display = 'block'
                self.components.shapes.noteTrashBinContainer.stroke = 'red'
            } else {
                self.components.shapes.noteTrashBinContainer.stroke = 'transparent'
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
                            self.circleSelectionTracker.circleBeingMovedNewBeatNumber = self.getIndexOfClosestSubdivisionLine(mouseX, self.sequencer.rows[rowIndex].getNumberOfSubdivisions(), self.subdivisionLinesShiftInPixelsPerRow[rowIndex])
                            self.circleSelectionTracker.circleBeingMoved.translation.x = self.getXPositionOfSubdivisionLine(self.circleSelectionTracker.circleBeingMovedNewBeatNumber, self.sequencer.rows[rowIndex].getNumberOfSubdivisions(), self.subdivisionLinesShiftInPixelsPerRow[rowIndex])
                        } else { // don't worry about quantizing, just make sure the note falls on the sequencer line
                            self.circleSelectionTracker.circleBeingMoved.translation.x = Util.confineNumberToBounds(mouseX, rowActualLeftBound, rowActualRightBound)
                            self.circleSelectionTracker.circleBeingMovedNewBeatNumber = Sequencer.NOTE_IS_NOT_QUANTIZED
                        }
                        // quantization has a more complicated effect on x position than y. y position will always just be on line, so always just put it there.
                        self.circleSelectionTracker.circleBeingMoved.translation.y = rowActualVerticalLocation;
                        self.circleSelectionTracker.circleBeingMovedNewRow = rowIndex // set 'new row' to whichever row we collided with / 'snapped' to
                        break; // we found the row that the note will be placed on, so stop iterating thru rows early
                    }
                }
            } else {
                // new secondary trash bin logic: if the note is far enough away from the sequencer, we will throw it out
                let withinHorizontalRangeToBeThrownAway = (mouseX <= sequencerLeftBoundary - self.configurations.mouseEvents.throwNoteAwaySidesPadding) || (mouseX >= sequencerRightBoundary + self.configurations.mouseEvents.throwNoteAwaySidesPadding)
                let withinVerticalRangeToBeThrownAway = (mouseY <= sequencerTopBoundary - self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding) || (mouseY >= sequencerBottomBoundary + self.configurations.mouseEvents.throwNoteAwayTopAndBottomPadding)
                if (withinVerticalRangeToBeThrownAway || withinHorizontalRangeToBeThrownAway) {
                    self.circleSelectionTracker.circleBeingMoved.stroke = "red" // make the note's outline red so it's clear it will be thrown out
                    self.circleSelectionTracker.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN
                    self.components.domElements.images.trashClosedIcon.style.display = 'none'
                    self.components.domElements.images.trashOpenIcon.style.display = 'block'
                    self.components.shapes.noteTrashBinContainer.stroke = 'red'
                }
            }
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
        self.adjustEventCoordinates(event)
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
        if (this.currentGuiMode === DrumMachineGui.MOVE_NOTES_MODE) {
            self.moveNotesModeMouseUpEventHandler(self, event);
        } else if (this.currentGuiMode === DrumMachineGui.CHANGE_NOTE_VOLUMES_MODE) {
            self.changeNoteVolumesModeMouseUpEventHandler(self, event);
        }
    }

    changeNoteVolumesModeMouseUpEventHandler(self, event) {
        // start putting together basic logic for clicking notes in 'edit-volumes' mode. this will evenetually iterate
        // through a list of a few predetermined voluesm, such as 25%, 50%, 75%, and 100%, or something like that.
        // eventually this logic will probably be moved into a 'click' handler rather than mouseup,
        // because click-dragging in edit-volumes mode will have its own different behavior: fine-tuning volume of the selected note.
        // this logic also doesn't visually change anything currently, since note radius is currently reset during each sequencer update
        // based on the position of the time tracking lines. that logic will eventually need to be changed as well.
        if (self.circleSelectionTracker.circleBeingMoved !== null) {
            self.adjustEventCoordinates(event);
            let mouseX = event.pageX;
            let mouseY = event.pageY;
            let mouseHasMoved = (mouseX !== this.circleSelectionTracker.firstClickPosition.x || mouseY !== this.circleSelectionTracker.firstClickPosition.y)
            if (!mouseHasMoved) { // if the mouse _has_ moved, volume was updated in the mouse move event, since this was a click-drag. so no need to make any other volume change.
                // if the mouse _hasn't_ moved, this mouseup is for a click, not a click-drag. so we will flip to the next volume in our
                // list of volume presets (that will be either the next highest one, or the lowest one if we got to the end of the list).
                let list = [4, 6, 8, 10, 12]; // list of possible numbers, in ascending order // self.configurations.notes.volumePresets
                let originalNumber = self.circleSelectionTracker.circleBeingMoved.radius;
                // if current value is greater than or equal to the largest option, we want to set new number to the smallest option.
                let newNumber = list[0]; // so start with the smallest number in the list as a default new value, which will only be replaced if the original value isn't less than any number in the list
                for (let i = 0; i < list.length; i++) { // determine which option is the next highest above the original value.
                    if (originalNumber >= list[i]) { // if the original number is larger than or equal to the current list item, we can move on to checking the next item
                        continue;
                    } else {
                        // if the original number is smaller than the current item, we should set the new number to this item. 
                        // since the list is sorted, we know this is the first number in the list larger than the original number.
                        newNumber = list[i];
                        break;
                    }
                }
                // set the note being changed to have the right new radius on the GUI.
                self.circleSelectionTracker.circleBeingMoved.radius = newNumber;
                self.circleSelectionTracker.circleBeingMoved.guiData.radiusWhenUnplayed = self.circleSelectionTracker.circleBeingMoved.radius;
                // convert the circle radius into a proportionate note volume.
                let newVolume = this.calculateVolumeForCircleRadius(self.circleSelectionTracker.circleBeingMoved.radius);
                if (this.circleSelectionTracker.circleBeingMovedOldRow < 0) { // the note we are changing the volume for is in the note bank.
                    // todo: eventually, maybe changing the volume of any note in the note bank should change the volume of all notes
                    // in the note bank, such that you can adjust the default volume of all new notes that will be pulled from the note bank.
                    self.noteBankNoteVolumesTracker[self.circleSelectionTracker.circleBeingMoved.guiData.sampleName].volume = newVolume;
                    self.circleSelectionTracker.circleBeingMoved.guiData.volume = newVolume;
                    self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity = this.convertWebAudioVolumeIntoMidiVelocity(newVolume)
                } else { // the note we are changing the volume for is on an actual sequencer row (i.e. it's not in the note bank).
                    self.circleSelectionTracker.circleBeingMoved.guiData.volume = newVolume;
                    self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity = this.convertWebAudioVolumeIntoMidiVelocity(newVolume)
                    // replace the node in the sequencer data structure with an identical note that has the new volume we have set the note to.
                    // open question: should we wait until mouse up to actually update the sequencer data structure instead of doing it on mouse move?
                    let node = self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedOldRow].removeNode(self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                    node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity;
                    self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedNewRow].insertNode(node, self.circleSelectionTracker.circleBeingMoved.guiData.label)
                    self.saveCurrentSequencerStateToUrlHash();
                }
            } else {
                self.saveCurrentSequencerStateToUrlHash();
            }
            // in 'change note volumes' mode, notes won't play their sound on 'mouse down' -- instead, they will play it on 'mouse up', so that we can hear the end result of our volume adjustment.
            this.sequencer.playDrumSampleNow(this.circleSelectionTracker.circleBeingMoved.guiData.sampleName, this.circleSelectionTracker.circleBeingMoved.guiData.volume, this.circleSelectionTracker.circleBeingMoved.guiData.midiNote, this.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity)
            // reset circle selection variables
            self.circleSelectionTracker.circleBeingMoved = null
            self.setNoteTrashBinVisibility(false)
        }
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

    rowVolumeAdjustmentWindowMouseUpHandler(self, event) {
        self.rowVolumeAdjustmentTracker.selectedRowIndex = null
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    moveNotesModeMouseUpEventHandler(self, event) {
        // handle letting go of notes. lifting your mouse anywhere means you're no longer click-dragging
        if (self.circleSelectionTracker.circleBeingMoved !== null) {
            /**
             * this is the workflow for determining where to put a circle that we were click-dragging once we release the mouse.
             * how this workflow works (todo: double check that this is all correct):
             * - in the circle.mousedown event, we: 
             *   - note down initial information about circle starting state before being moved
             * - in the window.mousemove event, we:
             *   - check for circle collision with the trash bin. if colliding, cricle's new row is -3.
             *   - check for collision with a sequencer row. if colliding, new row is >= 0 (specifically, the index of the sequencer row it's colliding with).
             *   - if colliding with nothing, new row is -1.
             * - in this window.mouseup event, how we handle states, based on the values we previously set in the window.mousemove event:
             *   - if the note isn't colliding with a sequencer row or the trash bin, put it back wherever it came from, with no change.
             *   - if the note is on a row, remove it from wherever it came from, and add it wherever it was placed (even if new and old row are the same, 
             *     in order to allow for a simple way to move a note to a different place on the same row)
             *   - if the note is in the trash bin, throw it away, unless it came from the note bank, in which case we just but it back onto the note bank 
             *     (i.e. put it back where it came from).
             *   - to do all of this, we will (in some cases) manually change the values of some of these variables around based on what combination of 
             *     values we have stored, then make changes to the state of the sequencer using the following set of rules:
             *     - how to handle different 'old row' values:
             *       - if old row is >= 0, remove the note from its old row
             *       - if old row is < 0, do NOT remove the note from its old row. 
             *     - how to handle different 'new row' values:
             *       - if new row is >= 0, place the note into its new row
             *       - if new row < 0, do NOT place the note into a new row
             *     - this means: 
             *       - old row >= 0, new row < 0: is a delete operation. delete a note from its old row, without adding it back anywhere.
             *       - old row >= 0, new row >= 0: is a move-note operation. move note from one row to another or to a new place in the same row.
             *       - old row < 0, new row < 0: means a note was removed from the note bank but didn't end up on a row. there will be no change.
             *       - old row < 0, new row >= 0: takes a note from the note bank and adds it to a new row, without removing it from an old row
             *         (since there's no real reason to actually remove anything when "removing" a note from the note bank. instead we just 
             *         create a new node for the sequencer's note list, and place that onto the row it's being added to).
             */
            self.circleSelectionTracker.circleBeingMoved.stroke = "transparent"
            // note down starting state, current state.
            let circleNewXPosition = self.circleSelectionTracker.circleBeingMovedStartingPosition.x // note, circle starting position was recorded when we frist clicked the circle.
            let circleNewYPosition = self.circleSelectionTracker.circleBeingMovedStartingPosition.y // if the circle is not colliding with a row etc., it will be put back to its old place, so start with the 'old place' values.
            let circleNewBeatNumber = self.circleSelectionTracker.circleBeingMovedOldBeatNumber
            self.adjustEventCoordinates(event)
            let mouseX = event.pageX
            let mouseY = event.pageY
            // check for collisions with things (sequencer rows, the trash bin, etc.)and make adjustments accordingly, so that everything will be handled as explained in the block comment above
            if (self.circleSelectionTracker.circleBeingMovedNewRow >= 0) { // this means the note is being put onto a new sequencer row
                circleNewXPosition = self.circleSelectionTracker.circleBeingMoved.translation.x // the note should have already been 'snapped' to its new row in the 'mousemove' event, so just commit to that new location
                circleNewYPosition = self.circleSelectionTracker.circleBeingMoved.translation.y
                circleNewBeatNumber = self.circleSelectionTracker.circleBeingMovedNewBeatNumber
            } else if (self.circleSelectionTracker.circleBeingMovedNewRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOT_IN_ANY_ROW) { // if the note isn't being put onto any row, just put it back wherever it came from
                circleNewXPosition = self.circleSelectionTracker.circleBeingMovedStartingPosition.x
                circleNewYPosition = self.circleSelectionTracker.circleBeingMovedStartingPosition.y
                self.circleSelectionTracker.circleBeingMovedNewRow = self.circleSelectionTracker.circleBeingMovedOldRow // replace the 'has no row' constant value with the old row number that this was taken from (i.e. just put it back where it came from!)
                circleNewBeatNumber = self.circleSelectionTracker.circleBeingMovedOldBeatNumber
            } else if (self.circleSelectionTracker.circleBeingMovedNewRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_TRASH_BIN) { // check if the note is being placed in the trash bin. if so, delete the circle and its associated node if there is one
                if (self.circleSelectionTracker.circleBeingMovedOldRow === DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK) { // if the note being thrown away came from the note bank, just put it back in the note bank.
                    self.circleSelectionTracker.circleBeingMovedNewRow = DrumMachineGui.NOTE_ROW_NUMBER_FOR_NOTE_BANK
                } else { // only bother throwing away things that came from a row (throwing away note bank notes is pointless)
                    self.removeCircleFromDisplay(self.circleSelectionTracker.circleBeingMoved.guiData.label) // remove the circle from the list of all drawn circles and from the two.js canvas
                }
            }
            // we are done checking for collisions with things and updating 'old row' and 'new row' values, so now move on to updating the sequencer
            self.circleSelectionTracker.circleBeingMoved.translation.x = circleNewXPosition
            self.circleSelectionTracker.circleBeingMoved.translation.y = circleNewYPosition
            self.circleSelectionTracker.circleBeingMoved.guiData.row = self.circleSelectionTracker.circleBeingMovedNewRow
            let node = null
            // remove the moved note from its old sequencer row. todo: consider changing this logic to just update node's priority if it isn't switching rows.)
            if (self.circleSelectionTracker.circleBeingMovedOldRow >= 0) { // -2 is the 'row' given to notes that are in the note bank. if old row is < 0, we don't need to remove it from any sequencer row.
                node = self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedOldRow].removeNode(self.circleSelectionTracker.circleBeingMoved.guiData.label)
                self.refreshNoteDependentButtonsForRow(self.circleSelectionTracker.circleBeingMovedOldRow) // hide any buttons that should no longer be shown for the row
            }
            // add the moved note to its new sequencer row.
            if (self.circleSelectionTracker.circleBeingMovedNewRow >= 0) {
                if (node === null) { // this should just mean the circle was pulled from the note bank, so we need to create a node for it
                    if (self.circleSelectionTracker.circleBeingMovedOldRow >= 0) { // should be an unreachable case, just checking for safety
                        throw "unexpected case: node was null but 'circleBeingMovedOldRow' was not < 0. circleBeingMovedOldRow: " + self.circleSelectionTracker.circleBeingMovedOldRow + ". node: " + node + "."
                    }
                    // create a new node for the sample that this note bank circle was for. note bank circles have a sample in their GUI data, 
                    // but no real node that can be added to the drum sequencer's data structure, so we need to create one.
                    node = self.sampleBankNodeGenerator.createNewNodeForSample(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName)
                    self.circleSelectionTracker.circleBeingMoved.guiData.label = node.label // the newly generated node will also have a real generated ID (label), use that
                    self.drawNoteBankCircleForSample(self.circleSelectionTracker.circleBeingMoved.guiData.sampleName) // if the note was taken from the sound bank, refill the sound bank
                }
                // convert the note's new y position into a sequencer timestamp, and set the node's 'priority' to its new timestamp
                let newNodeTimestampMillis = self.sequencer.loopLengthInMillis * ((circleNewXPosition - self.configurations.sequencer.left) / self.configurations.sequencer.width)
                node.priority = newNodeTimestampMillis
                // add the moved note to its new sequencer row
                self.sequencer.rows[self.circleSelectionTracker.circleBeingMovedNewRow].insertNode(node, self.circleSelectionTracker.circleBeingMoved.guiData.label)
                node.data.lastScheduledOnIteration = Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED // mark note as 'not played yet on current iteration'
                node.data.beat = circleNewBeatNumber
                node.data.volume = self.circleSelectionTracker.circleBeingMoved.guiData.volume;
                node.data.midiVelocity = self.circleSelectionTracker.circleBeingMoved.guiData.midiVelocity;
                node.data.midiNote = self.circleSelectionTracker.circleBeingMoved.guiData.midiNote;
                self.circleSelectionTracker.circleBeingMoved.guiData.beat = circleNewBeatNumber
                self.refreshNoteDependentButtonsForRow(self.circleSelectionTracker.circleBeingMovedNewRow) // show any buttons that should now be shown for the row
            }
            self.saveCurrentSequencerStateToUrlHash();
        }
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
        self.rowSelectionTracker.selectedRowIndex = null
        self.redrawSequencer();
        self.saveCurrentSequencerStateToUrlHash();
    }

    shiftToolMouseUpEventHandler(self, event) {
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
        // restart
        this.components.domElements.images.restartIcon.style.width = "" + this.configurations.restartSequencerButton.icon.width + "px"
        this.components.domElements.images.restartIcon.style.height = "" + this.configurations.restartSequencerButton.icon.height + "px"
        this.components.domElements.images.restartIcon.style.left = "" + this.configurations.restartSequencerButton.left + "px"
        this.components.domElements.images.restartIcon.style.top = "" + this.configurations.restartSequencerButton.top + "px"
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
        // edit mode: move notes
        this.components.domElements.images.moveNotesModeIcon.style.width = "" + this.configurations.moveNotesModeButton.icon.width + "px"
        this.components.domElements.images.moveNotesModeIcon.style.height = "" + this.configurations.moveNotesModeButton.icon.height + "px"
        this.components.domElements.images.moveNotesModeIcon.style.left = "" + this.configurations.moveNotesModeButton.left + "px"
        this.components.domElements.images.moveNotesModeIcon.style.top = "" + this.configurations.moveNotesModeButton.top + "px"
        // edit mode: change note volumes
        this.components.domElements.images.changeVolumesModeIcon.style.width = "" + this.configurations.editVolumesModeButton.icon.width + "px"
        this.components.domElements.images.changeVolumesModeIcon.style.height = "" + this.configurations.editVolumesModeButton.icon.height + "px"
        this.components.domElements.images.changeVolumesModeIcon.style.left = "" + this.configurations.editVolumesModeButton.left + "px"
        this.components.domElements.images.changeVolumesModeIcon.style.top = "" + this.configurations.editVolumesModeButton.top + "px"
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
            if (this.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] !== null && this.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                clearRowIcon.removeEventListener('click', this.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex] = () => this.clearRowButtonClickHandler(this, rowIndex);
            clearRowIcon.addEventListener('click', this.eventHandlerFunctions["clearNotesForRowIcon" + rowIndex]);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.clearRowIcons.push(clearRowIcon)
            document.body.appendChild(clearRowIcon)
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
            // add event listeners for 'locked icon'
            if (this.eventHandlerFunctions["lockedIcon" + rowIndex] !== null && this.eventHandlerFunctions["lockedIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                lockedIcon.removeEventListener('click', this.eventHandlerFunctions["lockedIcon" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["lockedIcon" + rowIndex] = () => this.setQuantizationButtonClickHandler(this, rowIndex, false);
            lockedIcon.addEventListener('click', this.eventHandlerFunctions["lockedIcon" + rowIndex])
            // add event listeners for 'unlocked icon'
            if (this.eventHandlerFunctions["unlockedIcon" + rowIndex] !== null && this.eventHandlerFunctions["unlockedIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                unlockedIcon.removeEventListener('click', this.eventHandlerFunctions["unlockedIcon" + rowIndex])
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["unlockedIcon" + rowIndex] = () => this.setQuantizationButtonClickHandler(this, rowIndex, true);
            unlockedIcon.addEventListener('click', this.eventHandlerFunctions["unlockedIcon" + rowIndex])
            // add the icons to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.lockedIcons.push(lockedIcon)
            this.components.domElements.iconLists.unlockedIcons.push(unlockedIcon)
            document.body.appendChild(lockedIcon)
            document.body.appendChild(unlockedIcon)
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
            if (this.eventHandlerFunctions["resetSubdvisionsLinesShiftForRowIcon" + rowIndex] !== null && this.eventHandlerFunctions["resetSubdvisionsLinesShiftForRowIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                resetSubdivisionsShiftIcon.removeEventListener('click', this.eventHandlerFunctions["resetSubdvisionsLinesShiftForRowIcon" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["resetSubdvisionsLinesShiftForRowIcon" + rowIndex] = () => this.resetSubdivisionLinesShiftClickHandler(this, rowIndex);
            resetSubdivisionsShiftIcon.addEventListener('click', this.eventHandlerFunctions["resetSubdvisionsLinesShiftForRowIcon" + rowIndex]);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.resetSubdivisionLinesShiftIcons.push(resetSubdivisionsShiftIcon)
            document.body.appendChild(resetSubdivisionsShiftIcon)
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
            if (this.eventHandlerFunctions["resetReferenceLinesShiftForRowIcon" + rowIndex] !== null && this.eventHandlerFunctions["resetReferenceLinesShiftForRowIcon" + rowIndex] !== undefined) {
                // remove event listeners if they've already been added to avoid duplicates
                resetReferenceLinesShiftIcon.removeEventListener('click', this.eventHandlerFunctions["resetReferenceLinesShiftForRowIcon" + rowIndex] );
            }
            // create and add new click listeners. store a reference to the newly created click listener, so that we can remove it later if we need to
            this.eventHandlerFunctions["resetReferenceLinesShiftForRowIcon" + rowIndex] = () => this.resetReferenceLinesShiftClickHandler(this, rowIndex);
            resetReferenceLinesShiftIcon.addEventListener('click', this.eventHandlerFunctions["resetReferenceLinesShiftForRowIcon" + rowIndex]);
            // add the copy to the dom and to our list that tracks these icons
            this.components.domElements.iconLists.resetReferenceLinesShiftIcons.push(resetReferenceLinesShiftIcon)
            document.body.appendChild(resetReferenceLinesShiftIcon)
        }
        this.components.domElements.images.resetReferenceLinesShiftForRowIcon.style.display = 'none'; // hide the original image. we won't touch it so we can delete and re-add our clones as much as we want to
        // set up 'shift row' icons.
        for (let icon of this.components.domElements.iconLists.shiftRowIcons) {
            icon.remove();
        }
        this.components.domElements.iconLists.shiftRowIcons = [];
        // only redraw shift tool icons if the shift tool is active (as in, if any resources are selected for use with the shift tool)
        let shiftToolIsActivated = this.shiftToolTracker.resourcesToShift.notes || this.shiftToolTracker.resourcesToShift.referenceLines || this.shiftToolTracker.resourcesToShift.subdivisionLines
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
                    mouseenter: () => this.shiftRowMouseEnterEventHandler(this, rowIndex),
                    mouseleave: () => this.shiftRowMouseLeaveEventHandler(this, rowIndex),
                    mousedown: () => this.shiftRowMouseDownEventHandler(this, rowIndex),
                    mouseup: () => this.shiftRowMouseUpEventHandler(this, rowIndex),
                };
                shiftIcon.addEventListener('mouseenter', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseenter']);
                shiftIcon.addEventListener('mouseleave', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseleave']);
                shiftIcon.addEventListener('mousedown', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mousedown']);
                shiftIcon.addEventListener('mouseup', this.eventHandlerFunctions["shiftRowIcon" + rowIndex]['mouseup']);
                // add the icons to the dom and to our list that tracks these icons
                this.components.domElements.iconLists.shiftRowIcons.push(shiftIcon)
                document.body.appendChild(shiftIcon)
                // hide the icons for now until they have action listeners and we adjust the layout to include them, etc.
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
            document.body.appendChild(moveIcon)
            // hide the icons for now until they have action listeners and we adjust the layout to include them, etc.
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
            document.body.appendChild(changeRowVolumeIcon)
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
        }
    }

    refreshShiftDependentButtonsForRow(rowIndex){
        if (this.sequencer.rows[rowIndex].getSubdivisionLineShiftInMilliseconds() === 0) {
            // hide stuff that shouldn't be visible if the row's subdivisions aren't shifted. this includes..
            // 'reset subdivision shift for row' button shape
            // 'reset subdivision shift for row' button icon
        } else {
            // show stuff that should be visible when the row's subdivisions are shifted
            // 'reset subdivision shift for row' button shape
            // 'reset subdivision shift for row' button icon
        }
        if (this.sequencer.rows[rowIndex].getReferenceLineShiftInMilliseconds() === 0) {
            // hide stuff that shouldn't be visible if the row's reference lines aren't shifted. this includes..
            // 'reset reference lines shift for row' button shape
            // 'reset reference lines shift for row' button icon
        } else {
            // show stuff that should be visible when the row's reference lines are shifted
            // 'reset reference lines shift for row' button shape
            // 'reset reference lines shift for row' button icon
        }
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
     * Write sequencer pattern to URL hash
     */

    saveCurrentSequencerStateToUrlHash(){
        // encode sequencer pattern to json and add it to url. 
        // 'btoa(plaintext)' converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using 'atob(base64)'.
        window.location.hash = btoa(this.sequencer.serialize());
    }

    loadSequencerPatternFromBase64String(base64String) {
        this.sequencer.clear()
        // btoa(plaintext) converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using atob(base64).
        this.sequencer.deserialize(atob(base64String), this.sampleBankNodeGenerator);
        this.initializeTempoTextInputValuesAndStyles();
        this.refreshTempoMenuState();
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