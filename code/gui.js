/**
 * This will be a class for storing, managing, and updating
 * all GUI components and their event listeners, etc.
 * 
 * For now this class will just initialize the GUI configurations object.
 */
class DrumMachineGui {
    constructor(sequencer, two) {
        this.sequencer = sequencer
        this.two = two
        this.configurations = getGuiConfigurations()
        this.components = this.initializeGuiComponents();
        this.initializeComponentEventListeners();
        this.initializeWindowEventListeners();
    }

    initializeGuiComponents() {
        let components = {};
        components.sequencerRowSelectionRectangles = this.initializeSequencerRowSelectionRectangles();
        return components;
    }

    initializeComponentEventListeners() {
        // do nothing yet
    }

    initializeWindowEventListeners() {
        // do nothing yet
    }

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

    initializeRectangleShape(top, left, height, width, radius=4) {
        // new button rectangle: make a rectangle with rounded corners
        button = this.two.makeRoundedRectangle(left + (width / 2), top + (height / 2), width, height, radius)
        button.linewidth = this.configurations.sequencer.lineWidth
        button.stroke = this.configurations.sequencer.color
        button.fill = 'transparent'
        return button
    }

}