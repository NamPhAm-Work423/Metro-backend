const express = require('express');
const { register } = require('./config/metrics');
const { logger } = require('./config/logger');
const { requestLogger } = require('./config/logger');

class App {
	constructor() {
		this.app = express();
		this.configure();
		this.routes();
	}

	configure() {
		this.app.use(express.json());
		this.app.use(requestLogger);
	}

	routes() {
		this.app.get('/health', (req, res) => res.json({ status: 'ok' }));
		this.app.get('/metrics', async (req, res) => {
			try {
				res.set('Content-Type', register.contentType);
				res.end(await register.metrics());
			} catch (ex) {
				logger.error('Metrics endpoint failed', { error: ex.message });
				res.status(500).end(ex.message);
			}
		});
	}

	getApp() {
		return this.app;
	}
}

module.exports = App;


