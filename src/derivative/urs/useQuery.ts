/* eslint-disable @typescript-eslint/no-empty-function */
import { useMemo, useState } from 'react';
import type { Proxied, Config } from '../../core';
import type { Service, FetchState, FetchOptions } from './core';
import type { Cachekey } from './util';
import Core from './core';
import { getCachedKeys, useMemoryEffect, shallowEqual } from './util';
import { CachedPlugin, getReactiveSnapshotData, setSnapshotData, setStaleData, getSnapshotData, invalidateData } from './plugins/cached';
import { SharedPlugin } from './plugins/shared';

// promise请求全局缓存
const cachePromise = new Map<string, Promise<any>>();

const getCurrentCachedKeys = (key: Cachekey, manual: boolean, manualParams: any[], autoParams: any[]) => {
  let keys = getCachedKeys(key, autoParams);
  if (manual) {
    keys = getCachedKeys(key, manualParams);
  }
  return (keys as any).indexOf(undefined) === -1 ? keys : [];
};

const useQuery = <RequestParams extends any[], ResponseData>(keys: Cachekey, service: Service<RequestParams, ResponseData>, options: FetchOptions<RequestParams, ResponseData>) => {
  const { manual = false, params: autoParams = [], placeholderData } = options || {};

  const [manualParams, setManualParams] = useState<any[]>([]);

  const client = useMemo(() => {
    // 合成初始化fetch state
    const initState: Partial<FetchState<RequestParams, ResponseData>> = {
      loading: !manual,
      data: placeholderData,
      params: autoParams as RequestParams,
    };
    const initOptions = {
      ...options,
      initState,
    };
    // 初始化所需插件
    const cached = new CachedPlugin<RequestParams, ResponseData>(keys);
    const shared = new SharedPlugin<RequestParams, ResponseData>(keys, cachePromise);
    const fetch = new Core<RequestParams, ResponseData>(service, initOptions, [cached, shared]);

    return fetch;
  }, []);

  client.setOptions(options);

  useMemoryEffect(
    (prevManual, prevParams) => {
      if (
        !manual &&
        autoParams &&
        // autoParams.length > 0 &&
        !(autoParams as any[]).includes(undefined) &&
        !shallowEqual(prevParams, autoParams)
      ) {
        client.refetch(autoParams);
      }
    },
    [manual, autoParams],
  );

  useMemoryEffect(
    prevParams => {
      if (
        manual &&
        manualParams &&
        // manualParams.length > 0 &&
        !manualParams.includes(undefined) &&
        !shallowEqual(prevParams, manualParams)
      ) {
        client.refetch(manualParams);
      }
    },
    [manualParams],
  );

  const cacheKeys = getCurrentCachedKeys(keys, manual, manualParams, autoParams);

  const cachedData = getReactiveSnapshotData(cacheKeys, {}) as Proxied<Config>;

  const result = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let refetch = (...params: any[]) => {};
    if (options.manual) {
      refetch = (...params: any[]) => {
        setManualParams(params);
      };
    }
    return {
      loading: cachedData.loading,
      data: cachedData.data || client.state.data,
      error: cachedData.error,
      cancel: cachedData.cancel!,
      refetch,
    };
  }, [cachedData]);

  return result;
};

export { useQuery, setSnapshotData, setStaleData, getSnapshotData, invalidateData };
