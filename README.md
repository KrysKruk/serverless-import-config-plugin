# Serverless Import Config Plugin

The Serverless Framework doesn't give possibility to import and merge multiple `serverless.yml` config files.
This plugin gives possibility to split main config file into smaller YAML files.

## Installation

Install with **npm**:
```sh
npm install --save-dev serverless-import-config-plugin
```

And then add the plugin to your `serverless.yml` file:
```yaml
plugins:
  - serverless-import-config-plugin
```

## Usage

Specify config files to import in `custom.import` list:
```yaml
custom:
  import:
    - ./path/to/serverless.yml # path to YAML file with serverless config
    - ./path/to/dir # directory where serverless.yml can be find
    - module-name # node module where serverless.yml can be find
    - '@myproject/users-api' # monorepo package with serverless.yml config file
    - module-name/custom-serverless.yml # path to custom config file of a node module
```

`custom.import` can be also a string, when only one file needs to be imported:
```yaml
custom:
  import: '@myproject/users-api'
```

## Relative paths

All function handler paths are automatically prefixed by the imported config directory.
```yaml
functions:
  postOrder:
    handler: functions/postOrder.handler # relative to the imported config
```

For other fields you need to use `${dirname}` variable manually.
`${dirname}` points to a directory of imported config file.
```yaml
custom:
  webpack:
    webpackConfig: ${dirname}/webpack.config.js
```
