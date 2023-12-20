/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import type { Config, Proxied, CoreMiddleware } from '../core';
import { getOrigin } from '../core';
import { isObject } from '../util';

type SubscribeCallback = (path: string, value: any, prevValue: any) => void;

const pathMap = new WeakMap<Config, string>();

const listenersMap = new Map<string, Set<SubscribeCallback>>();

const ChangeType = {
  Set: 'set',
  Delete: 'delete',
  Add: 'add',
};

const getPath = <T extends Config>(target: T, prop: keyof T) => {
  const parentPath = pathMap.get(target);
  const currentPath = parentPath ? `${parentPath}.${prop as string}` : prop;
  return currentPath as string;
};

class SubscribePlugin<T extends Config> implements CoreMiddleware<T> {
  trigger(path: string, type: string, params: any) {
    const matchingKeys = Array.from(listenersMap.keys()).filter(key => path.includes(key));
    matchingKeys.forEach(matchKey => {
      const relativePath = path.replace(`${matchKey}.`, '');
      listenersMap.get(matchKey)?.forEach(cb => cb(relativePath, type, params));
    });
  }

  onGet: NonNullable<CoreMiddleware<T>['onGet']> = (context, next, target, prop, receiver) => {
    next(context, next, target, prop, receiver);

    // 收集路径
    if (isObject(context.value)) {
      if (pathMap.get(target) === undefined) {
        pathMap.set(target, 'root');
      }
      pathMap.set(target[prop], `${pathMap.get(target)}.${prop as string}`);
    }
  };

  onSet: NonNullable<CoreMiddleware<T>['onSet']> = (context, next, target, prop, newValue, receiver) => {
    const prevValue = target[prop];
    const currentPath = getPath(target, prop);
    if (!Reflect.has(target, prop)) {
      this.trigger(currentPath, ChangeType.Add, { value: newValue, prevValue });
    }
    next(context, next, target, prop, newValue, receiver);
    this.trigger(currentPath, ChangeType.Set, { value: newValue, prevValue });
    // state-->person->class->no  watch person    state.person
    // 1 先拿到父路径 state.person.class.no         default state.person.class.no value
  };

  onDelete: NonNullable<CoreMiddleware<T>['onDelete']> = (context, next, target, prop) => {
    next(context, next, target, prop);
    const currentPath = getPath(target, prop);
    this.trigger(currentPath, ChangeType.Delete, {});
  };

  onInit: NonNullable<CoreMiddleware<T>['onInit']> = (context, next, target, handler) => {
    next(context, next, target, handler);
    if (target.key) {
      pathMap.set(target, target.key);
    }
  };
}

// 值类型的变化暂时没法解决 只能先监听上一级对象实现监听值类型属性变化
const subscribe = <T extends Config>(_model: T, callback: SubscribeCallback) => {
  const model = _model as Proxied<T>;
  const origin = getOrigin(model);
  const path = pathMap.get(origin);
  if (path) {
    const callbacks = listenersMap.get(path) || new Set<SubscribeCallback>();
    callbacks.add(callback);
    listenersMap.set(path, callbacks);

    // unsub方法 取消订阅
    return () => {
      const callbackSet = listenersMap.get(path);
      if (callbackSet) {
        callbackSet.delete(callback);
      }
    };
  }
  return () => undefined;
};

export { subscribe };

export default SubscribePlugin;
