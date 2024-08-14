/**
 * This file contains shared logic that is used throughout the drum machine and may not belong to a single particular other class or file.
 * I am implementing this as a class with static methods instead of a file with just a bunch of globally scoped functions, because I think
 * including a class name when invoking these functions will make it easier to see right away where they are implemented.
 */

class Util {
    // basic 'assert equals' method, which throws the given message if the two given values arent equal (===) to each other
    static assertEquals(expected, actual, message) {
        if (expected !== actual){
            throw "assertion failed: '" + message + "'. expected: '" + expected + "'; actual '" + actual + "'"
        }
    }

    // given a number and an upper and lower bound, confine the number to be between the bounds.
    // if the number if below the lower bound, return the lower bound.
    // if it is above the upper bound, return the upper bound.
    // if it is between the bounds, return the number unchanged.
    static confineNumberToBounds(number, lowerBound, upperBound) {
        if (number < lowerBound) {
            return lowerBound
        } else if (number > upperBound) {
            return upperBound
        } else {
            return number; // or, in fewer lines, 'return Math.max(lowerBound, Math.min(number, upperBound))' :)
        }
    }

    // quick happy-path unit test for confineNumberToBounds()
    static testConfineNumberToBounds() {
        this.assertEquals(5, this.confineNumberToBounds(4, 5, 10), "number below lower bound")
        this.assertEquals(5, this.confineNumberToBounds(5, 5, 10), "number same as lower bound")
        this.assertEquals(6, this.confineNumberToBounds(6, 5, 10), "number between the bounds")
        this.assertEquals(10, this.confineNumberToBounds(10, 5, 10), "number same as upper bound")
        this.assertEquals(10, this.confineNumberToBounds(11, 5, 10), "number above upper bound")
    }

    /**
     * Perform linear conversion on a number.
     * Convert a number within a range to the proportional number within a different range.
     * Preconditions:
     *  - no negative numbers allowed (they're just untested)
     *  - inputs are not validated yet, it is assumed that the original number and both ranges make sense
     */
    static calculateLinearConversion(originalNumber, originalMin, originalMax, newMin, newMax) {
        // proposed procedure:
        // - convert the old range to 0 -> something
        //   3 in [1 to 5] becomes 2 in [0 to 4]
        //   (by subtracting old min from everything old)
        let originalNumberWithZeroMin = originalNumber - originalMin;
        let originalMaxWithZeroMin = originalMax - originalMin;
        // - convert the new range to 0 -> something
        //   [20 to 60] becomes [0 to 40]
        //   (by subtracting new min from everything new)
        let newMaxWithZeroMin = newMax - newMin;
        // - convert the old range to have the new max
        //   2 in [0 to 4] becomes 20 in [0 to 40]
        //   (by multiplying everything old by (new max divided by old max))
        let newNumberWithZeroMin = originalNumberWithZeroMin * (newMaxWithZeroMin / originalMaxWithZeroMin)
        // - convert that to have the new min
        //   20 in [0 to 40] becomes 40 in [0 to 60]
        //   (by adding new min to everything old)
        let newNumber = newNumberWithZeroMin + newMin;
        return newNumber;
    }

    static testCalculateLinearConversion() {
        this.assertEquals(25, this.calculateLinearConversion(5, 0, 10, 0, 50), "Calculate a linear conversion for two ranges with the same (zero) min");
        this.assertEquals(6, this.calculateLinearConversion(5, 1, 9, 1, 11), "Calculate a linear conversion for two ranges with the same (non-zero) min");
        this.assertEquals(4, this.calculateLinearConversion(3, 1, 5, 2, 6), "Calculate a linear conversion for two ranges with a different min, but the same size");
        this.assertEquals(40, this.calculateLinearConversion(3, 1, 5, 20, 60), "Calculate a linear conversion for two ranges with a different min and a different size, scaling up");
        this.assertEquals(3, this.calculateLinearConversion(40, 20, 60, 1, 5), "Calculate a linear conversion for two ranges with a different min and a different size, scaling down");
        this.assertEquals(20, this.calculateLinearConversion(10, 10, 20, 20, 40), "Calculate a linear conversion where the starting value is the minimum of the original range");
        this.assertEquals(40, this.calculateLinearConversion(20, 10, 20, 20, 40), "Calculate a linear conversion where the starting value is the maximum of the original range");
    }

    /**
     * Logic for converting between beats-per-minute and loop length in milliseconds, and vice versa, and any other related stuff.
     */

    static convertBeatsPerMinuteToLoopLengthInMillis(beatsPerMinute, numberOfBeatsPerLoop) {
        // creating some time-related contants here just to make the conversion logic more readable
        let secondsPerMinute = 60
        let millisecondsPerSecond = 1000
        // had to write out some dimensional analysis to figure out how to calculate this..
        return (secondsPerMinute * millisecondsPerSecond * numberOfBeatsPerLoop) / beatsPerMinute
    }

    static convertLoopLengthInMillisToBeatsPerMinute(loopLengthInMillis, numberOfBeatsPerLoop) {
        let secondsPerMinute = 60
        let millisecondsPerSecond = 1000
        return (secondsPerMinute * millisecondsPerSecond * numberOfBeatsPerLoop) / loopLengthInMillis
    }


    // and here are some more conversion methods, to be used in the 'tap tempo' button logic
    // (to convert the time between each click into a beats-per-minute value and vice versa)

    static convertBeatLengthInMillisToBeatsPerMinute(millisecondsPerBeat) {
        let millisecondsPerSecond = 1000
        let secondsPerMinute = 60
        // needed to do some more dimensional analysis haha..
        return (secondsPerMinute * millisecondsPerSecond) / millisecondsPerBeat
    }

    static convertBeatsPerMinuteToBeatLengthInMillis(beatsPerMinute) {
        let millisecondsPerSecond = 1000
        let secondsPerMinute = 60
        return (secondsPerMinute * millisecondsPerSecond) / beatsPerMinute
    }

    static debounce(func, wait = 300) {
        let timer;
        return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, wait);
        };
    }

    static throttle(func, limit = 200) {
        var waiting = false;
        return function () {
        if (!waiting) {
            func.apply(this, arguments);
            waiting = true;
            setTimeout(function () {
            waiting = false;
            }, limit);
        }
        };
    }
}