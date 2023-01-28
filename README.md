# Polyrhythmic Drum Machine

![Polyrhythmic Drum Machine (August 3rd, 2022)](assets/images/screenshot-1_28_2023-2-thin.png "Polyrhythmic Drum Machine (August 3rd, 2022)")

## About

This project is a client-side in-browser drum machine that supports the creation of unusual beat subdivisions and time feels.

Try it [here](https://adamcogen.github.io/drum-machine/).

### Key Features:

- Sequencer rows can be subdivided and quantized into any whole number of beats, including prime numbers 
   - Use this flexibility to program odd time signatures, complex polyrhythms, or fractional time offsets (such as pentuplet and suptuplet swing, 11s, 13s, and so on) that would be difficult or impossible to create in conventional DAWs, which often only support quantizing beats to powers of two (8th, 16th, and 32nd notes, etc.) and triplets.
- Each sequencer row's beat lines can be shifted forwards or backwards in time as much as you like, so that notes sound ahead of or behind the beat.
  - Use this to create precisely-tuned experimental time feels, swing amounts, and note timing offsets.
- Snap-to-grid (quantization) can be toggle on and off for each sequencer row
- Save and share sequencer patterns by copying the site's URL, which is automatically updated any time a change is made to the sequencer
  - Browser 'back' and 'forward' buttons can also be used as 'undo' and 'redo' buttons

### Other Nice Stuff: 

- Choose from multiple drum kits for live audio output
  - Run locally to add your own drum kits
- Live MIDI output 
  - Run locally to change MIDI note pitches by modifying source code
- Export patterns to a MIDI file
- Specify tempo as BPM (beats per minute), or as a loop length in milliseconds
  - BPM input mode also supports 'tap tempo' functionality
- Adjust the volume of each note
- Try out example patterns by loading them from a dropdown

### Work Still In Progress:

- Add more drum kits
- Add more example sequencer patterns
- Add more sounds to each drum kit
- Improve user experience for timing shift functionality

## How To Run Locally:

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

## Project Structure

* `index.html` main HTML webpage for the drum machine
* `code/` contains all JavaScript source code
  * `drum-machine.js` main source code file from which everything else is instantiated
  * `priority-linked-list.js` implementation of a special linked list data structure, created to be used as the backend datastore for sequencer rows. This file also contains unit tests for the data structure.
  * `sequencer.js` higher-level implementation of the sequencer, including the note scheduling algorithm and logic for reconfiguring the sequencer
  * `gui.js` implementation of the GUI, including all buttons, event listeners, etc.
  * `audio-drivers.js` interface and implementations of different audio drivers (WebAudio and MIDI) to standardize how the sequencer interacts with different audio output libraries
  * `lib/` contains all third-party libraries used in the project
* `assets/` contains icons, sound files, and any other assets used by the drum machine

## Acknowledgements:

 - The colorful and interactive click-and-drag user interface for placing notes was inspired by the amazing [Cync](https://github.com/tiburzi/cync) drum machine.
 - Precise audio timing was implemented by using the WebAudio API to schedule audio ahead-of-time. This was informed and inspired by the projects and articles of Chris Wilson, including: the [MIDIDrums](https://github.com/cwilso/MIDIDrums) repo, the [Web Audio Metronome](https://github.com/cwilso/metronome) repo, and especially the article [A Tale Of Two Clocks](https://www.html5rocks.com/en/tutorials/audio/scheduling/), which is specifically about scheduling precisely-timed audio using the WebAudio API.
 - A huge thank you to Jon for user testing each prototype, and for helping to brainstorm solutions to many tough GUI design problems
 - For an early (and much simpler) MIDI-only Python prototype of this drum machine, see my old repo [Python Polyrhythmic Drum Machine Proof Of Concept](https://github.com/adamcogen/drum-machine-py-poc).