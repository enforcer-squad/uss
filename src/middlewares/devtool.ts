/* eslint-disable class-methods-use-this */
import { getOrigin, type Config, type CoreMiddleware } from '../core';
import { debug } from '../util';

class DevToolPlugin<T extends Config> implements CoreMiddleware<T> {
  devTools: any;

  constructor(devTools: any) {
    this.devTools = devTools;
  }

  onApply: NonNullable<CoreMiddleware<T>['onApply']> = (context, next, target, thisArg, argArray, rootProxyRef) => {
    next(context, next, target, thisArg, argArray, rootProxyRef);
    const state = getOrigin(rootProxyRef);
    const toolState = {} as Partial<T>;
    const keys = Reflect.ownKeys(state) as (keyof T)[];
    keys.forEach(key => {
      const value = state[key];
      if (typeof value !== 'function') {
        toolState[key] = value;
      }
    });
    this.devTools.send(`${target.name}`, toolState);
    debug(`Action ${target.name} 执行，更新后的state ${toolState}`);
  };
}

export default DevToolPlugin;
