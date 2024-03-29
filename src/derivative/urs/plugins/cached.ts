/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Config } from '../../../index';
import { subscribe } from '../../../index';
import type { Plugins } from '../core';
import { getData, getReactiveData, setData } from '../store';
import type { Cachekey } from '../util';
import { getCachedKeys } from '../util';

const MANAGEMENT = '_MANAGEMENT';
const SNAPSHOT = 'snapshot';
const STALE = 'stale';
const STALESTATE = ['stale', 'state'];

const setStaleData = (cacheKeys: Array<string | number>, status: boolean) => {
  (setData as any)._NOTRACK_ = true;
  setData([MANAGEMENT, ...cacheKeys, ...STALESTATE], status);
  (setData as any)._NOTRACK_ = false;
};

const setSnapshotData = (cacheKeys: Array<string | number>, status: any) => {
  (setData as any)._NOTRACK_ = true;
  setData([MANAGEMENT, ...cacheKeys, SNAPSHOT], status);
  (setData as any)._NOTRACK_ = false;
};

const getStaleData = (cacheKeys: Array<string | number>) => getData([MANAGEMENT, ...cacheKeys, STALE]);

const getSnapshotData = (cacheKeys: Array<string | number>) => getData([MANAGEMENT, ...cacheKeys, SNAPSHOT]);

const getReactiveSnapshotData = <T extends Config>(keys: Array<string | number>, defaultValue?: T) => {
  if (keys.length === 0) {
    return getReactiveData([], defaultValue);
  }
  const cacheKeys = [MANAGEMENT, ...keys, SNAPSHOT];
  return getReactiveData(cacheKeys, defaultValue);
};

const invalidateData = (keys: Array<string | number>) => {
  if (keys.length === 0 || (keys as any).indexOf(undefined) !== -1) {
    return;
  }
  setStaleData(keys, true);
};

class CachedPlugin<RequestParams extends any[], ResponseData> implements Plugins<RequestParams, ResponseData> {
  keys: Cachekey;

  unSub: () => void;

  constructor(keys: Cachekey) {
    this.keys = keys;
    this.unSub = () => undefined;
  }

  onBefore: NonNullable<Plugins<RequestParams, ResponseData>['onBefore']> = (params, instance) => {
    this.unSub();
    const cacheKeys = getCachedKeys(this.keys, params);
    const stale = getStaleData(cacheKeys);

    if (stale?.state) {
      return undefined;
    }

    if (!instance.options.noCache) {
      const cachedData = getSnapshotData(cacheKeys);

      if (cachedData?.data) {
        this.unSub = subscribe(getStaleData(cacheKeys), () => {
          instance.refetch();
        });
        return {
          isReturn: true,
          data: cachedData.data,
          params: cachedData.params,
          error: undefined,
        };
      }
    }

    return undefined;
  };

  onRequest: NonNullable<Plugins<RequestParams, ResponseData>['onRequest']> = state => {
    const { params } = state;
    const cacheKeys = getCachedKeys(this.keys, params!);

    const cachedData = (getSnapshotData(cacheKeys) || {}) as ResponseData;
    setSnapshotData(cacheKeys, { ...cachedData, ...state });
  };

  onSuccess: NonNullable<Plugins<RequestParams, ResponseData>['onSuccess']> = state => {
    const { params, data } = state;
    const cacheKeys = getCachedKeys(this.keys, params!);
    const cachedData = (getSnapshotData(cacheKeys) || {}) as ResponseData;

    setData(cacheKeys, data);
    setSnapshotData(cacheKeys, { ...cachedData, ...state });
    setStaleData(cacheKeys, false);
  };

  onError: NonNullable<Plugins<RequestParams, ResponseData>['onError']> = state => {
    const { params } = state;
    const cacheKeys = getCachedKeys(this.keys, params!);
    const cachedData = (getSnapshotData(cacheKeys) || {}) as ResponseData;

    setSnapshotData(cacheKeys, { ...cachedData, ...state });
    setStaleData(cacheKeys, false);
  };

  onFinally: NonNullable<Plugins<RequestParams, ResponseData>['onFinally']> = (state, instance) => {
    const { params } = state;
    const cacheKeys = getCachedKeys(this.keys, params!);

    this.unSub = subscribe(getStaleData(cacheKeys), (relativePath, value, prevValue) => {
      instance.refetch();
    });
  };
}

export { CachedPlugin, getReactiveSnapshotData, getSnapshotData, invalidateData, setSnapshotData, setStaleData };
