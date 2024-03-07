/* eslint-disable no-useless-call */
/* eslint-disable no-underscore-dangle */
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Config, Proxied } from './core';
import Core, { getCoreInstance, getOrigin } from './core';
import type { DevToolOptions } from './middlewares/devtool';
import DevToolPlugin from './middlewares/devtool';
import ScopePlugin from './middlewares/scope';
import SubscribePlugin, { subscribe } from './middlewares/subscribe';
import USSPlugin, { effect, recycle } from './middlewares/uss';
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__: any;
  }
}

const useSafeUpdate = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const isMountedRef = useRef(false);

  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => {
    if (isMountedRef.current) {
      forceUpdate();
    }
  };
};
const uss = <T extends Config>(initObj: T) => {
  const ussPlugin = new USSPlugin<T>();
  const subscribePlugin = new SubscribePlugin<T>();
  const core = new Core<T>([ussPlugin, subscribePlugin], 'uss');
  return core.proxyObject(initObj);
};

const useUSS = <T extends Config>(model: Proxied<T>, scopeName = '') => {
  const safeUpdate = useSafeUpdate();
  recycle(safeUpdate);
  const result = useMemo(() => {
    const scopePlugin = new ScopePlugin<T>(safeUpdate);
    const core = new Core<T>([scopePlugin], scopeName);
    const state = core.proxyObject(model);
    return state;
  }, []);

  return result;
};

const useReactive = <T extends Config>(initObj: T) => {
  const safeUpdate = useSafeUpdate();
  recycle(safeUpdate);
  const [proxyObject, setProxyObject] = useState(uss({ ...toRaw(initObj), _key: Math.round(Math.random() * 90000 + 10000) }));

  useEffect(() => {
    const unSub = subscribe(proxyObject, () => {
      safeUpdate();
    });
    return () => unSub();
  }, [proxyObject]);

  const update = useCallback(
    (fn: ((draft: T) => void) | T) => {
      if (typeof fn === 'function') {
        fn.apply(null, [proxyObject as T]);
      } else {
        setProxyObject(uss({ ...toRaw(fn), _key: Math.round(Math.random() * 90000 + 10000) }));
      }
    },
    [proxyObject],
  );

  return [toRaw(proxyObject), update] as [T, typeof update];
};

const devtools = <T extends Config>(model: Proxied<T>, options: DevToolOptions = {}) => {
  if (window.__REDUX_DEVTOOLS_EXTENSION__ === undefined) return;
  const state = getOrigin(model);
  const core = getCoreInstance(model);
  const { name } = options;
  const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name: name || state.key });

  devTools.init(state);
  const devToolPlugin = new DevToolPlugin<T>(devTools, options);
  core.use(devToolPlugin);
};

const toRaw = <T extends Config>(model: T) => {
  let target = model;
  let tmp = model;
  // eslint-disable-next-line no-cond-assign
  while ((tmp = getOrigin(target))) {
    target = tmp;
  }
  return target;
};

export type { Config, Proxied };

export { devtools, effect, getOrigin, subscribe, toRaw, useReactive, useUSS, uss };
