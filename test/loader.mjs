// Resolve hook so node --test can import src/ modules directly.
//
// The app is built by Vite, which resolves extensionless relative imports
// ('../state/quizStore'); plain Node ESM does not. Rewriting every src import
// to carry .js just to please the test runner would churn the whole codebase
// for zero product benefit — this hook teaches the runner Vite's rule instead.
// async, and awaited: nextResolve returns a promise in the hooks worker, so a
// synchronous try/catch never sees its rejection and the miss escapes uncaught.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (
      err.code === 'ERR_MODULE_NOT_FOUND' &&
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      return nextResolve(specifier + '.js', context)
    }
    throw err
  }
}
