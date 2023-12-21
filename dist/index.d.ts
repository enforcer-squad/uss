declare class Core<T extends Config> {
	middlewares: Array<CoreMiddleware<T>>;
	handlers: Handlers<T>;
	proxyTargetCache: WeakMap<Proxied<T>, T>;
	targetProxyCache: WeakMap<T, Proxied<T>>;
	scopeName: string;
	constructor(middlewares: Array<CoreMiddleware<T>>, scopeName: string);
	initHandler(): void;
	updateMiddleware(type: keyof Handlers<T>, middleware: CoreMiddleware<T>): void;
	use(middleware: CoreMiddleware<T>): void;
	unUse(middleware: CoreMiddleware<T>): void;
	proxyObject(initObj: T, rootProxyRef?: Proxied<T>): Proxied<T>;
}
export declare const devtools: <T extends Config>(model: Proxied<T>, options?: DevToolOptions) => void;
export declare const effect: (tracker: DispatchFn) => void;
export declare const getOrigin: <T extends Config>(proxyObject: Proxied<T>) => T;
export declare const subscribe: <T extends Config>(_model: T, callback: SubscribeCallback) => () => void;
export declare const toRaw: <T extends Config>(model: Proxied<T>) => Proxied<T>;
export declare const useUSS: <T extends Config>(model: Proxied<T>, scopeName?: string) => Proxied<T>;
export declare const uss: <T extends Config>(initObj: T) => Proxied<T>;
export interface CoreMiddleware<T extends Config> {
	onGet?: GetMiddleware<T>;
	onSet?: SetMiddleware<T>;
	onOwnKeys?: OwnKeysMiddleware<T>;
	onDelete?: DeleteMiddleware<T>;
	onApply?: ApplyMiddleware<T>;
	onInit?: InitMiddleware<T>;
}
export type ApplyMiddleware<T extends Config> = (context: Context, next: ApplyMiddleware<T>, target: Function, thisArg: T | undefined, argArray: any[], rootProxyRef: Proxied<T>) => any;
export type Config = {
	key?: string;
	[key: string]: any;
};
export type Context = {
	value: any;
};
export type DeleteMiddleware<T extends Config> = (context: Context, next: DeleteMiddleware<T>, target: T, p: keyof T) => void;
export type DevToolOptions = {
	name?: string;
	interceptor?: <T extends Config>(model: T) => T;
};
export type DispatchFn = (...args: any[]) => void;
export type GetMiddleware<T extends Config> = (context: Context, next: GetMiddleware<T>, target: T, p: keyof T, receiver: any) => void;
export type Handlers<T extends Config> = {
	get: Array<GetMiddleware<T>>;
	set: Array<SetMiddleware<T>>;
	ownKeys: Array<OwnKeysMiddleware<T>>;
	delete: Array<DeleteMiddleware<T>>;
	apply: Array<ApplyMiddleware<T>>;
	init: Array<InitMiddleware<T>>;
};
export type InitMiddleware<T extends Config> = (context: Context, next: InitMiddleware<T>, target: T, handler: ProxyHandler<T>) => void;
export type OwnKeysMiddleware<T extends Config> = (context: Context, next: OwnKeysMiddleware<T>, target: T) => void;
export type Proxied<T extends Config> = T & {
	_NOTRACK_origin: T;
	_NOTRACK_core: Core<T>;
};
export type SetMiddleware<T extends Config> = (context: Context, next: SetMiddleware<T>, target: T, p: keyof T, newValue: any, receiver: any) => void;
export type SubscribeCallback = (path: string, value: any, prevValue: any) => void;

