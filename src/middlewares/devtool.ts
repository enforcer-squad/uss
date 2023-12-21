/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable class-methods-use-this */
import { getOrigin, type Config, type CoreMiddleware } from '../core';
import { debug } from '../util';

export type DevToolOptions = {
  name?: string;
  interceptor?: <T extends Config>(model: T) => T;
};
class DevToolPlugin<T extends Config> implements CoreMiddleware<T> {
  devTools: any;
  options: DevToolOptions;

  constructor(devTools: any, options: DevToolOptions = {}) {
    this.devTools = devTools;
    this.options = options;
  }

  onApply: NonNullable<CoreMiddleware<T>['onApply']> = (context, next, target, thisArg, argArray, rootProxyRef) => {
    next(context, next, target, thisArg, argArray, rootProxyRef);
    if ((target as any)._NOTRACK_) {
      return;
    }
    const state = getOrigin(rootProxyRef);
    let toolState = {} as Partial<T>;
    const keys = Reflect.ownKeys(state) as Array<keyof T>;
    keys.forEach(key => {
      const value = state[key];
      if (typeof value !== 'function') {
        toolState[key] = value;
      }
    });
    const { interceptor } = this.options;

    if (interceptor) {
      toolState = interceptor(toolState);
    }
    if (Object.keys(toolState).length > 0) {
      this.devTools.send(`${target.name}`, toolState);
      debug(`Action ${target.name} 执行，更新后的state ${toolState}`);
    }
  };
}

export default DevToolPlugin;
