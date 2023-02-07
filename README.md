![Polyrhythmic Drum Machine](assets/images/sequencer-rows-2_6_2023.png "Polyrhythmic Drum Machine")

A drum machine for creating unique time feels and polyrhythms. Try it [here](https://adamcogen.github.io/drum-machine/).

Tested in Chrome browser on Mac. Mobile not currently supported.

### About

Most drum machines only let you create rhythms that precisely divide each beat or measure into factors of 2 and 3. This drum machine removes that limitation by allowing for any number of divisions, such as prime and large numbers.

Most drum machines only give two options for where beats can be placed: precisely "on time" (at evenly divided grid lines starting at the beginning of the measure), or completely freely (with no grid lines at all). This drum machine allows for both of these, but it also gives you an in-between option: it allows you to shift the timing of all of a measure's grid lines, so that they all sound as "ahead of" or "behind" the beat as you want them to, while still remaining evenly spaced.

Combining both of these features allows you to easily create unique drum grooves that are difficult or impossible to emulate in a convential sequencer or DAW.

### Key Features:

- Create complex polyrhythms, odd time signatures, and unusual note divisions by setting any whole number of beats for each note lane
- Create precisely-tuned experimental time feels and swing amounts by shifting each note lane's grid lines forwards or backwards in time as much as you like, so that notes sound ahead of or behind the beat, while remaining evenly spaced.
- Toggle snap-to-grid (quantization) on and off for each note lane
- Runs in your internet browser
  - Save and share sequencer patterns by copying the site's URL, which updates any time you make a change to the sequencer
  - Use browser 'back' and 'forward' buttons to 'undo' and 'redo' any changes you make

### Other Nice Stuff: 

- Choose from a number of drum kits for live audio output
  - Run locally to add your own drum kits
- Supports live MIDI output to any DAW or MIDI device, as well as exporting sequencer patterns to MIDI files
  - Run locally to change MIDI note pitches by modifying source code
- Specify tempo as BPM (beats per minute), or as a loop length in milliseconds
  - BPM input mode supports 'tap tempo' functionality
  - Millisecond loop length is useful for making rhythmic transcriptions from an existing sound file
- Adjust the volume of each note. The louder the note, the larger its circle will be on-screen.
- Listen to example patterns by loading them from the 'examples' dropdown.
- All interactive GUI elements include help text, which appears when you mouse over them, in the bar at the bottom of the screen

## How To Run Locally

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
  * `gui-configurations.js` definitions of constants used to define GUI display and behavior, formatted as a JSON object
  * `lib/` contains all third-party libraries used in the project
* `assets/` contains icons, sound files, and any other assets used by the drum machine

## Acknowledgements

 - The colorful and interactive click-and-drag user interface for placing notes was inspired by the amazing [Cync](https://github.com/tiburzi/cync) drum machine.
 - Precise audio timing was implemented by using the WebAudio API to schedule audio ahead-of-time. This was informed and inspired by the projects and articles of Chris Wilson, including: the [MIDIDrums](https://github.com/cwilso/MIDIDrums) repo, the [Web Audio Metronome](https://github.com/cwilso/metronome) repo, and especially the article [A Tale Of Two Clocks](https://www.html5rocks.com/en/tutorials/audio/scheduling/), which is specifically about scheduling precisely-timed audio using the WebAudio API.
 - A huge thank you to Jon for user testing each prototype, and for helping to brainstorm solutions to many tough GUI design problems
 - For an early (and much simpler) MIDI-only Python prototype of this drum machine, see my old repo [Python Polyrhythmic Drum Machine Proof Of Concept](https://github.com/adamcogen/drum-machine-py-poc).