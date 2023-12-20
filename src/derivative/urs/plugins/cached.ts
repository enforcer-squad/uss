/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Proxied, Config } from '../../../index';
import type { Plugins } from '../core';
import type { Cachekey } from '../util';
import { getCachedKeys } from '../util';
import { setData, getData, getReactiveData } from '../store';
import { subscribe } from '../../../index';

const MANAGEMENT = '_MANAGEMENT';
const SNAPSHOT = 'snapshot';
const STALE = 'stale';
const STALESTATE = ['stale', 'state'];

const setStaleData = (cacheKeys: (string | number)[], status: boolean) =>
  setData([MANAGEMENT, ...cacheKeys, ...STALESTATE], status);

const setSnapshotData = (cacheKeys: (string | number)[], status: any) =>
  setData([MANAGEMENT, ...cacheKeys, SNAPSHOT], status);

const getStaleData = (cacheKeys: (string | number)[]) => getData([MANAGEMENT, ...cacheKeys, STALE]);

const getSnapshotData = (cacheKeys: (string | number)[]) => getData([MANAGEMENT, ...cacheKeys, SNAPSHOT]);

const getReactiveSnapshotData = <T extends Config>(keys: (string | number)[], defaultValue?: T) => {
  if (keys.length === 0) {
    return getReactiveData([], defaultValue) as Proxied<T>;
  }
  const cacheKeys = [MANAGEMENT, ...keys, SNAPSHOT];
  return getReactiveData(cacheKeys, defaultValue) as Proxied<T>;
};

const invalidateData = (keys: (string | number)[]) => {
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

    const cachedData = getSnapshotData(cacheKeys);

    if (cachedData?.data) {
      this.unSub = subscribe(getStaleData(cacheKeys), () => {
        console.log('重新请求');
        instance.refetch();
      });
      return {
        isReturn: true,
        data: cachedData.data,
        params: cachedData.params,
        error: undefined,
      };
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
      console.log('重新请求');
      instance.refetch();
    });
  };
}

export { CachedPlugin, getReactiveSnapshotData, setSnapshotData, getSnapshotData, setStaleData, invalidateData };
