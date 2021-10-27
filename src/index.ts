import * as path from 'path'
import { statSync } from 'fs'
import set from 'lodash.set'
import difference from 'lodash.difference'
import merge from './merge'
import { tryOrUndefined, resolveModule } from './utils'

const SERVERLESS = 'serverless'
const DIRNAME = 'imp:dirname'
const JS_EXTNAME = '.js'
const CONFIG_EXTNAMES = new Set(['.yml', '.yaml', JS_EXTNAME])

interface ImportedConfig {
  custom?: {
    [key: string]: object
  }
  functions?: {
    [key: string]: {
      handler?: string
    }
  }
}

interface ImportOptions {
  module: string
  inputs: any
}

interface BasedirOption {
  basedir: string
}

class ImportConfigPlugin {
  serverless: Serverless.Instance
  originalPlugins: string[]

  constructor(serverless: Serverless.Instance) {
    this.serverless = serverless
    this.originalPlugins = this.serverless.service.plugins?.slice() ?? []

    this.importConfigs(this.serverless.service, { basedir: this.serverless.serviceDir })
    this.loadImportedPlugins()
  }

  private getImports(config: ImportedConfig): string[] {
    const { import: imports } = config.custom || {}
    if (Array.isArray(imports)) return imports
    if (typeof imports === 'string' && imports) return [imports]
    return []
  }

  private importConfigs(config: ImportedConfig, { basedir }: BasedirOption) {
    this.getImports(config).forEach(pathToImport => this.importConfig(pathToImport, { basedir }))
  }

  private resolvePathToImport(pathToImport: string, { basedir }: BasedirOption): string {
    // pass if has config extension
    const correctedPathToImport = path.join(basedir, pathToImport)
    if (CONFIG_EXTNAMES.has(path.extname(correctedPathToImport))) {
      if (tryOrUndefined(() => statSync(correctedPathToImport))) {
        return correctedPathToImport
      }
      const resolved = tryOrUndefined(() => resolveModule(correctedPathToImport, { basedir }))
      if (resolved) {
        return resolved
      }
      throw new this.serverless.classes.Error(`Cannot import ${pathToImport}: the given file doesn't exist`)
    }

    // if directory look for config file
    const stats = tryOrUndefined(() => statSync(correctedPathToImport))
    if (stats?.isDirectory()) {
      const tries = []
      for (const configExtname of CONFIG_EXTNAMES) {
        const possibleFile = path.join(correctedPathToImport, SERVERLESS + configExtname)
        if (tryOrUndefined(() => statSync(possibleFile))) {
          return possibleFile
        }
        tries.push(possibleFile)
      }
      throw new this.serverless.classes.Error(`Cannot import ${pathToImport}: `
        + 'in the given directory no serverless config can be found\n'
        + `Tried: \n - ${tries.join('\n - ')}`)
    }

    // try to resolve as a module
    const tries = []
    for (const configExtname of CONFIG_EXTNAMES) {
      const possibleFile = path.join(pathToImport, SERVERLESS + configExtname)
      const resolved = tryOrUndefined(() => resolveModule(possibleFile, { basedir }))
      if (resolved) {
        return resolved
      }
      tries.push(possibleFile)
    }
    throw new this.serverless.classes.Error(`Cannot import ${pathToImport}: `
      + 'the given module cannot be resolved\n'
      + `Tried: \n - ${tries.join('\n - ')}`)
  }

  private prepareImportedConfig(options: { importPath: string, config: ImportedConfig }) {
    const { variables, serviceDir } = this.serverless
    const { importPath, config } = options

    // make all function handlers relative to the imported config file
    const { functions } = config
    const importDir = path.relative(serviceDir, path.dirname(importPath))
    const toPosixPath = (location: string) => location.split(path.sep).join(path.posix.sep);
    if (functions != null) {
      Object.values(functions).forEach(func => {
        if (typeof func.handler === 'string') {
          func.handler = toPosixPath(path.join(importDir, func.handler));
        }
      })
    }

    // replace all ${dirname} by the imported config file dirname
    variables.loadVariableSyntax()
    const properties = variables.getProperties(config, true, config)
    properties
      .filter(({ value }: { value: any }) => typeof value === 'string' && value.match(variables.variableSyntax))
      .map(property => ({ property, matches: variables.getMatches(property.value) }))
      .filter(({ matches }) => Array.isArray(matches))
      .forEach(({ property, matches }) => {
        matches!
          .filter(({ variable }) => variable === DIRNAME)
          .forEach(({ match }) => {
            const newValue = property.value.replace(match, importDir)
            set(config, property.path, newValue)
          })
      })
  }

  private importConfig(options: ImportOptions | string, { basedir }: BasedirOption) {
    const isFullOptions = typeof options === 'object' && options != null
    const realOptions = isFullOptions ? <ImportOptions>options : { module: options as string, inputs: {} }
    const { module: pathToImport, inputs } = realOptions

    this.serverless.cli.log(`Importing ${pathToImport}`)
    const importPath = this.resolvePathToImport(pathToImport, { basedir })
    let config: object
    try {
      if (path.extname(importPath) === JS_EXTNAME) {
        const importExports = require(importPath)
        const importFunction = typeof importExports === 'function'
          ? importExports
          : importExports?.default
        config = importFunction(inputs)
      } else {
        config = this.serverless.utils.readFileSync(importPath)
      }
      this.prepareImportedConfig({ importPath, config })
      this.importConfigs(config, { basedir: path.dirname(importPath) })
    } catch (error) {
      throw new this.serverless.classes.Error(`Error: Cannot import ${pathToImport}\nCause: ${error.message}`)
    }
    merge(this.serverless.service, config)
  }

  private loadImportedPlugins() {
    const { pluginManager } = this.serverless

    const newPlugins = difference(this.serverless.service.plugins, this.originalPlugins)

    if (typeof pluginManager.loadServicePlugins === 'function') {
      pluginManager.loadServicePlugins(newPlugins)
    } else {
      pluginManager.resolveServicePlugins!(newPlugins)
        .filter(Boolean)
        .forEach(plugin => pluginManager.addPlugin!(plugin))
    }
  }
}

module.exports = ImportConfigPlugin
