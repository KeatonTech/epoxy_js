import { Observable } from 'rxjs';
/**
 * Creates an observable that updates whenever the result of the inner computation changes.
 * Note that this only works for functions that rely solely on Epoxy values.
 */
export declare function computed<T>(computeFunction: () => T): Observable<T>;
