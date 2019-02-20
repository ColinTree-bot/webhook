let webhook = require("./webhook");
let schedule = require("./utils/schedule");

webhook.start();

schedule.schedule({
  name: "syncAppinventorSources",
  rule: { minute: 0 },
  callback() {
    exec(webhook.cmds["/mit-cml/appinventor-sources"].join(" && "));
  }
});