/**
 * This file contains shared logic that is used throughout the drum machine and may not belong to a single particular class or file.
 * I am implementing this as a class with static methods instead of a file with just a bunch of functions, because I think including
 * a class name when invoking these functions will make it easier to see right away where they are implemented.
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
            return number
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
}