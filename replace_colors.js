const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = {
    '#16A34A': '#48d23c', // primary green
    '#22C55E': '#48d23c',
    '#15803D': '#22973a', // dark green
    '#166534': '#22973a',
    '#14532D': '#22973a',
    '#064E3B': '#22973a',
    '#F0FDF4': '#f3feb0', // light green bg
    '#DCFCE7': '#f3feb0',
};

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            for (const [oldColor, newColor] of Object.entries(replacements)) {
                // global case-insensitive replace 
                const regex = new RegExp(oldColor, 'gi');
                if (regex.test(content)) {
                    content = content.replace(regex, newColor);
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated colors in ${fullPath}`);
            }
        }
    }
}

processDirectory(directoryPath);
console.log('Color replacement complete in customer-app');
