const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const TEMP_DIR = path.join(__dirname, 'temp');
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');

// Ensure temp directory exists and is empty on startup
fs.emptyDirSync(TEMP_DIR);
// Ensure templates file exists and every template has a stable id.
// This also migrates old files that were created without `id`.
const ensureTemplatesFile = () => {
    const defaultTemplates = [
        { id: uuidv4(), name: "Basic Equation", latex: "E = mc^2" },
        { id: uuidv4(), name: "Fraction", latex: "\\frac{a}{b}" }
    ];

    try {
        if (!fs.existsSync(TEMPLATES_FILE)) {
            fs.writeJsonSync(TEMPLATES_FILE, defaultTemplates);
            return;
        }

        const existing = fs.readJsonSync(TEMPLATES_FILE);

        if (!Array.isArray(existing)) {
            // Unexpected shape -> reset to defaults
            fs.writeJsonSync(TEMPLATES_FILE, defaultTemplates);
            return;
        }

        let changed = false;
        const normalized = existing.map(t => {
            if (!t.id) {
                changed = true;
                return { ...t, id: uuidv4() };
            }
            return t;
        });

        if (changed) {
            fs.writeJsonSync(TEMPLATES_FILE, normalized);
        }
    } catch (e) {
        // If something goes wrong, fall back to a fresh default file
        fs.writeJsonSync(TEMPLATES_FILE, defaultTemplates);
    }
};

ensureTemplatesFile();

// Helper to run command
const runCommand = (cmd, args, cwd) => {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd, shell: true });
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject({ code, stdout, stderr });
            }
        });
    });
};

app.post('/api/compile', async (req, res) => {
    const { latex, format = 'png', color = '#000000', bgColor = 'transparent', dpi = 300, isFullMode = false } = req.body;
    const id = uuidv4();
    const texFile = path.join(TEMP_DIR, `${id}.tex`);

    // Convert hex color to HTML model for xcolor if needed, or just pass it.
    const cleanColor = color.replace('#', '');

    let texContent;
    if (isFullMode) {
        texContent = latex;
    } else {
        texContent = `
\\documentclass[preview]{standalone}
\\usepackage{amsmath,amssymb,amsfonts, mathtools}
\\usepackage{xcolor}
\\begin{document}
\\color[HTML]{${cleanColor}}
$ ${latex} $
\\end{document}
        `;
    }

    try {
        await fs.writeFile(texFile, texContent);

        // 1. Compile to DVI
        // latex -interaction=nonstopmode -output-directory=temp temp/<id>.tex
        try {
            await runCommand('latex', ['-interaction=nonstopmode', `-output-directory=${TEMP_DIR}`, texFile], TEMP_DIR);
        } catch (err) {
            // Read log file for better error message
            const logFile = path.join(TEMP_DIR, `${id}.log`);
            let logContent = '';
            if (fs.existsSync(logFile)) {
                logContent = await fs.readFile(logFile, 'utf8');
            }
            // Extract error lines (lines starting with !)
            const errorLines = logContent.split('\n').filter(line => line.startsWith('!')).join('\n');
            throw new Error(errorLines || err.stderr || 'Compilation failed');
        }

        const dviFile = path.join(TEMP_DIR, `${id}.dvi`);
        let outputFile;
        let mimeType;

        if (format === 'svg') {
            outputFile = path.join(TEMP_DIR, `${id}.svg`);
            // dvisvgm
            // --no-fonts to convert text to paths (better for standalone usage without font deps)
            // If bgColor is not transparent, we might need to add a rect. 
            // But dvisvgm doesn't have a simple bg flag like dvipng.
            // We can rely on the frontend to set the background of the SVG container, 
            // or we can wrap the latex in a colorbox if needed.
            // For now, we'll produce transparent SVG (default) and let frontend handle BG.
            await runCommand('dvisvgm', ['--no-fonts', '-o', outputFile, dviFile], TEMP_DIR);
            mimeType = 'image/svg+xml';
        } else {
            outputFile = path.join(TEMP_DIR, `${id}.png`);
            // dvipng
            // -D dpi
            // -bg Transparent (or color)
            // -T tight (crop)
            const bgArg = bgColor === 'transparent' ? 'Transparent' : bgColor;
            await runCommand('dvipng', ['-T', 'tight', '-D', dpi, '-bg', bgArg, '-o', outputFile, dviFile], TEMP_DIR);
            mimeType = 'image/png';
        }

        const imageBuffer = await fs.readFile(outputFile);
        const base64 = imageBuffer.toString('base64');

        // Cleanup
        // await fs.remove(path.join(TEMP_DIR, `${id}.*`)); // Careful with glob in fs-extra, better delete specific files
        const filesToDelete = [`${id}.tex`, `${id}.dvi`, `${id}.log`, `${id}.aux`, path.basename(outputFile)];
        filesToDelete.forEach(f => fs.remove(path.join(TEMP_DIR, f)).catch(() => { }));

        res.json({ success: true, image: `data:${mimeType};base64,${base64}` });

    } catch (error) {
        console.error("Compilation error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/templates', async (req, res) => {
    try {
        const templates = await fs.readJson(TEMPLATES_FILE);
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/templates', async (req, res) => {
    try {
        const { name, latex } = req.body;
        const templates = await fs.readJson(TEMPLATES_FILE);
        templates.push({ name, latex, id: uuidv4() });
        await fs.writeJson(TEMPLATES_FILE, templates);
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let templates = await fs.readJson(TEMPLATES_FILE);
        templates = templates.filter(t => t.id !== id);
        await fs.writeJson(TEMPLATES_FILE, templates);
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
