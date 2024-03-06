/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-use-before-define */
import { eventablePromise } from './util';

type Service<RequestParams extends any[], ResponseData> = (...args: RequestParams) => Promise<ResponseData>;

type FetchState<RequestParams extends any[], ResponseData> = {
  loading: boolean;
  params?: Partial<RequestParams>;
  data?: ResponseData;
  error?: Error;
  cancel?: () => void;
};

type FetchOptions<RequestParams extends any[], ResponseData> = {
  initState?: Partial<FetchState<RequestParams, ResponseData>>;
  manual?: boolean;
  params?: Partial<RequestParams>;
  placeholderData?: ResponseData;
  onBefore?: (params: RequestParams) => void;
  onSuccess?: (params: RequestParams, data: ResponseData) => void;
  onError?: (params: RequestParams, error: Error) => void;
  onFinally?: (params: RequestParams, data?: ResponseData, error?: Error) => void;
  onCancel?: () => void;
};

type DispatchFn = (...args: any[]) => void;

type BeforeReturn<T> = { isReturn: true; data?: T; error?: Error };
type RequestReturn<T> = { promise: Promise<T> };

interface Plugins<RequestParams extends any[], ResponseData> {
  onBefore?: (params: RequestParams, instance: Core<RequestParams, ResponseData>) => void | BeforeReturn<ResponseData>;
  onRequest?: (state: FetchState<RequestParams, ResponseData>, service: Service<RequestParams, ResponseData>, instance: Core<RequestParams, ResponseData>) => void | RequestReturn<ResponseData>;
  onSuccess?: (state: FetchState<RequestParams, ResponseData>, instance: Core<RequestParams, ResponseData>) => void;
  onError?: (state: FetchState<RequestParams, ResponseData>, instance: Core<RequestParams, ResponseData>) => void;
  onFinally?: (state: FetchState<RequestParams, ResponseData>, instance: Core<RequestParams, ResponseData>) => void;
  onCancel?: (instance: Core<RequestParams, ResponseData>) => void;
}

const voidFn = () => {};

class Core<RequestParams extends any[], ResponseData> {
  state: FetchState<RequestParams, ResponseData>;

  service: Service<RequestParams, ResponseData>;

  options: FetchOptions<RequestParams, ResponseData>;

  dispatch: DispatchFn;

  plugins: Array<Plugins<RequestParams, ResponseData>>;

  constructor(service: Service<RequestParams, ResponseData>, options: FetchOptions<RequestParams, ResponseData>, plugins: Array<Plugins<RequestParams, ResponseData>>, dispatch?: DispatchFn) {
    const { initState = {} } = options;
    this.state = { loading: true, params: undefined, data: undefined, error: undefined, ...initState };

    // 可以通过public语法简化代码 不过在下觉得这样更清晰
    this.service = service;
    this.options = options;
    this.dispatch = dispatch || voidFn;
    this.plugins = plugins || [];
  }

  setOptions(options: FetchOptions<RequestParams, ResponseData>) {
    this.options = options;
  }

  execPlugins(event: keyof Plugins<RequestParams, ResponseData>, ...params: any[]) {
    const result = this.plugins.map(plugin => (plugin[event] as any)?.(...params)).filter(Boolean);
    const tmp = result.reduce((current, next) => ({ ...current, ...next }), {});

    return tmp;
  }

  updateState(state: Partial<FetchState<RequestParams, ResponseData>>) {
    this.state = {
      ...this.state,
      ...state,
    };
    this.dispatch();
  }

  async request(...params: RequestParams) {
    const { service } = this;

    const { onBefore, onSuccess, onError, onFinally, onCancel } = this.options;

    const promiseFn = () => service(...params);
    await eventablePromise(promiseFn, {
      onBefore: () => {
        const { isReturn, ...state } = this.execPlugins('onBefore', params, this) as unknown as BeforeReturn<ResponseData>;
        if (onBefore) {
          onBefore(params);
        }
        if (isReturn) {
          this.updateState({
            ...state,
          });
        }
        return !isReturn;
      },
      onRequest: cancel => {
        const tmpState = {
          loading: true,
          params,
          cancel,
        };
        const { promise } = this.execPlugins('onRequest', tmpState, service, this) as unknown as RequestReturn<ResponseData>;
        this.updateState(tmpState);

        return promise;
      },
      onSuccess: data => {
        const tmpState = { params, loading: false, cancel: undefined, error: undefined, data };
        this.execPlugins('onSuccess', tmpState, this);
        if (onSuccess) {
          onSuccess(params, data);
        }
        this.updateState(tmpState);
      },
      onError: error => {
        const tmpState = { params, loading: false, cancel: undefined, error };
        this.execPlugins('onError', tmpState, this);
        if (onError) {
          onError(params, error);
        }
        this.updateState(tmpState);
      },
      onFinally: () => {
        const { data, error } = this.state;
        this.execPlugins('onFinally', this.state, this);
        if (onFinally) {
          onFinally(params, data, error);
        }
      },
      onCancel: () => {
        this.execPlugins('onCancel', this);
        if (onCancel) {
          onCancel();
        }
        this.updateState({ loading: false });
      },
    });
  }

  refetch(currentParams: any[] = []) {
    let params = currentParams;
    if (currentParams.length === 0) {
      params = this.state.params!;
    }
    this.request(...(params as RequestParams));
  }

  // clone(){

  // }
}

export type { FetchOptions, FetchState, Plugins, Service };

export default Core;
