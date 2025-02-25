/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { version as grpcVersion } from '@grpc/grpc-js/package.json';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import replace from 'rollup-plugin-replace';
import { terser } from 'rollup-plugin-terser';
import typescriptPlugin from 'rollup-plugin-typescript2';
import tmp from 'tmp';
import typescript from 'typescript';

import { generateBuildTargetReplaceConfig } from '../../scripts/build/rollup_replace_build_target';

import pkg from './package.json';

const util = require('./rollup.shared');

// Customize how import.meta.url is polyfilled in cjs nodejs build. We use it to be able to use require() in esm.
// It only generates the nodejs version of the polyfill, as opposed to the default polyfill which
// supports both browser and nodejs. The browser support is unnecessary and doesn't work well with Jest. See https://github.com/firebase/firebase-js-sdk/issues/5687
function importMetaUrlPolyfillPlugin() {
  return {
    name: 'import-meta-url-current-module',
    resolveImportMeta(property, { moduleId }) {
      if (property === 'url') {
        // copied from rollup output
        return `new (require('url').URL)('file:' + __filename).href`;
      }
      return null;
    }
  };
}

const nodePlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: false,
      transformers: [util.removeAssertTransformer]
    }),
    json({ preferConst: true }),
    // Needed as we also use the *.proto files
    copy({
      targets: [
        {
          src: 'src/protos',
          dest: 'dist/src'
        }
      ]
    }),
    replace({
      'process.env.FIRESTORE_PROTO_ROOT': JSON.stringify('src/protos'),
      '__GRPC_VERSION__': grpcVersion
    })
  ];
};

const browserPlugins = function () {
  return [
    typescriptPlugin({
      typescript,
      tsconfigOverride: {
        compilerOptions: {
          target: 'es2017'
        }
      },
      cacheDir: tmp.dirSync(),
      abortOnError: false,
      transformers: [util.removeAssertAndPrefixInternalTransformer]
    }),
    json({ preferConst: true }),
    terser(util.manglePrivatePropertiesOptions)
  ];
};

const allBuilds = [
  // Intermidiate Node ESM build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.node.ts',
    output: {
      file: pkg['main-esm'],
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('node')), ...nodePlugins()],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    },
    onwarn: util.onwarn
  },
  // Node CJS build
  {
    input: pkg['main-esm'],
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ false),
      replace(generateBuildTargetReplaceConfig('cjs', 2017)),
      importMetaUrlPolyfillPlugin()
    ],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Node ESM build with build target reporting
  {
    input: pkg['main-esm'],
    output: {
      file: pkg['main-esm'],
      format: 'es',
      sourcemap: true
    },
    plugins: [replace(generateBuildTargetReplaceConfig('esm', 2017))],
    external: util.resolveNodeExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Intermidiate browser build without build target reporting
  // this is an intermidiate build used to generate the actual esm and cjs builds
  // which add build target reporting
  {
    input: './src/index.ts',
    output: {
      file: pkg.browser,
      format: 'es',
      sourcemap: true
    },
    plugins: [alias(util.generateAliasConfig('browser')), ...browserPlugins()],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // Convert es2017 build to ES5
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['esm5'],
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ...util.es2017ToEs5Plugins(/* mangled= */ true),
      replace(generateBuildTargetReplaceConfig('esm', 5))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // es2017 build with build target reporting
  {
    input: pkg['browser'],
    output: [
      {
        file: pkg['browser'],
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [replace(generateBuildTargetReplaceConfig('esm', 2017))],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  },
  // RN build
  {
    input: './src/index.rn.ts',
    output: {
      file: pkg['react-native'],
      format: 'es',
      sourcemap: true
    },
    plugins: [
      alias(util.generateAliasConfig('rn')),
      ...browserPlugins(),
      replace(generateBuildTargetReplaceConfig('esm', 2017))
    ],
    external: util.resolveBrowserExterns,
    treeshake: {
      moduleSideEffects: false
    }
  }
];

export default allBuilds;
