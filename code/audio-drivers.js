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
 * 
 * A note about getSchedulingTimeOffsetInMilliseconds():
 * It is likely that each different Audio Drivers and different audio output systems
 * in general, such as WebAudio versus WebMIDI versus some other library or system,
 * will have their own system timers, which may get started and paused at different
 * times while the drum machine is running. Currently the drum machine primarily
 * relies on one timer in particular -- the WebAudio API's timer -- when it is updating
 * its GUI or scheduling notes. All notes that get scheduled use a timestamp based on the
 * WebAudio API's timer. This made sense to do because the WebAudio API is the first driver
 * that was added, and I consider it the primary audio driver for the drum machine, and likely
 * the one that will be used most often. It also relies on the system's hardware audio timer,
 * which is very accurate, so it is a good timer to rely on. But since we are using that one
 * system timer and no others when scheduling audio, we need a way to make sure that timestamps
 * from the WebAudio timer are correctly synchronized with any other audio drivers' system timers.
 * To do this, I have added a way to configure a time offset when scheduling notes, based on how
 * out-of-sync each audio system's timer is from the primary (in this case, the WebAudio) timer.
 * This method should return a time offset in milliseconds, specifying how off-set the timer that 
 * is being used to schedule all audio events is from the primary timer being used to create the 
 * scheduling timestamps. See the MidiAudioDriver for an example usage. 
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

    /**
     * A note about getSchedulingTimeOffsetInMilliseconds():
     * It is likely that each different Audio Driver, and different audio output systems
     * in general, such as WebAudio versus WebMIDI versus some other library or system,
     * will have their own system timers, which may get started and paused at different
     * times while the drum machine is running. Currently the drum machine primarily
     * relies on one timer in particular -- the WebAudio API's timer -- when it is updating
     * its GUI or scheduling notes. All notes that get scheduled use a timestamp based on the
     * WebAudio API's timer. This made sense to do because the WebAudio API is the first driver
     * that was added, and I consider it the primary audio driver for the drum machine, and likely
     * the one that will be used most often. The WebAudio API relies on the system's hardware audio 
     * timer, which is very accurate, so it is a good timer to rely on. But since we are looking at that 
     * one system's timer and no others when scheduling audio, we need a way to make sure that timestamps
     * from the WebAudio timer are correctly synchronized with any other audio drivers' system timers.
     * To do this, we will configure a time offset in each audio driver, based on how out-of-sync that 
     * audio driver's internal timer is from the primary (in this case, the WebAudio) driver's timer.
     * This method should return a time offset in milliseconds, specifying how off-set the timer that 
     * is being used to schedule all audio events is from the primary timer being used to create the 
     * scheduling timestamps. See the MidiAudioDriver for an example usage. See wherever the
     * MidiAudioDriver is instantiated for an example of how its timer offset is calculated and set.
     * 
     * The primary audio driver (in this case, the WebAudioDriver) has its scheduling time offset 
     * hard-coded to 0, since it is the timer we are using as a reference, and it obviously isn't
     * possible for it to be be out-of-sync with itself.
     */
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
        this.muted = false;
        this.useCompressor = false;
        this.compressor = this.initializeCompressor();
    }

    // schedule a sound to play at the specified time in milliseconds
    scheduleSound(soundData, time) {
        if (this.muted) {
            return;
        }
        let sound = this._setUpWebAudioContextSoundBufferSource(soundData)
        /**
         * we previously multipled the WebAudio context's raw time by 1,000 to convert it from seconds to milliseconds.
         * Now we will convert the time back into seconds, which is the format that the WebAudio API is expecting.
         */
        sound.start(time / 1000);
    }

    // make a sound to play immediately
    playSoundNow(soundData) {
        if (this.muted) {
            return;
        }
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
        // check whether we're supposed to use a compressor, and make sure it exists in the browser
        if (this.useCompressor && DynamicsCompressorNode) {
            // connect output with compressor
            // note: if we make the compressor toggle-able, we will need to add a way to disconnect 
            // the previous output configuration if it had already been set up without a compressor.
            gainNode.connect(this.compressor);
            this.compressor.connect(this.webAudioContext.destination)
        } else {
            // connect output
            // note: if we make the compressor toggle-able, we will need to add a way to disconnect 
            // the compressor if it had previously been set up.
            gainNode.connect(this.webAudioContext.destination)
            sound.connect(gainNode); // connect the sound to the context's destination (the speakers)
        }
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

    initializeCompressor() {
        // the settings for this compressor were chosen mostly based on trial and error
        let compressor = new DynamicsCompressorNode(this.webAudioContext, {
            threshold: -10,
            knee: 10,
            ratio: 10,
            attack: 0,
            release: .1,
        })
        return compressor;
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
    // How long each MIDI note should play for, in milliseconds. This is short so that we can send many MIDI notes in a row as
    // fast as possible without overlap (since as far as I know the same note can't be played more than once at the same time).
    static get NOTE_DURATION() { return .2 }

    constructor(webMidiOutput) {
        super(true)
        this.schedulingTimeOffsetInMilliseconds = 0;
        this.midiOutput = webMidiOutput
    }

    scheduleSound(soundData, time) {
        if (this.midiOutput === null){
            return; // MIDI access is requested then granted asynchronously. For now just do nothing if we don't have access yet.
        }
        let midiOnMessage = [MidiAudioDriver.NOTE_ON_DATA, soundData.note, soundData.velocity]
        let midiOffMessage = [MidiAudioDriver.NOTE_OFF_DATA, soundData.note, soundData.velocity]
        let timeWithOffset = time + this.getSchedulingTimeOffsetInMilliseconds();
        this.midiOutput.send(midiOnMessage, timeWithOffset)
        this.midiOutput.send(midiOffMessage, timeWithOffset + MidiAudioDriver.NOTE_DURATION);
    }

    playSoundNow(soundData) {
        if (this.midiOutput === null){
            return; // MIDI access is requested then granted asynchronously. For now just do nothing if we don't have access yet.
        }
        let midiOnMessage = [MidiAudioDriver.NOTE_ON_DATA, soundData.note, soundData.velocity]
        let midiOffMessage = [MidiAudioDriver.NOTE_OFF_DATA, soundData.note, soundData.velocity]
        this.midiOutput.send(midiOnMessage)
        this.midiOutput.send(midiOffMessage, this.getCurrentTimeInMilliseconds() + MidiAudioDriver.NOTE_DURATION)
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