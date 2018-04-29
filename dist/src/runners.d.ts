import { Observable } from 'rxjs';
/**
 * Outputs an observable iff the computeFunction depends on Epoxy values. If the compute
 * function has no dependencies this function simply returns the output value.
 */
export declare function optionallyComputed<T>(computeFunction: () => T): Observable<T> | T;
/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
export declare function computed<T>(computeFunction: () => T): Observable<T>;
/**
 * Returns an observable that updates whenever an Epoxy value changes.
 */
export declare function observe<T>(pickerFunction: () => T): Observable<T>;
/**
 * Re-runs the function whenever any Epoxy value it depends on changes.
 */
export declare function autorun(autorunFunction: () => any): void;
