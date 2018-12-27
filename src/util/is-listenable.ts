import {ListenableSignifier} from '../types';

/** Returns true if the input object is a listenable type. */
export function isListenable(input: any) {
    return input[ListenableSignifier] === true
}