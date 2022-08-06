/**
 * This file contains the main logic and function definitions for running and updating the sequencer, its on-screen display, etc.
 */

window.onload = () => {

    // initialize sound file constants
    const SOUND_FILES_PATH = './sounds/';
    const BASS_DRUM = "bass-drum";
    const HI_HAT_CLOSED = 'hi-hat-closed';
    const HI_HAT_OPEN = 'hi-hat-open';
    const SNARE = 'snare';
    const WOODBLOCK = 'woodblock';
    const TOM = 'tom'
    const CLAP = 'clap'
    const WAV_EXTENSION = '.wav';

    // initialize the list of sample names we will use. the order of this list determines the order of sounds on the sound bank
    let sampleNameList = [WOODBLOCK, HI_HAT_CLOSED, HI_HAT_OPEN, CLAP, SNARE, TOM, BASS_DRUM]

    /**
     * load sound files
     */
    let samples = {}
    samples[WOODBLOCK] = new SequencerNoteType(null, '#bd3b07')
    samples[HI_HAT_CLOSED] = new SequencerNoteType(null, '#cf6311') // or try #b58f04 , this was yellow before
    samples[HI_HAT_OPEN] = new SequencerNoteType(null, '#b8961c') // or try #bf3d5e , this was red before
    samples[CLAP] = new SequencerNoteType(null, '#689620')
    samples[SNARE] = new SequencerNoteType(null, '#0e6e21')
    samples[TOM] = new SequencerNoteType(null, '#1b617a')
    samples[BASS_DRUM] = new SequencerNoteType(null, '#5b3787')
    // load all of the drum samples
    for (let sampleName of sampleNameList) {
        loadDrumSample(SOUND_FILES_PATH, sampleName, WAV_EXTENSION)
    }

    // initialize web audio context
    _setUpAudioContextCompatabilityShim();
    let _audioContext = new AudioContext();
    let webAudioDriver = new WebAudioDriver(_audioContext);

    // wait until the first click before resuming the audio context (this is required by Chrome browser)
    window.onclick = () => {
        _audioContext.resume()
    }

    /**
     * drum machine configurations
     */
    const _LOOK_AHEAD_MILLIS = 50; // number of milliseconds to look ahead when scheduling notes to play. note bigger value means that there is a longer delay for sounds to stop after the 'pause' button is hit.
    let defaultLoopLengthInMillis = 2100; // length of the whole drum sequence (loop), in millliseconds
    // initialize sequencer object
    let sequencer = new Sequencer([webAudioDriver], 0, defaultLoopLengthInMillis, _LOOK_AHEAD_MILLIS, samples)
    
    // initialize ID generator for node / note labels, and node generator for notes taken from the sample bank.
    let idGenerator = new IdGenerator() // we will use this same ID generator everywhere we need IDs, to make sure we track which IDs have already been generated
    let _sampleBankNodeGenerator = new SampleBankNodeGenerator(idGenerator, sampleNameList) // generates a new sequencer list node whenever we pull a note off the sound bank
    let gui = new DrumMachineGui(sequencer, sampleNameList, samples, _sampleBankNodeGenerator, hideIcons=false);

    // set up a initial example drum sequence
    initializeSimpleDefaultSequencerPattern();

    // if there is a sequencer state included in the URL, load it. 
    if (window.location.hash !== "") { // window.location.hash is text in a URL after the actual address, which starts with a "#" character and can contain whatever text we want.
        // btoa(plaintext) converts a plaintext string to a base64 string, so that it is URL-safe. we can decode the base64 string back to plaintext later using atob(base64).
        json = atob(window.location.hash.substring(1)) // the url hash will start with a '#' character, so remove that before decoding it
        sequencer.deserialize(json, _sampleBankNodeGenerator)
    }

    gui.redrawSequencer();

    // start main recursive update loop, where all drum machine state updates will happen
    _setUpAnimationCompatabilityShim();
    loop()

    // this method is the 'recursive update loop` that will keep updating the page. after first invocation, this method basically calls itself recursively forever.
    function loop() {
        sequencer.update() // update timekeeping variables and schedule any upcoming notes, using the sequencer
        gui.update() // update the GUI display
        requestCompatibleAnimationFrame(loop); // call animation frame update with this 'loop' method again
    }

    function initializeSimpleDefaultSequencerPattern(){
        sequencer.setNumberOfRows(0)
        gui.addEmptySequencerRow();
        sequencer.rows[0].setNumberOfSubdivisions(16)
        sequencer.rows[0].setNumberOfReferenceLines(4)
        sequencer.rows[0].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[1].setNumberOfSubdivisions(8)
        sequencer.rows[1].setNumberOfReferenceLines(4)
        sequencer.rows[1].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[2].setNumberOfSubdivisions(8)
        sequencer.rows[2].setNumberOfReferenceLines(4)
        sequencer.rows[2].setQuantization(true)
        gui.addEmptySequencerRow();
        sequencer.rows[3].setNumberOfSubdivisions(8)
        sequencer.rows[3].setNumberOfReferenceLines(4)
        sequencer.rows[3].setQuantization(false)
        gui.addEmptySequencerRow();
        sequencer.rows[4].setNumberOfSubdivisions(4)
        sequencer.rows[4].setNumberOfReferenceLines(4)
        sequencer.rows[4].setQuantization(true)
    }

    // set up a default initial drum sequence with some notes in it.
    function initializeComplexDefaultSequencerPattern(){
        sequencer.setNumberOfRows(6)
        sequencer.rows[0].setNumberOfSubdivisions(8)
        sequencer.rows[0].setNumberOfReferenceLines(4)
        sequencer.rows[0].setQuantization(true)
        sequencer.rows[1].setNumberOfSubdivisions(4)
        sequencer.rows[1].setQuantization(true)
        sequencer.rows[2].setNumberOfSubdivisions(2)
        sequencer.rows[3].setNumberOfSubdivisions(0)
        sequencer.rows[4].setNumberOfSubdivisions(5)
        sequencer.rows[4].setQuantization(true)
        sequencer.rows[5].setNumberOfReferenceLines(8)
        sequencer.rows[5].setNumberOfSubdivisions(7)
        sequencer.rows[5].setQuantization(true)
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), 0, 
        {
            lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: HI_HAT_CLOSED,
            beat: 0,
        }
        ))
        sequencer.rows[0].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 8) * 3, 
        {
            lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
            sampleName: WOODBLOCK,
            beat: 3,
        }
        ))
        sequencer.rows[1].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 4) * 1, 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: HI_HAT_OPEN,
                beat: 1,
            }
        ))
        sequencer.rows[2].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), ((sequencer.loopLengthInMillis / 4) * 2), 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: SNARE,
                beat: Sequencer.NOTE_IS_NOT_QUANTIZED,
            }
        ))
        sequencer.rows[3].insertNode(new PriorityLinkedListNode(idGenerator.getNextId(), (sequencer.loopLengthInMillis / 4) * 3, 
            {
                lastScheduledOnIteration: Sequencer.NOTE_HAS_NEVER_BEEN_PLAYED,
                sampleName: BASS_DRUM,
                beat: Sequencer.NOTE_IS_NOT_QUANTIZED,
            }
        ))
    }

    // making a cleaner (less redundant) way to call 'loadSample()', which matches what we need for the drum sequencer.
    // the simplifying assumption here is that "sampleName" will always match the name of the file (without its file extension).
    function loadDrumSample(directoryPath, sampleName, fileExtension) {
        loadAudioSample(sampleName, directoryPath + sampleName + fileExtension)
    }

    // load an audio sample from a file. to load from a local file, this script needs to be running on a server.
    function loadAudioSample(sampleName, url) {
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
      
        // Decode asynchronously
        request.onload = function() {
            _audioContext.decodeAudioData(request.response, function(buffer) {
            samples[sampleName].file = buffer; // once we get a response, write the returned data to the corresponding attribute in our 'samples' object
          }, (error) => {
              console.log("Error caught when attempting to load file with URL: '" + url + "'. Error: '" + error + "'.")
          });
        }
        request.send();
    }

    /**
     * Set up shim for AudioContext, for better compatability across different browsers. The contents of 
     * this method is slightly adjusted from one in the 'Web Audio Metronome' repo by cwilso on GitHub:
     * https://github.com/cwilso/metronome/blob/master/js/metronome.js#L23-L33
     */
    function _setUpAudioContextCompatabilityShim() {
        window.AudioContext = window.AudioContext || window.webkitAudioContext // shim the audio context
    }

    /**
     * Set up shim for requestAnimationFrame(), for better compatability across different browsers. The contents 
     * of this method are slightly adjusted from one in the 'Web Audio Metronome' repo by cwilso on GitHub:
     * https://github.com/cwilso/metronome/blob/master/js/metronome.js#L23-L33
     */
    function _setUpAnimationCompatabilityShim() {
        // Shim the requestAnimationFrame API, with a setTimeout fallback
        window.requestCompatibleAnimationFrame = (function(){
            return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(callback){
                window.setTimeout(callback, 1000 / 60);
            };
        })();
    }
}