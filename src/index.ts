import * as path from 'path'
import { statSync, realpathSync } from 'fs'
import set from 'lodash.set'
import difference from 'lodash.difference'
import merge from './merge'
import { tryOrUndefined, resolveModule } from './utils'

const SERVERLESS = 'serverless'
const DIRNAME = 'dirname'
const YAML_EXTNAMES = new Set(['.yml', '.yaml'])
const REALPATH = realpathSync('.')

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

class ImportConfigPlugin {
  serverless: Serverless.Instance
  originalPlugins: string[]

  constructor(serverless: Serverless.Instance) {
    this.serverless = serverless
    this.originalPlugins = this.serverless.service.plugins?.slice() ?? []

    this.importConfigs(this.serverless.service)
    this.loadImportedPlugins()
  }

  private getImports(config: ImportedConfig): string[] {
    const { import: imports } = config.custom || {}
    if (Array.isArray(imports)) return imports
    if (typeof imports === 'string' && imports) return [imports]
    return []
  }

  private importConfigs(config: ImportedConfig) {
    this.getImports(config).forEach(pathToImport => this.importConfig(pathToImport))
  }

  private resolvePathToImport(pathToImport: string): string {
    // pass if has yaml extension
    if (YAML_EXTNAMES.has(path.extname(pathToImport))) {
      if (tryOrUndefined(() => statSync(pathToImport))) {
        return pathToImport
      }
      const resolved = tryOrUndefined(() => resolveModule(pathToImport))
      if (resolved) {
        return resolved
      }
      throw new this.serverless.classes.Error(`Cannot import ${pathToImport}: the given file doesn't exist`)
    }

    // if directory, add serverless.yaml
    const stats = tryOrUndefined(() => statSync(pathToImport))
    if (stats?.isDirectory()) {
      const tries = []
      for (const yamlExtname of YAML_EXTNAMES) {
        const possibleFile = path.join(pathToImport, SERVERLESS + yamlExtname)
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
    for (const yamlExtname of YAML_EXTNAMES) {
      const possibleFile = path.join(pathToImport, SERVERLESS + yamlExtname)
      const resolved = tryOrUndefined(() => resolveModule(possibleFile))
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
    const { variables } = this.serverless
    const { importPath, config } = options

    // make all function handlers relative to the imported config file
    const { functions } = config
    const importDir = path.relative(REALPATH, path.dirname(importPath))
    if (functions != null) {
      Object.values(functions).forEach(func => {
        if (typeof func.handler === 'string') {
          func.handler = path.join(importDir, func.handler)
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

  private importConfig(pathToImport: string) {
    this.serverless.cli.log(`Importing ${pathToImport}`)
    const importPath = this.resolvePathToImport(pathToImport)
    let config: object
    try {
      config = this.serverless.utils.readFileSync(importPath)
      this.prepareImportedConfig({ importPath, config })
      this.importConfigs(config)
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
