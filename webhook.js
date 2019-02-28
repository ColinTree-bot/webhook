let http = require("http");
let exec = require("shelljs").exec;

const PORT = 6474;
const cmds = {
  "/webhook": [
    "cd /var/bot/webhook",
    "git pull",
    "pm2 restart bot_webhook"
  ],
  "/extension-builder": function(requestJson) {
    let targetBranch = requestJson.ref.replace("refs/heads/", "");
    if (targetBranch == "dev") {
      return [
        "cd /var/extension-builder/dev",
        "git pull",
        "docker stop extension-builder-dev",
        "docker rm extension-builder-dev",
        "docker build . -t extension-builder-dev",
        "docker run -d -p 8049:8048 extension-builder-dev"
      ]
    }
  },
  "/mit-cml/appinventor-sources": [
    "cd /var/mit-cml/appinventor-sources",
    "git checkout master",
    "git pull",
    "git push gitee",
    "git checkout ucr",
    "git pull",
    "git push gitee"
  ]
}

module.exports.cmds = cmds;
module.exports.start = function() {
  let deployServer = http.createServer(function(request, response) {
    let content = "";

    request.on('data', function(chunk) {
      content += chunk;
    });

    request.on('end', function() {
      let inCMDs = false;
      let cmd = "";
      for (let key in cmds) {
        if (key == request.url) {
          inCMDs = true;
          cmd = cmds[key];
          break;
        }
      }
      if (inCMDs) {
        if (typeof(cmd) == "function") {
          cmd = cmd(JSON.parse(content));
        }
        if (typeof(cmd) == "string") {
          cmd = [ cmd ];
        }
        exec(cmd.join(" && "), function(err, out, code) {
          process.stderr.write(err.toString());
          process.stdout.write(out.toString());
        });
        response.writeHead(200);
        response.end("Deploy Started.");
      } else {
        response.writeHead(404);
        response.end("Not found");
      }
    });
  });
  console.log("listening port at: " + PORT);
  deployServer.listen(PORT);
}