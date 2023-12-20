/* eslint-disable @typescript-eslint/ban-types */
const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

const isFunction = (value: unknown): value is Function => typeof value === 'function';

const isSymbol = (value: unknown): value is symbol => typeof value === 'symbol';

const isKeyOf = <T extends object>(key: any, obj: T): key is keyof T => key in obj;

function isProtoProperty(target: object, prop: string): boolean {
  // 存在该属性且该属性不在对象本身上，即为原型属性
  return Reflect.has(target, prop) && Reflect.getOwnPropertyDescriptor(target, prop) === undefined;
}
const debug = (...args: any[]) => {
  if (localStorage.getItem('uss_debugger') !== null) {
    console.log('uss info:', ...args);
  }
};

type Context = {
  value: any;
};

type Middleware = (context: Context, next: Middleware, ...args: any[]) => void;

const execute = (middlewares: Middleware[], ...args: any[]) => {
  const work = (ctx: Context) => {
    function dispatch(index: number) {
      const fn = middlewares[index];
      if (fn) {
        fn(ctx, () => dispatch(index + 1), ...args);
      }
    }
    dispatch(0);
  };
  const context = { value: null } as Context;
  work(context);
  return context;
};
export type { Context };

export { isObject, isFunction, isSymbol, isKeyOf, isProtoProperty, execute, debug };
