const cron = require('node-cron');
const cronParser = require('cron-parser');
const { logger } = require('../config/logger');

class JobRegistry {
  constructor(options = {}) {
    this.timezone = options.timezone || 'Asia/Ho_Chi_Minh';
    this.jobs = new Map();
    this.enabled = true;
  }

  registerJob({ jobId, cronExpr, handler, description }) {
    if (!jobId || !cronExpr || typeof handler !== 'function') {
      throw new Error('Invalid job definition');
    }

    if (this.jobs.has(jobId)) {
      this.removeJob(jobId);
    }

    const state = {
      jobId,
      cronExpr,
      handler,
      description: description || '',
      enabled: true,
      running: false,
      lastRun: null,
      lastSuccess: null,
      lastError: null,
      durations: [],
      averageDurationMs: 0,
      cronTask: null
    };

    const cronTask = cron.schedule(
      cronExpr,
      async () => {
        await this.runJob(jobId, 'scheduled');
      },
      { scheduled: false, timezone: this.timezone }
    );

    state.cronTask = cronTask;
    cronTask.start();
    this.jobs.set(jobId, state);
    logger.info('Job registered', { jobId, cron: cronExpr });
  }

  async runJob(jobId, trigger = 'manual', force = false) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (!this.enabled || !job.enabled) return { success: false, message: 'Job disabled' };
    if (job.running && !force) return { success: false, message: 'Job already running' };

    job.running = true;
    job.lastRun = new Date().toISOString();
    const start = Date.now();
    try {
      await job.handler();
      const duration = Date.now() - start;
      job.durations.push(duration);
      if (job.durations.length > 20) job.durations.shift();
      job.averageDurationMs = Math.round(job.durations.reduce((a,b)=>a+b,0) / job.durations.length);
      job.lastSuccess = new Date().toISOString();
      job.lastError = null;
      logger.info('Job completed', { jobId, trigger, duration });
      return { success: true, duration };
    } catch (error) {
      const duration = Date.now() - start;
      job.lastError = `${error.message}`;
      logger.error('Job failed', { jobId, trigger, duration, error: error.message });
      return { success: false, error: error.message, duration };
    } finally {
      job.running = false;
    }
  }

  updateJob(jobId, { cronExpr, enabled }) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (typeof enabled === 'boolean') job.enabled = enabled;
    if (cronExpr) {
      try {
        if (job.cronTask) job.cronTask.stop();
        job.cronTask = cron.schedule(cronExpr, async () => {
          await this.runJob(jobId, 'scheduled');
        }, { scheduled: false, timezone: this.timezone });
        job.cronTask.start();
        job.cronExpr = cronExpr;
      } catch (e) {
        throw new Error('Invalid cron expression');
      }
    }
  }

  removeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job?.cronTask) job.cronTask.stop();
    this.jobs.delete(jobId);
  }

  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return {
      jobId: job.jobId,
      cron: job.cronExpr,
      enabled: job.enabled,
      running: job.running,
      lastRun: job.lastRun,
      lastSuccess: job.lastSuccess,
      lastError: job.lastError,
      averageDurationMs: job.averageDurationMs,
      nextRun: this.getNextRunTime(job.cronExpr),
      description: job.description,
      successRate: this.getSuccessRate(job)
    };
  }

  listJobs() {
    return Array.from(this.jobs.keys()).map((id) => this.getJobStatus(id));
  }

  getNextRunTime(cronExpr) {
    try {
      const interval = cronParser.parseExpression(cronExpr, { tz: this.timezone });
      return interval.next().toDate().toISOString();
    } catch (e) {
      return null;
    }
  }

  getSuccessRate(job) {
    // approximate by counting last 20 durations and lastError presence
    const runs = job.durations.length;
    if (runs === 0) return '0%';
    const failures = job.lastError ? 1 : 0; // lightweight placeholder
    const successRate = Math.max(0, Math.round(((runs - failures) / runs) * 100));
    return `${successRate}%`;
  }

  startAll() {
    this.enabled = true;
    for (const job of this.jobs.values()) {
      if (job.cronTask) job.cronTask.start();
    }
  }

  stopAll() {
    this.enabled = false;
    for (const job of this.jobs.values()) {
      if (job.cronTask) job.cronTask.stop();
    }
  }
}

module.exports = JobRegistry;



