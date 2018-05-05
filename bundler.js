"use strict";

const fs = require('fs');
const path = require('path');

// List of packages to create to wire up NPM publication.
const packages = require('./subpackages.js');

packages.list.forEach((packageName) => {
    const packagePath = path.resolve(__dirname, packageName);
    if (!fs.existsSync(packagePath)) {
        fs.mkdirSync(packagePath);
    }

    fs.writeFileSync(
        path.resolve(packagePath, 'index.js'),
        ` "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        function __export(m) {
            for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
        }
        __export(require("../dist/${packageName}.js"));
        `
    );

    fs.writeFileSync(
        path.resolve(packagePath, 'index.d.ts'),
        `export * from '../dist/${packageName}';`
    );
});