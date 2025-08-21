const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { logger } = require('../config/logger');

/**
 * Template Service - handles template rendering using Handlebars
 * Implements caching and fallback mechanisms for template loading
 */
class TemplateService {
	constructor(baseDir) {
		this.baseDir = baseDir || path.join(__dirname, '..', 'templates');
		this.cache = new Map();
		this.cacheEnabled = process.env.NODE_ENV === 'production';
		this.registerHelpers();
	}

	/**
	 * Register common Handlebars helpers for templates
	 */
	registerHelpers() {
		handlebars.registerHelper('formatDate', (date, format) => {
			if (!date) return '';
			const d = new Date(date);
			return d.toLocaleDateString('en-US', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			});
		});

		handlebars.registerHelper('formatCurrency', (amount, currency = 'USD') => {
			if (!amount) return '';
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency
			}).format(amount);
		});

		handlebars.registerHelper('eq', (a, b) => a === b);
		handlebars.registerHelper('gt', (a, b) => a > b);
		handlebars.registerHelper('lt', (a, b) => a < b);
	}

	resolve(templatePath) {
		return path.isAbsolute(templatePath)
			? templatePath
			: path.join(this.baseDir, templatePath);
	}

	loadTemplate(templatePath) {
		const absolutePath = this.resolve(templatePath);
		
		// Check cache if caching is enabled
		if (this.cacheEnabled && this.cache.has(absolutePath)) {
			logger.debug('Template loaded from cache', { templatePath });
			return this.cache.get(absolutePath);
		}

		let source;
		let templateFilePath = absolutePath;
		
		try {
			logger.info('Loading template from filesystem', { absolutePath });
			source = fs.readFileSync(absolutePath, 'utf8');
		} catch (err) {
			// Try fallback paths for backwards compatibility
			const fallbackPaths = [
				path.join('email', 'auth_template', path.basename(templatePath)),
				path.join('templates', templatePath),
				templatePath.replace('.hbs', '.handlebars')
			];
			
			let loaded = false;
			for (const fallbackPath of fallbackPaths) {
				try {
					const fallbackAbsolutePath = this.resolve(fallbackPath);
					logger.warn('Primary template load failed, trying fallback', {
						error: err.message,
						absolutePath,
						fallbackPath: fallbackAbsolutePath
					});
					source = fs.readFileSync(fallbackAbsolutePath, 'utf8');
					templateFilePath = fallbackAbsolutePath;
					loaded = true;
					break;
				} catch (fallbackErr) {
					// Continue to next fallback
					logger.debug('Fallback template failed', { 
						fallbackPath: fallbackAbsolutePath,
						error: fallbackErr.message 
					});
				}
			}
			
			if (!loaded) {
				logger.error('Template not found in any location', {
					templatePath,
					absolutePath,
					fallbackPaths,
					error: err.message
				});
				throw new Error(`Template not found: ${templatePath}`);
			}
		}

		try {
			const compiled = handlebars.compile(source, { 
				noEscape: true,
				strict: false // Allow missing variables
			});
			
			// Cache the compiled template if caching is enabled
			if (this.cacheEnabled) {
				this.cache.set(absolutePath, compiled);
				logger.debug('Template cached', { templatePath });
			}
			
			return compiled;
		} catch (compileErr) {
			logger.error('Template compilation failed', {
				templatePath,
				templateFilePath,
				error: compileErr.message
			});
			throw new Error(`Template compilation failed for ${templatePath}: ${compileErr.message}`);
		}
	}

	render(templatePath, variables = {}) {
		try {
			logger.debug('Rendering template', { 
				templatePath, 
				variableKeys: Object.keys(variables) 
			});
			
			const compiled = this.loadTemplate(templatePath);
			const rendered = compiled(variables);
			
			logger.debug('Template rendered successfully', { 
				templatePath,
				contentLength: rendered.length 
			});
			
			return rendered;
		} catch (error) {
			logger.error('Template rendering failed', { 
				error: error.message, 
				templatePath,
				variableKeys: Object.keys(variables),
				stack: error.stack
			});
			throw error;
		}
	}

	/**
	 * Clear template cache - useful for development or when templates are updated
	 */
	clearCache() {
		const cacheSize = this.cache.size;
		this.cache.clear();
		logger.info('Template cache cleared', { previousSize: cacheSize });
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return {
			size: this.cache.size,
			enabled: this.cacheEnabled,
			keys: Array.from(this.cache.keys())
		};
	}
}

module.exports = TemplateService;


