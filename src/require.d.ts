// The optional-native-dep channels use a literal `require("...")` on purpose: Metro must see
// it statically to bundle the module (a `__require`/dynamic form is skipped and fails at
// runtime). Declare the ambient `require` so the .d.ts build type-checks without @types/node.
declare function require(moduleName: string): any;
