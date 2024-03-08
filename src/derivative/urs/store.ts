/* eslint-disable @typescript-eslint/unbound-method */
import type { Config, Proxied } from '../../index';
import { devtools, toRaw, useUSS, uss } from '../../index';
import { getProp } from './util';

const store = uss({
  setData(keys: Array<string | number>, data: any) {
    let target = store as any;
    const { length } = keys;
    for (let i = 0; i < length; i++) {
      const prop = keys[i];
      if (i === length - 1) {
        target[prop] = data;
      } else {
        if (target[prop] === undefined) {
          target[prop] = {};
        }
        target = target[prop];
      }
    }
  },
});

devtools(store, {
  name: 'data',
  interceptor: model => {
    delete model._MANAGEMENT;
    return model;
  },
});

const { setData } = store;

const getDataStore = <T extends Config>() => store as unknown as Proxied<T>;

const getData = (keys: Array<string | number>, defaultValue?: any) => getProp(store, keys, defaultValue) as Proxied<any>;

const getReactiveData = <T extends Config>(keys: Array<string | number>, defaultValue?: T) => {
  const state = useUSS(store);
  const data = getProp(state, keys, defaultValue) as Proxied<T>;
  return toRaw(data);
};

export { getData, getDataStore, getReactiveData, setData };
