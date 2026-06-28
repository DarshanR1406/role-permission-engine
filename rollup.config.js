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
  // 3. Next.js App Router Middleware Entrypoint
  {
    input: 'src/middleware/next.js',
    external: ['next/server', '../utils/checkPermission'],
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
        file: 'dist/middleware.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/middleware.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
  // 4. Vue SDK Entrypoint
  {
    input: 'src/vue/index.js',
    external: ['vue'],
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
        file: 'dist/vue.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/vue.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
  // 5. Angular SDK Entrypoint
  {
    input: 'src/angular/index.js',
    external: ['@angular/core', '@angular/router'],
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
        file: 'dist/angular.cjs.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/angular.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
];

export default config;

