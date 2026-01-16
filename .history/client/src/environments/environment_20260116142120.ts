declare function require(moduleName: string): any;
export const environment = {
  version: require('../../package.json').version,
  production: false,
  apiEndpoint: null,
  apiPort: 1882,
  serverEnabled: true,
  type: null
};
