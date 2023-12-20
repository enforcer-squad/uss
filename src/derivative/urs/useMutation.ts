/* eslint-disable @typescript-eslint/no-empty-function */
import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { Service, FetchOptions } from './core';
import Core from './core';

const useMutation = <RequestParams extends any[], ResponseData>(
  service: Service<RequestParams, ResponseData>,
  options: FetchOptions<RequestParams, ResponseData>,
) => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const cancelRef = useRef(() => {});
  const client = useMemo(() => {
    // 初始化所需插件
    const fetch = new Core<RequestParams, ResponseData>(service, options, [], forceUpdate);
    return fetch;
  }, []);

  const mutate = useCallback((...params: any[]) => {
    client.refetch(params);
  }, []);

  cancelRef.current = client.state.cancel!;

  const result = {
    loading: client.state.loading,
    data: client.state.data,
    error: client.state.error,
    cancel: cancelRef,
    mutate,
  };

  return result;
};

export { useMutation };
