import {IListenableObject, ListenableSignifier} from './types';
import {Mutation} from './mutations';
import {makeListenable} from './make-listenable';
import {Observable} from 'rxjs';

export type Constructable = new (...args: any[]) => object;

export function MakeListenable<T extends Constructable>(Base: T) {
    return class extends Base implements IListenableObject<any> {
        constructor(...args) {
            super(...args);
            return makeListenable(this, true) as any;
        }

        listen(): Observable<Mutation<any>> {
            throw new Error();
        }

        asObservable(): Observable<Object> {
            throw new Error();
        }

        observables(): {[key: string]: Observable<any>} {
            throw new Error();
        }

        asReadonly(): IListenableObject<any> {
            throw new Error();
        }

        staticCopy(): IListenableObject<any> {
            throw new Error();
        }

        setComputed() {
            throw new Error();
        }

        applyMutation() {
            throw new Error();
        }

        unapplyMutation() {
            throw new Error();
        }

        debugWithLabel() {
            throw new Error();
        }

        hideFromDebugger() {
            throw new Error();
        }

        broadcastCurrentValue() {
            throw new Error();
        }

        [ListenableSignifier]: undefined;
    }
}

export const ListenableObject = MakeListenable(Object);