/* eslint-disable no-underscore-dangle */
import type { Config, Proxied } from './core';
import type { DevToolOptions } from './middlewares/devtool';
import { useReducer, useMemo, useRef, useLayoutEffect } from 'react';
import Core, { getOrigin, getCoreInstance } from './core';
import USSPlugin, { effect, recycle } from './middlewares/uss';
import SubscribePlugin, { subscribe } from './middlewares/subscribe';
import ScopePlugin from './middlewares/scope';
import DevToolPlugin from './middlewares/devtool';
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

const toRaw = <T extends Config>(model: Proxied<T>) => {
  let target = model;
  let tmp = model;
  // eslint-disable-next-line no-cond-assign
  while ((tmp = getOrigin(target) as Proxied<T>)) {
    target = tmp;
  }
  return target;
};

export type { Config, Proxied };

export { uss, useUSS, toRaw, devtools, getOrigin, subscribe, effect };
