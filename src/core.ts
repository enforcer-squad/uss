/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-underscore-dangle */
import type { Context } from './util';
import { isObject, isFunction, isProtoProperty, isSymbol, execute, debug } from './util';

type Config = {
  key?: string;
  [key: string]: any;
};

type Proxied<T extends Config> = T & {
  _NOTRACK_origin: T;
  _NOTRACK_core: Core<T>;
};

// type Proxied<T extends Config> = {
//   [P in keyof T]: T[P] extends Config ? Proxied<T[P]> : T[P];
// } & {
//   _NOTRACK_origin: T;
//   _NOTRACK_core: Core<T>;
// };

type GetMiddleware<T extends Config> = (
  context: Context,
  next: GetMiddleware<T>,
  target: T,
  p: keyof T,
  receiver: any,
) => void;

type SetMiddleware<T extends Config> = (
  context: Context,
  next: SetMiddleware<T>,
  target: T,
  p: keyof T,
  newValue: any,
  receiver: any,
) => void;

type OwnKeysMiddleware<T extends Config> = (context: Context, next: OwnKeysMiddleware<T>, target: T) => void;
type DeleteMiddleware<T extends Config> = (context: Context, next: DeleteMiddleware<T>, target: T, p: keyof T) => void;
type ApplyMiddleware<T extends Config> = (
  context: Context,
  next: ApplyMiddleware<T>,
  target: Function,
  thisArg: T | undefined,
  argArray: any[],
  rootProxyRef: Proxied<T>,
) => any;
type InitMiddleware<T extends Config> = (
  context: Context,
  next: InitMiddleware<T>,
  target: T,
  handler: ProxyHandler<T>,
) => void;

interface CoreMiddleware<T extends Config> {
  onGet?: GetMiddleware<T>;
  onSet?: SetMiddleware<T>;
  onOwnKeys?: OwnKeysMiddleware<T>;
  onDelete?: DeleteMiddleware<T>;
  onApply?: ApplyMiddleware<T>;
  onInit?: InitMiddleware<T>;
}

type Handlers<T extends Config> = {
  get: GetMiddleware<T>[];
  set: SetMiddleware<T>[];
  ownKeys: OwnKeysMiddleware<T>[];
  delete: DeleteMiddleware<T>[];
  apply: ApplyMiddleware<T>[];
  init: InitMiddleware<T>[];
};

const getOrigin = <T extends Config>(proxyObject: Proxied<T>) => proxyObject?._NOTRACK_origin;
const getCoreInstance = <T extends Config>(proxyObject: Proxied<T>) => proxyObject?._NOTRACK_core;
const ITERATION_KEY = Symbol('iteration key');

function capitalizeFirstLetter(target: string) {
  return target.charAt(0).toUpperCase() + target.slice(1);
}

class Core<T extends Config> {
  middlewares: CoreMiddleware<T>[];

  handlers: Handlers<T>;

  // 缓存-存储[代理对象,原始对象]
  proxyTargetCache: WeakMap<Proxied<T>, T>;

  // 缓存-存储[原始对象,代理对象]
  targetProxyCache: WeakMap<T, Proxied<T>>;

  scopeName: string;

  constructor(middlewares: CoreMiddleware<T>[], scopeName: string) {
    this.proxyTargetCache = new WeakMap<Proxied<T>, T>();
    this.targetProxyCache = new WeakMap<T, Proxied<T>>();
    this.middlewares = middlewares;
    this.scopeName = scopeName;
    this.handlers = { get: [], set: [], ownKeys: [], delete: [], apply: [], init: [] };
    this.initHandler();
  }

  initHandler() {
    const getMiddleware: GetMiddleware<T> = (context, next, target, prop, receiver) => {
      context.value = Reflect.get(target, prop, receiver);
    };
    const setMiddleware: SetMiddleware<T> = (context, next, target, prop, newValue, receiver) => {
      context.value = Reflect.set(target, prop, newValue, receiver);
    };
    const ownKeysMiddleware: OwnKeysMiddleware<T> = (context, next, target) => {
      context.value = Reflect.ownKeys(target);
    };
    const deleteMiddleware: DeleteMiddleware<T> = (context, next, target, prop) => {
      context.value = Reflect.deleteProperty(target, prop);
    };
    const applyMiddleware: ApplyMiddleware<T> = (context, next, target, thisArg, argArray, rootProxyRef) => {
      context.value = Reflect.apply(target, rootProxyRef, argArray);
    };
    const initMiddleware: InitMiddleware<T> = (context, next, target, handler) => {
      context.value = new Proxy(target, handler) as Proxied<T>;
    };

    this.handlers = {
      get: [getMiddleware],
      set: [setMiddleware],
      ownKeys: [ownKeysMiddleware],
      delete: [deleteMiddleware],
      apply: [applyMiddleware],
      init: [initMiddleware],
    };

    this.middlewares.forEach(middleware => this.use(middleware));
  }

  updateMiddleware(type: keyof Handlers<T>, middleware: CoreMiddleware<T>) {
    const middlewareKey = `on${capitalizeFirstLetter(type)}` as keyof CoreMiddleware<T>;
    const target = middleware[middlewareKey] as any;
    if (target !== undefined) {
      const baseMiddleware = this.handlers[type].pop()! as any;
      this.handlers[type].push(target.bind(middleware));
      this.handlers[type].push(baseMiddleware);
    }
  }

  use(middleware: CoreMiddleware<T>) {
    this.middlewares.push(middleware);
    Reflect.ownKeys(this.handlers).forEach(type => {
      const _type = type as keyof Handlers<T>;
      this.updateMiddleware(_type, middleware);
    });
  }

  unUse(middleware: CoreMiddleware<T>) {
    const index = this.middlewares.indexOf(middleware);
    if (index !== -1) {
      this.middlewares.splice(index, 1);
      Reflect.ownKeys(this.handlers).forEach(type => {
        const _type = type as keyof Handlers<T>;
        const middlewareKey = `on${capitalizeFirstLetter(_type)}` as keyof CoreMiddleware<T>;
        // ts弊端又或者我还没玩明白
        (this.handlers[_type] as Handlers<T>[keyof Handlers<T>]) = (this.handlers[_type] as any[]).filter(
          fn => fn !== middleware[middlewareKey],
        ) as Handlers<T>[keyof Handlers<T>];
      });
    }
  }

  proxyObject(initObj: T, rootProxyRef?: Proxied<T>): Proxied<T> {
    if (!isObject(initObj) && !isFunction(initObj)) {
      throw new Error('init object must be Object');
    }

    debug('准备执行代理方法', this.scopeName, initObj);
    const { handlers, proxyTargetCache, targetProxyCache } = this;

    // // 检查传入参数是否是代理对象，如果是直接返回传入参数
    if (proxyTargetCache.has(initObj as Proxied<T>)) {
      debug('缓存-直接返回', this.scopeName);
      return initObj as Proxied<T>;
    }
    // 检查传入参数是否已被代理过，如果是直接返回缓存代理
    const proxyCache = targetProxyCache.get(initObj);
    if (proxyCache) {
      debug('缓存-返回缓存代理', this.scopeName);
      return proxyCache;
    }

    const handler: ProxyHandler<T> = {
      get: (target, prop, receiver) => {
        // 获取原未代理对象
        if (prop === '_NOTRACK_origin') {
          return target;
        }
        // 获取core实例对象
        if (prop === '_NOTRACK_core') {
          return this;
        }
        // symbol和不跟踪属性直接返回
        if (isSymbol(prop) || prop.indexOf('_NOTRACK') === 0) {
          return Reflect.get(target, prop, receiver);
        }
        // 原型属性不处理 如数组的map等
        if (isProtoProperty(target, prop as string)) {
          return Reflect.get(target, prop, receiver);
        }
        // TODO: 暂时只处理第一层对象的function响应
        if (target !== getOrigin(rootProxyRef!) && isFunction(Reflect.get(target, prop, receiver))) {
          return Reflect.get(target, prop, receiver);
        }

        const { value } = execute(handlers.get, target, prop, receiver);
        if (isObject(value) || isFunction(value)) {
          return this.proxyObject(value, rootProxyRef);
        }
        return value;
      },
      set: (target, prop, newValue, receiver) => {
        if (isSymbol(prop)) {
          return Reflect.set(target, prop, newValue, receiver);
        }
        const prevValue = target[prop];
        // 简单判断解决重复赋值
        if (prevValue === newValue) {
          return true;
        }
        const { value } = execute(handlers.set, target, prop, newValue, receiver);
        return value;
      },
      ownKeys: target => {
        const { value } = execute(handlers.ownKeys, target);
        return value;
      },
      deleteProperty: (target, prop) => {
        const { value } = execute(handlers.delete, target, prop);
        return value;
      },
      apply: (target, thisArg, argArray) => {
        if (!isFunction(target)) {
          return false;
        }
        const { value } = execute(handlers.apply, target, thisArg, argArray, rootProxyRef);
        return value;
      },
    };
    debug('执行代理方法', this.scopeName, initObj);
    const { value } = execute(handlers.init, initObj, handler);
    const proxyObject = value;
    // 双缓存
    targetProxyCache.set(initObj, proxyObject);
    proxyTargetCache.set(proxyObject, initObj);

    // 保存根对象用来修改函数的this
    if (rootProxyRef === undefined) {
      rootProxyRef = proxyObject;
    }

    return proxyObject;
  }
}

export type { Config, Proxied, CoreMiddleware };

export { getOrigin, getCoreInstance, ITERATION_KEY };

export default Core;
