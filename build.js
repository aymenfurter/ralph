const esbuild = require('esbuild');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const outDir = 'out';
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'out/extension.js',
        external: ['vscode'], // Exclude vscode API from bundle
        format: 'cjs',        // Use CommonJS for Node/VS Code
        platform: 'node',
        sourcemap: !production,
        minify: production,
        logLevel: 'info'
    });

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
