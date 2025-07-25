import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

export default [
    // ES Modules build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.module,
            format: 'esm',
            sourcemap: true,
        },
        external: ['axios'],
        plugins: [
            resolve({
                preferBuiltins: true,
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                exclude: ['**/*.test.ts', '**/*.spec.ts'],
            }),
        ],
    },
    // CommonJS build
    {
        input: 'src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
            sourcemap: true,
            exports: 'auto',
        },
        external: ['axios'],
        plugins: [
            resolve({
                preferBuiltins: true,
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                exclude: ['**/*.test.ts', '**/*.spec.ts'],
            }),
        ],
    },
    // Type definitions
    {
        input: 'src/index.ts',
        output: {
            file: pkg.types,
            format: 'esm',
        },
        plugins: [dts()],
    },
];