/* eslint-disable @typescript-eslint/no-explicit-any */
// The Target Constructor
class TargetClass {
  constructor(public name: string) {}

  sayHi(greeting: string): void {
    console.log(`E ${greeting}, I am ${this.name}`);
  }
}

// Define a type for a class constructor
type Constructor<T> = new (...args: any[]) => T;

const dontLogFunctions: string[] = [
  'get_visible',
  'get_transform',
  'get_alpha',
  'get_mask',
  'get_height',
  'get_bottom',
  'get_top',
  'get_x',
  'setPosition',
  'get_cacheAsBitmap',
  'get_includeInLayout',
  'hasEventListener',
  'get_time',
  'get_width',
  'get_left',
  'get_percentHeight',
  'get_y',
];

export const shadowHandler: (name: string) => ProxyHandler<Constructor<TargetClass>> = (name) => ({
  construct(target, args: any[], newTarget): object {
    if ((window as any).aviadlog) {
      console.log(`E [CONSTRUCT]: ${name} Creating ${target.name}`);
    }

    // Create the actual instance
    const instance = Reflect.construct(target, args, newTarget);

    // Return a Proxy of the instance to intercept method calls
    return new Proxy(instance, {
      get(obj: any, prop: string | symbol) {
        const value = obj[prop];

        if ((window as any).aviadlog) {
          if (typeof value === 'function') {
            const fname = String(prop);
            if (!fname.startsWith('__') && !dontLogFunctions.includes(fname)) {
              return (...methodArgs: any[]) => {
                console.log(`E [CALL]: ${name} Method "${String(prop)}" called with:`, methodArgs);
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                return value.apply(obj, methodArgs);
              };
            }
          }
        }
        return value;
      },
    });
  },
});

// // Create the Proxy with the original class type
// const ProxyConstructor = new Proxy(TargetClass, handler) as typeof TargetClass;

// // Usage
// const instance = new ProxyConstructor('ShadowInstance');
// instance.sayHi('Hello');
