import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

// const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/main.js',
    output: [{
        file: 'public/js/lib/dateFns/2.25.0/dateFns.js',
        name: 'dateFns',
        format: 'iife',
        sourcemap: true
    }, {
        file: 'public/js/lib/dateFns/2.25.0/dateFns.min.js',
        name: 'dateFns',
        format: 'iife',
        sourcemap: true,
        plugins: [terser()]
    }],
    plugins: [
        resolve(),
        commonjs()
    ]
};