const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { logger } = require('../config/logger');

class TemplateService {
	constructor(baseDir) {
		this.baseDir = baseDir || path.join(__dirname, '..', 'templates');
		this.cache = new Map();
	}

	resolve(templatePath) {
		return path.isAbsolute(templatePath)
			? templatePath
			: path.join(this.baseDir, templatePath);
	}

	loadTemplate(templatePath) {
		const absolutePath = this.resolve(templatePath);
		if (this.cache.has(absolutePath)) {
			return this.cache.get(absolutePath);
		}
		const source = fs.readFileSync(absolutePath, 'utf8');
		const compiled = handlebars.compile(source, { noEscape: true });
		this.cache.set(absolutePath, compiled);
		return compiled;
	}

	render(templatePath, variables) {
		try {
			const compiled = this.loadTemplate(templatePath);
			return compiled(variables || {});
		} catch (error) {
			logger.error('Template rendering failed', { error: error.message, templatePath });
			throw error;
		}
	}
}

module.exports = TemplateService;


