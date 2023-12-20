import type { Config, Proxied } from '../../index';
import { uss, useUSS, devtools } from '../../index';
import { getProp } from './util';

const store = uss({
  setData(keys: (string | number)[], data: any) {
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

devtools(store, { name: 'data' });

const { setData } = store;

const getDataStore = <T extends Config>() => store as unknown as Proxied<T>;

const getData = (keys: (string | number)[], defaultValue?: any) => getProp(store, keys, defaultValue) as Proxied<any>;

const getReactiveData = <T extends Config>(keys: (string | number)[], defaultValue?: T) => {
  const state = useUSS(store);
  const data = getProp(state, keys, defaultValue) as Proxied<T>;
  return data;
};

export { setData, getDataStore, getData, getReactiveData };
