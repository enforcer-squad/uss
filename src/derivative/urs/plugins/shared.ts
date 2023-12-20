import type { Plugins } from '../core';
import type { Cachekey } from '../util';
import { getCachedKeys, getCachePromise, setCachePromise } from '../util';

class SharedPlugin<RequestParams extends any[], ResponseData> implements Plugins<RequestParams, ResponseData> {
  keys: Cachekey;

  cachePromise: Map<string, Promise<any>>;

  constructor(keys: Cachekey, cachePromise: Map<string, Promise<any>>) {
    this.keys = keys;
    this.cachePromise = cachePromise;
  }

  onBefore: NonNullable<Plugins<RequestParams, ResponseData>['onBefore']> = params => {
    const { cachePromise } = this;
    const cacheKeys = getCachedKeys(this.keys, params!);
    const cacheKey = cacheKeys.join();
    const servicePromise = getCachePromise(cacheKey, cachePromise);

    if (servicePromise) {
      return {
        isReturn: true,
      };
    }
    return undefined;
  };

  onRequest: NonNullable<Plugins<RequestParams, ResponseData>['onRequest']> = (state, service) => {
    const { params } = state;
    const { cachePromise } = this;
    const cacheKeys = getCachedKeys(this.keys, params!);
    const cacheKey = cacheKeys.join();
    let servicePromise = getCachePromise(cacheKey, cachePromise);
    if (servicePromise) {
      return { promise: servicePromise };
    }
    servicePromise = service(...params!);
    setCachePromise(cacheKey, servicePromise, cachePromise);
    return { promise: servicePromise };
  };
}

export { SharedPlugin };
