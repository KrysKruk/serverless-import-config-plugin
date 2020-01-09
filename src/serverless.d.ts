declare class ServerlessError {
  constructor(message: string)
}

interface ServerlessPlugin {}

interface VariableProperty {
  path: string[]
  value: string
}

interface VariableMatch {
  match: string
  variable: string
}

declare namespace Serverless {
  interface Instance {
    service: {
      plugins?: string[]
      custom?: {
        [key: string]: object
      }
    }

    utils: {
      readFileSync: (path: string) => object
    }

    cli: {
      log(str: string): void
    }

    classes: {
      Error: { new(message: string): ServerlessError }
    }

    variables: {
      variableSyntax: RegExp
      loadVariableSyntax: () => void
      getProperties: (root: object, onRoot: boolean, current: object) => VariableProperty[]
      getMatches: (value: string) => VariableMatch[] | undefined
    }

    pluginManager: {
      loadServicePlugins?: (plugins: string[]) => void
      resolveServicePlugins?: (plugins: string[]) => ServerlessPlugin[]
      addPlugin?: (plugin: ServerlessPlugin) => void
    }
  }
}
