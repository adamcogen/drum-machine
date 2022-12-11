/**
 * This file contains an interface for audio drivers, and implementations
 * for particular audio drivers, such as a WebAudio API audio context driver
 * and MIDI driver. This will allow us to interact with different audio libraries
 * in a uniform way.
 */

/**
 * This is an interface for audio drivers / audio contexts.
 * Subclasses can be implemented to allow for uniform interactions with multiple
 * different audio drivers (my current plan is to create a WebAudioDriver for the
 * WebAudio API, and eventually a MidiAudioDriver, which will support outputting 
 * live MIDI). This way the sequencer will be able to iterate through a list of 
 * multiple different audio drivers, and make the same method calls to each of
 * them in order to output sound in multiple ways or to multiple sources at the
 * same time. 
 */
class BaseAudioDriver {
    constructor(scheduleSoundsAheadOfTime = false) {
        this.scheduleSoundsAheadOfTime = scheduleSoundsAheadOfTime; // define the expected usage pattern for playing sounds with this audio driver.
    }

    scheduleSound(soundData, time) {
        throw "Method 'scheduleSound' from BaseAudioDriver needs to be implemented before being invoked."
    }

    playSoundNow(soundData) {
        throw "Method 'playSoundNow' from BaseAudioDriver needs to be implemented before being invoked."
    }

    getCurrentTimeInMilliseconds(){
        throw "Method 'getCurrentTimeInMilliseconds' from BaseAudioDriver needs to be implemented before being invoked."
    }

    getSchedulingTimeOffsetInMilliseconds(){
        throw "Method 'getSchedulingTimeOffsetInMilliseconds' from BaseAudioDriver needs to be implemented before being invoked."
    }
}

/**
 * Basic audio driver for Javascript WebAudio context.
 * 
 * Expected format of soundData: a JSON object
 * soundData = {
 *   file: , // a WebAudio buffer containing a sound file
 *   playbackRate: , // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed
 *   gain: , // set gain (volume). 1 is default, .1 is 10 percent
 * }
 * 
 */
class WebAudioDriver extends BaseAudioDriver {
    constructor(webAudioContext){
        super(true);
        this.webAudioContext = webAudioContext;
    }

    // schedule a sound to play at the specified time in milliseconds
    scheduleSound(soundData, time) {
        let sound = this._setUpWebAudioContextSoundBufferSource(soundData)
        /**
         * we previously multipled the WebAudio context's raw time by 1,000 to convert it from seconds to milliseconds.
         * Now we will convert the time back into seconds, which is the format that the WebAudio API is expecting.
         */
        sound.start(time / 1000);
    }

    // make a sound to play immediately
    playSoundNow(soundData) {
        let sound = this._setUpWebAudioContextSoundBufferSource(soundData)
        sound.start();
    }

    // Set up and return the WebAudio API resource necessary for playing a sound
    _setUpWebAudioContextSoundBufferSource(soundData) {
        let sound = this.webAudioContext.createBufferSource(); // creates a sound source
        sound.buffer = soundData.file; // tell the sound source which file to play
        sound.playbackRate.value = soundData.playbackRate; // 1 is default playback rate; 0.5 is half-speed; 2 is double-speed

        // set gain (volume). 1 is default, .1 is 10 percent
        let gainNode = this.webAudioContext.createGain();
        gainNode.gain.value = soundData.gain;
        gainNode.connect(this.webAudioContext.destination);
        sound.connect(gainNode); // connect the sound to the context's destination (the speakers)

        return sound
    }

    // return the current time according to the WebAudio context
    getCurrentTimeInMilliseconds() {
        /**
         * we mutliply the WebAudio context's raw time by 1,000 to convert it from seconds to milliseconds,
         * just as a matter of preference. That seems more intelligible to me than using seconds. 
         * this means that we will also need to divide any given time by 1,000 when we go to schedule it,
         * so that it is back in the format that the WebAudio API is expecting.
         */ 
        return this.webAudioContext.currentTime * 1000;
    }

    getSchedulingTimeOffsetInMilliseconds() {
        return 0; // this audio driver will act as the main timer that we use as a timing reference, so no need to include an offset.
    }
}

/**
 * Basic audio driver for Javascript WebMidi.
 * 
 * Expected format of soundData: a JSON object. Example soundData contents:
 * {
 *    note: 60, [should be 0 to 127]
 *    velocity: 100, [should be 0 to 127]
 * }
 * 
 */
class MidiAudioDriver extends BaseAudioDriver {
    // these are just constants used by the WebMidi API to represent 'note on' and 'note off' in MIDI messages, respectively
    static get NOTE_ON_DATA() { return 0x90 }
    static get NOTE_OFF_DATA() { return 0x80 }

    constructor(webMidiOutput) {
        super(true)
        this.schedulingTimeOffsetInMilliseconds = 0;
        this.midiOutput = webMidiOutput
        this.defaultNoteDuration = .1; // How long each MIDI note should play for, in milliseconds. This is short so that we can send many MIDI notes as fast as possible.
    }

    scheduleSound(soundData, time) {
        if (this.midiOutput === null){
            return; // MIDI access is requested then granted asynchronously. For now just do nothing if we don't have access yet.
        }
        let midiOnMessage = [MidiAudioDriver.NOTE_ON_DATA, soundData.note, soundData.velocity]
        let midiOffMessage = [MidiAudioDriver.NOTE_OFF_DATA, soundData.note, soundData.velocity]
        let timeWithOffset = time + this.getSchedulingTimeOffsetInMilliseconds();
        this.midiOutput.send(midiOnMessage, timeWithOffset)
        this.midiOutput.send(midiOffMessage, timeWithOffset + this.defaultNoteDuration);
    }

    playSoundNow(soundData) {
        if (this.midiOutput === null){
            return; // MIDI access is requested then granted asynchronously. For now just do nothing if we don't have access yet.
        }
        let midiOnMessage = [MidiAudioDriver.NOTE_ON_DATA, soundData.note, soundData.velocity]
        let midiOffMessage = [MidiAudioDriver.NOTE_OFF_DATA, soundData.note, soundData.velocity]
        this.midiOutput.send(midiOnMessage)
        this.midiOutput.send(midiOffMessage, this.getCurrentTimeInMilliseconds() + this.defaultNoteDuration)
    }

    getCurrentTimeInMilliseconds() {
        return window.performance.now();
    }

    setMidiOutput(webMidiOutput) {
        this.midiOutput = webMidiOutput;
    }

    getSchedulingTimeOffsetInMilliseconds(){
        return this.schedulingTimeOffsetInMilliseconds;
    }

    setSchedulingTimeOffsetInMilliseconds(schedulingTimeOffsetInMilliseconds){
        this.schedulingTimeOffsetInMilliseconds = schedulingTimeOffsetInMilliseconds;
    }
}