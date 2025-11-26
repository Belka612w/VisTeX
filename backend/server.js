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

const isTransparent = (value) => typeof value === 'string' && value.trim().toLowerCase() === 'transparent';

const parseHexColor = (value) => {
    if (typeof value !== 'string') return null;
    const hex = value.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const normalized = hex.toUpperCase();
    return {
        hex: normalized,
        css: `#${normalized}`,
        r,
        g,
        b,
    };
};

const toUnitInterval = (component) => {
    const unit = (component / 255).toFixed(3);
    return unit.replace(/\.?0+$/, '') || '0';
};

const formatDvipngColor = (color) => {
    if (!color) return 'Transparent';
    return `rgb ${toUnitInterval(color.r)} ${toUnitInterval(color.g)} ${toUnitInterval(color.b)}`;
};

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

const applyTemplatePlaceholders = (template, replacements) => {
    return Object.entries(replacements).reduce((acc, [key, value]) => {
        if (typeof value === 'undefined' || value === null) {
            return acc;
        }
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        return acc.replace(regex, () => value);
    }, template);
};

app.post('/api/compile', async (req, res) => {
    const {
        latex,
        format = 'png',
        color = '#000000',
        bgColor = 'transparent',
        dpi = 300,
        isFullMode = false,
        isTikzMode = false,
        customTemplate,
    } = req.body;
    const id = uuidv4();
    const texFile = path.join(TEMP_DIR, `${id}.tex`);

    const parsedColor = parseHexColor(color) || parseHexColor('#000000');
    const parsedBgColor = isTransparent(bgColor) ? null : parseHexColor(bgColor);
    const textColorHtml = parsedColor.hex;
    const bgColorHtml = parsedBgColor ? parsedBgColor.hex : '';
    const bgColorCss = parsedBgColor ? parsedBgColor.css : '';
    const bgColorCssForSvg = parsedBgColor ? parsedBgColor.css : 'transparent';
    const backgroundCommand = parsedBgColor ? `\\pagecolor[HTML]{${bgColorHtml}}` : '';

    const customTemplateSource = typeof customTemplate === 'string' ? customTemplate : '';
    const hasCustomTemplate = customTemplateSource.trim().length > 0;

    const templateReplacements = {
        LATEX: latex,
        COLOR: textColorHtml,
        COLOR_HEX: parsedColor.css,
        BG_COLOR: bgColorHtml,
        BG_COLOR_HEX: bgColorCss,
        BG_COLOR_DVIPNG: parsedBgColor ? formatDvipngColor(parsedBgColor) : '',
        BG_COLOR_COMMAND: backgroundCommand,
    };

    let texContent;
    if (hasCustomTemplate) {
        texContent = applyTemplatePlaceholders(customTemplateSource, templateReplacements);
    } else if (isFullMode) {
        texContent = latex;
    } else if (isTikzMode) {
        texContent = `
\\documentclass[tikz,border=2mm]{standalone}
\\usepackage{amsmath,amssymb,amsfonts, mathtools}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta}
\\begin{document}
${backgroundCommand}
\\color[HTML]{${textColorHtml}}
${latex}
\\end{document}
        `;
    } else {
        texContent = `
\\documentclass[preview]{standalone}
\\usepackage{amsmath,amssymb,amsfonts, mathtools}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta}
\\begin{document}
${backgroundCommand}
\\color[HTML]{${textColorHtml}}
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

        const outputFormat = isTikzMode ? 'svg' : format;

        if (outputFormat === 'svg') {
            outputFile = path.join(TEMP_DIR, `${id}.svg`);
            // dvisvgm
            // --no-fonts to convert text to paths (better for standalone usage without font deps)
            // Background color is injected manually below when requested.
            await runCommand('dvisvgm', ['--no-fonts', '-o', outputFile, dviFile], TEMP_DIR);
            mimeType = 'image/svg+xml';
        } else {
            outputFile = path.join(TEMP_DIR, `${id}.png`);
            // dvipng
            // -D dpi
            // -bg Transparent (or color)
            // -T tight (crop)
            const bgArg = formatDvipngColor(parsedBgColor);
            await runCommand('dvipng', ['-T', 'tight', '-D', dpi, '-bg', bgArg, '-o', outputFile, dviFile], TEMP_DIR);
            mimeType = 'image/png';
        }

        if (outputFormat === 'svg' && parsedBgColor) {
            const svgContent = await fs.readFile(outputFile, 'utf8');
            const bgRect = `<rect width="100%" height="100%" fill="${bgColorCssForSvg}" />`;
            const updatedSvg = svgContent.replace(/(<svg[^>]*>)/i, `$1${bgRect}`);
            await fs.writeFile(outputFile, updatedSvg, 'utf8');
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
