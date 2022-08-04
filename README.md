### About

This project is a work in progress, I am still currently working towards the minimum viable product.

This drum machine will be an improved version of my old project [Polyrhythmic Drum Machine](https://github.com/adamcogen/drum-machine-py-poc), rewritten from scratch. Summary of the old project:

> Most drum machines I've encountered only let you quantize beats to powers of two (quarter note, 8th note, 16th, 32nd, etc.) and triplets. This drum machine lets you quantize beats to any integer subdivision you want (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, ...)

![Polyrhythmic Drum Machine (August 3rd, 2022)](images/screenshot-0.png "Polyrhythmic Drum Machine (August 3rd, 2022)")

 Changes to the old project's functionality that will be included in this new version:

 - Switched from using Python to JavaScript, for better compatability (drum machine now runs client-side in browser, no command line or installations needed), and now supports live audio (this version isn't MIDI-only) and fast GUI updates
 - Interactive click-and-drag user interface, inspired by the amazing [Cync](https://github.com/tiburzi/cync), for editing drum sequences
 - Precise audio timing, by using the WebAudio API to schedule audio ahead-of-time, inspired and informed by [MIDIDrums](https://github.com/cwilso/MIDIDrums), [Web Audio Metronome](https://github.com/cwilso/metronome), and by a fantastic [article](https://www.html5rocks.com/en/tutorials/audio/scheduling/) about scheduling precisely-timed audio with the WebAudio API, written by the creator of MIDIDrums and Web Audio Metronome, Chris Wilson
 - New drum sequencer features, including the option to turn quantization on or off for each row of the sequencer, and some other new features.
 - I'm currently prioritizing live sound instead of MIDI output (unlike the previous iteration of this drum machine), but tentatively planning to eventually include MIDI support as well.

### Run locally:

Local HTTP server is needed to avoid Cross Origin Request issues when loading drum samples (at least in Chrome browser).

For Mac, run one of the .sh files included in this repo to start the HTTP server:

Python 2:
```
sh server.python2.sh
```

Python 3:
```
sh server.python3.sh
```

then in a browser go to:

```
http://localhost:8000/
```

and replace 8000 with whatever port number the server says it's running on.

For Windows, you should be able to just run the commands that are in these .sh files from the command line to start the HTTP server.

### Project Structure

* `index.html` main HTML webpage for the drum machine
* `code/` contains all JavaScript source code
  * `drum-machine.js` main source code file from which everything else is instantiated
  * `lib/` contains all third-party libraries used in the project
* `assets/` contains icon set created for the drum machine GUI
* `sounds/` contains sound files used by the drum machine