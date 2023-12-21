/* eslint-disable no-prototype-builtins */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-spread */
import type { DependencyList } from 'react';
import { useEffect, useRef } from 'react';
import { isFunction } from '../../util';

type Cachekey = Array<string | number> | ((...args: any[]) => Array<string | number>);

type EventableOtpions<T> = {
  onBefore?: () => boolean | void;
  onRequest?: (cancel: () => void) => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  onCancel?: () => void;
};

const getProp = (target: object, keys: Array<string | number>, defaultValue: any) =>
  keys.reduce((obj, key) => {
    const tmp = ((obj || {}) as any)[key];
    if (tmp === undefined) {
      return defaultValue;
    }
    return tmp;
  }, target);

const cancelablePromise = <T>(targetPromise: Promise<T>) => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  let cancel = () => {};

  const tmpPromise = new Promise(res => {
    cancel = res as () => void;
  });

  const promise = Promise.race([tmpPromise, targetPromise]) as Promise<T>;
  return { cancel, promise };
};

const eventablePromise = async <T>(promiseFn: () => Promise<T>, options: EventableOtpions<T>) => {
  const { onBefore, onRequest, onSuccess, onError, onFinally, onCancel } = options;
  let isContinue = true;
  let promise: Promise<T> | undefined;
  let isCancel = false;
  if (onBefore) {
    isContinue = onBefore() !== false;
  }
  if (!isContinue) {
    return;
  }

  try {
    const cancel = () => {
      isCancel = true;
      if (onCancel) {
        onCancel();
      }
    };
    if (onRequest) {
      promise = onRequest(cancel);
    }
    if (promise === undefined) {
      promise = promiseFn();
    }
    const res = await promise;
    if (isCancel) {
      return;
    }
    if (onSuccess) {
      onSuccess(res);
    }
    // 不能直接使用原生finally 无法阻断
    if (onFinally) {
      onFinally();
    }
  } catch (err) {
    const error = err as Error;
    if (onError) {
      onError(error);
    }
    if (onFinally) {
      onFinally();
    }
  }
};

const getCachePromise = (cacheKey: string, cachePromise: Map<string, Promise<any>>) => cachePromise.get(cacheKey);

const setCachePromise = (cacheKey: string, promise: Promise<any>, cachePromise: Map<string, Promise<any>>) => {
  cachePromise.set(cacheKey, promise);
  promise
    .then(res => {
      cachePromise.delete(cacheKey);
      return res;
    })
    .catch(() => {
      cachePromise.delete(cacheKey);
    });
};

const getCachedKeys = (keys: Cachekey, params: any[]) => {
  let _keys = keys;
  if (isFunction(keys)) {
    _keys = keys.apply(undefined, params);
  } else {
    _keys = [...keys, ...params];
  }
  return _keys;
};

const useMemoryEffect = (callback: (...params: DependencyList) => void, deps: DependencyList) => {
  const prevDeps = useRef<DependencyList>([]);
  useEffect(() => {
    callback(...prevDeps.current);
    prevDeps.current = deps;
  }, deps);
};

const shallowEqual = (objA: any, objB: any): boolean => {
  if (objA === objB) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (let i = 0; i < keysA.length; i++) {
    if (!objB.hasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
};

export type { Cachekey, EventableOtpions };

export { getProp, cancelablePromise, eventablePromise, getCachePromise, setCachePromise, getCachedKeys, useMemoryEffect, shallowEqual };
