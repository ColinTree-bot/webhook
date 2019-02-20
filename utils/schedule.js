let schedule = require("node-schedule");

const jobPool = {}

/**
 * start a job, param job should be an object that includes:
 * * name - a string
 * * rule - a cron style string/object
 * * callback - a function
 * @param job
 */
module.exports.schedule = function(job) {
  if (! jobPool.hasOwnProperty(job.name)) {
    jobPool[job.name] = schedule.scheduleJob(job.rule, job.callback);
  }
}
module.exports.cancel = function(name) {
  if (jobPool.hasOwnProperty(name)) {
    jobPool[name].cancel();
    delete jobPool[name];
  }
}