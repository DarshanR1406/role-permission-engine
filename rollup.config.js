// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

/** @type {import('rollup').RollupOptions[]} */
const config = [
  // 1. React SDK Entrypoint
  {
    input: 'src/index.js',
    external: ['react', 'react-dom', 'react-router-dom'],
    plugins: [
      resolve({ extensions: ['.js', '.jsx'] }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.jsx'],
        exclude: 'node_modules/**',
      }),
    ],
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
  // 2. Pure Utils Entrypoint (zero dependencies for backend/Node usage)
  {
    input: 'src/utils/checkPermission.js',
    external: [],
    plugins: [
      resolve({ extensions: ['.js'] }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js'],
        exclude: 'node_modules/**',
      }),
    ],
    output: [
      {
        file: 'dist/utils.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/utils.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
];

export default config;

