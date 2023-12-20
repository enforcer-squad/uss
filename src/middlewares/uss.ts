/* eslint-disable class-methods-use-this */
import type { Config, CoreMiddleware } from '../core';
import { ITERATION_KEY } from '../core';

type DispatchFn = (...args: any[]) => void;

type Listener = {
  callback: null | DispatchFn;
};

const currentListener: Listener = {
  callback: null,
};

const listenersMap = new WeakMap<Config, Map<keyof Config, Set<DispatchFn>>>();
const recycleMap = new Map<DispatchFn, Map<Config, keyof Config>>();

class USSPlugin<T extends Config> implements CoreMiddleware<T> {
  onGet: NonNullable<CoreMiddleware<T>['onGet']> = (context, next, target, prop, receiver) => {
    next(context, next, target, prop, receiver);
    // 方法属性不收集依赖
    if (typeof target[prop] === 'function') {
      return;
    }
    // 当属性被访问时，如果存在依赖，将其收集到该属性的依赖监听列表中
    const { callback } = currentListener;
    if (callback) {
      // 获取当前target下的所有的属性监听器Map，没有则初始化一个
      const propListeners = listenersMap.get(target) || new Map();
      // 获取当前属性的监听器集合，没有则初始化一个
      const listeners = propListeners.get(prop) || new Set();
      // 收集依赖
      listeners.add(callback);
      // 更新监听器列表
      propListeners.set(prop, listeners);
      listenersMap.set(target, propListeners);

      // 回收逻辑 防止没有使用需求的无用监听导致内存泄漏
      const currentCallbackDeps = recycleMap.get(callback) || new Map();
      currentCallbackDeps.set(target, prop);
      recycleMap.set(callback, currentCallbackDeps);
    }
  };

  onSet: NonNullable<CoreMiddleware<T>['onSet']> = (context, next, target, prop, newValue, receiver) => {
    // 当属性被修改时，通知所有相关的监听器
    const propListeners = listenersMap.get(target) as Map<keyof T | symbol, Set<DispatchFn>>;
    if (propListeners === undefined) {
      next(context, next, target, prop, newValue, receiver);
      return;
    }
    if (!Reflect.has(target, prop)) {
      const listeners = propListeners.get(ITERATION_KEY);
      if (listeners) {
        listeners.forEach(listener => listener());
      }
    }
    const prevValue = target[prop];
    next(context, next, target, prop, newValue, receiver);
    const listeners = propListeners.get(prop);
    if (listeners) {
      listeners.forEach(listener => listener(newValue, prevValue));
    }
  };

  onOwnKeys: NonNullable<CoreMiddleware<T>['onOwnKeys']> = (context, next, target) => {
    next(context, next, target);
    if (currentListener.callback) {
      // 获取当前target下的所有的属性监听器Map，没有则初始化一个
      const propListeners = listenersMap.get(target) || new Map();
      // 获取当前属性的监听器集合，没有则初始化一个
      const listeners = propListeners.get(ITERATION_KEY) || new Set();
      // 收集依赖
      listeners.add(currentListener.callback);
      // 更新监听器列表
      propListeners.set(ITERATION_KEY, listeners);
      listenersMap.set(target, propListeners);
    }
  };

  onDelete: NonNullable<CoreMiddleware<T>['onDelete']> = (context, next, target, prop) => {
    next(context, next, target, prop);
    // 当属性被删除时，通知所有相关的监听器
    const propListeners = listenersMap.get(target) as Map<keyof T, Set<DispatchFn>>;
    if (propListeners === undefined) {
      return;
    }
    const listeners = propListeners.get(prop);
    if (listeners) {
      listeners.forEach(listener => listener());
    }
  };
}

const recycle = (tracker: DispatchFn) => {
  const depsMap = recycleMap.get(tracker);
  if (depsMap) {
    depsMap.forEach((prop, target) => {
      const propListeners = listenersMap.get(target)!;
      const listeners = propListeners.get(prop);
      listeners?.delete(tracker);
    });
    recycleMap.delete(tracker);
  }
};

const effect = (tracker: DispatchFn) => {
  const recyclableTracker = () => {
    recycle(recyclableTracker);
    tracker();
  };
  currentListener.callback = recyclableTracker;
  tracker();
  currentListener.callback = null;
};

export { currentListener, effect, recycle };

export default USSPlugin;
