let http = require("http");
let exec = require("shelljs").exec;
let fs = require("fs");

const PORT = 6474;
const cmds = {
  "/webhook": [
    "cd /var/bot/webhook",
    "git pull",
    "npm i",
    "pm2 restart bot_webhook"
  ],
  "/web-interface": [
    "cd /var/www",
    "git pull",
    "npm i",
    "pm2 restart www"
  ],
  "/extension-builder": function(requestJson) {
    let targetBranch = requestJson.ref.replace("refs/heads/", "");
    switch (targetBranch) {
      case "master":
        return [
          "cd /var/extension-builder/master",
          "git pull",
          "docker stop extension-builder || true",
          "docker rm extension-builder || true",
          "docker build . -t extension-builder",
          "docker run -d -p 8048:8048 --restart unless-stopped --name=\"extension-builder\" extension-builder"
        ];
      case "dev":
        return [
          "cd /var/extension-builder/dev",
          "git pull",
          "docker stop extension-builder-dev || true",
          "docker rm extension-builder-dev || true",
          "docker build . -t extension-builder-dev",
          "docker run -d -p 8049:8048 --restart unless-stopped --name=\"extension-builder-dev\" extension-builder-dev"
        ];
      default:
        return "echo branch not accepted";
    }
  },
  "/ListViewGenerator": function(requestJson) {
    let targetBranch = requestJson.ref.replace("refs/heads/", "");
    switch (targetBranch) {
      case "vue-ts":
        return [
          "cd /var/ListViewGenerator/src/",
          "git pull",
          "docker build -t lvg .",
          "docker stop lvg || true",
          "docker rm lvg || true",
          "docker create --name lvg lvg",
          "cd /var/ListViewGenerator/gh-pages",
          "find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name 'CNAME' -exec rm -rf {} \\;",
          "docker cp lvg:/usr/app/dist .",
          "mv dist/* .",
          "rm -rf dist",
          "git add . --all",
          "git commit -m \"Auto-build by webhook: " + requestJson.after + "\"",
          "git push"
        ];
      default:
        return "echo branch not accepted";
    }
  },
  "/tinywebdb-php-vue/release": function(requestJson) {
    if (requestJson.action !== 'published') {
      return 'echo [TPV-release] ignore release action: ' + requestJson.action;
    }
    let targetTag = requestJson.release.tag_name;
    return [
      "cd /var/tinywebdb-php-vue/master",
      "git fetch",
      "git checkout " + targetTag,
      "git submodule update --init",
      "docker build -t tpv-" + targetTag + " .",
      "docker create --name tpv_temp_container tpv-" + targetTag,
      "docker cp tpv_temp_container:/usr/app/dist.tar.gz .",
      "docker rm tpv_temp_container",
      // require `npm i -g tar-to-zip`
      "tar2zip dist.tar.gz",
      // require `npm i -g github-release-cli`
      "github-release upload --owner ColinTree --repo tinywebdb-php-vue --tag \"" + targetTag + "\" dist.tar.gz dist.zip"
    ];
  },
  "/mit-cml/appinventor-sources": [
    "cd /var/mit-cml/appinventor-sources",
    "git checkout master",
    "git pull",
    "git push gitee",
    "git checkout ucr",
    "git pull",
    "git push gitee"
  ],
  "/scify-crm": [
    "cd ~/IT-Project",
    "docker-compose pull",
    "docker-compose up -d"
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
      let cmd = null;
      for (let key in cmds) {
        if (key == request.url) {
          cmd = cmds[key];
          break;
        }
      }
      if (cmd != null) {
        if (typeof(cmd) == "function") {
          try {
            cmd = cmd(JSON.parse(content));
          } catch (e) {
            response.writeHead(500);
            response.end("Internal Error: " + e);
            return;
          }
        }
        if (typeof(cmd) == "string") {
          cmd = [ cmd ];
        }
        if (fs.existsSync("config.json")) {
          let json = JSON.parse(fs.readFileSync("config.json"));
          if (json.env) {
            for (let name in json.env) {
              cmd.unshift("export " + name + "=" + json.env[name]);
            }
          }
        }
        cmd = (cmd != undefined && Array.isArray(cmd)) ? cmd.join(" && ") : "echo ignoring wrong format of command";
        exec(cmd, function(err, out, code) {
          // process.stderr.write(err.toString());
          // process.stdout.write(out.toString());
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
