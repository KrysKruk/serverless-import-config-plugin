import resolve from 'resolve'

export const isObject = (value: unknown) => typeof value === 'object' && value != null

export const tryOrUndefined = <T>(func: () => T): T | undefined => {
  try {
    return func()
  } catch (error) {
    return undefined
  }
}

// some plugins like serverless-webpack have issues with paths comes from outside of main project
// which is a popular case for monorepo like Lerna; we need to preserve symlinks to make them works;
// require.resolve is not used here because it doesn't support preserveSymlinks flag yet
export const resolveModule = (id: string, { basedir }: { basedir: string }) =>
  resolve.sync(id, { basedir, preserveSymlinks: true })
