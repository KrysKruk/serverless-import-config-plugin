# Serverless Import Config Plugin

Split your `serverless.yaml` config file into smaller modules and import them.

By using this plugin you can build your serverless config from smaller parts separated by functionalities.
Imported config is merged, so all keys are supported and lists are concatenated (without duplicates).

Works on importing yaml files by path or node module, especially useful in multi-package repositories.

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

## Customizable boilerplates

In case you want to customize imported config in more dynamic way, provide it as javascript file (`serverless.js`).

```javascript
module.exports = ({ name, schema }) => ({
  provider: {
    iamRoleStatements: [
      // ...
    ],
  },
  // ...
})
```

You can pass arguments to the imported file using `module` and `inputs` fields:

```yaml
custom:
  import:
    - module: '@myproject/aws-dynamodb' # can be also a path to js file
      inputs:
        name: custom-table
        schema:
          # ...
```
