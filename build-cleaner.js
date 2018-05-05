"use strict";

const fs = require('fs');
const path = require('path');

// List of packages to create to wire up NPM publication.
const packages = require('./subpackages.js');

packages.list.forEach((packageName) => {
    const packagePath = path.resolve(__dirname, packageName);
    if (fs.existsSync(packagePath)) {
        fs.readdirSync(packagePath).forEach((file, index) => {
            fs.unlinkSync(path.resolve(packagePath, file));
        });
        fs.rmdirSync(packagePath);
    }
});