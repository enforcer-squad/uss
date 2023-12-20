/* eslint-disable class-methods-use-this */
import type { Config, CoreMiddleware } from '../core';
import { currentListener } from './uss';

type DispatchFn = (...args: any[]) => void;

class ScopePlugin<T extends Config> implements CoreMiddleware<T> {
  dispatch: (...args: any[]) => void;

  constructor(dispatch: DispatchFn) {
    this.dispatch = dispatch;
  }

  onGet: NonNullable<CoreMiddleware<T>['onGet']> = (context, next, target, prop, receiver) => {
    const { dispatch } = this;

    currentListener.callback = dispatch;
    next(context, next, target, prop, receiver);
    currentListener.callback = null;
  };

  onSet: NonNullable<CoreMiddleware<T>['onSet']> = (_, prop, value) => {
    throw new Error(`attempt to set property ${String(prop)} to ${value}. This object is read-only.`);
  };

  onOwnKeys: NonNullable<CoreMiddleware<T>['onOwnKeys']> = (context, next, target) => {
    const { dispatch } = this;
    currentListener.callback = dispatch;
    next(context, next, target);
    currentListener.callback = null;
  };
}

export default ScopePlugin;
