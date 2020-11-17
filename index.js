var eejs = require("ep_etherpad-lite/node/eejs/"),
  async = require("ep_etherpad-lite/node_modules/async");

var crypto = require("crypto");

var fs = require("fs");

var child_process = require("child_process");

var url = require("url");

var settings = require("ep_etherpad-lite/node/utils/Settings");

var hash_typ = "sha512";
var hash_dig = "hex";
var hash_dir = "/var/etherpad/users";
var hash_ext = "/.hash";
var displayname_ext = "/.displayname";

if (settings.ep_hash_auth) {
  if (settings.ep_hash_auth.hash_typ) hash_typ = settings.ep_hash_auth.hash_typ;
  if (settings.ep_hash_auth.hash_dig) hash_dig = settings.ep_hash_auth.hash_dig;
  if (settings.ep_hash_auth.hash_dir) hash_dir = settings.ep_hash_auth.hash_dir;
  if (settings.ep_hash_auth.hash_ext) hash_ext = settings.ep_hash_auth.hash_ext;
  if (settings.ep_hash_auth.displayname_ext) displayname_ext = settings.ep_hash_auth.displayname_ext;
}

exports.eejsBlock_adminMenu = function (hook_name, args, cb) {
  args.content =
    args.content + eejs.require("ep_user_creator/templates/menu.html");
  return cb();
};

exports.registerRoute = function (hook_name, args, cb) {
  args.app.get("/admin/create_user_page", function (req, res) {
    async.series([
      function (callback) {
        res.send(eejs.require("ep_user_creator/templates/form.html"));
        callback();
      },
    ]);
  });

  args.app.post("/admin/create_user", function (req, res) {
    contents = "";
    req.on("data", async function (data) {
      contents += data;
    });

    req.on("end", async function () {
      try {
        var parsed = JSON.parse(contents);
      } catch (err) {
        console.log(err, contents, parsed);
        res.status(400).send();
        return;
      }

      if (parsed.fullname && parsed.username && parsed.email) {
        createUser(res, req, parsed);
      } else {
        console.log("body is not complete:" + parsed);
        res.status(400).send();
      }
    });
  });
};

function createUser(res, req, user) {
  if (!(settings.ep_user_creator.createCommand && settings.ep_user_creator.createArgs)) {
    // create hash by hand
    var userDir = hash_dir + "/" + user.username;

    try {
      fs.mkdirSync(userDir);
    } catch (err) {
      console.log(user.username + " does exist: " + err);
      res.status(500).send();
    }

    var password = crypto.randomBytes(6).toString("base64");

    var hash = crypto.createHash(hash_typ).update(password).digest(hash_dig);
    var hashFile = userDir + "/" + hash_ext;
    var displaynameFile = userDir + "/" + displayname_ext;

    try {
      fs.writeFileSync(hashFile, hash);
      fs.writeFileSync(displaynameFile, user.fullname);

      //sendmail with password here
      console.log("new password for testing purposes: " + password);

      res.status(204).send();
    } catch (err) {
      console.log(err);
      res.status(501).send();
    }
  } else {
    // use create script
    var cmd = settings.ep_user_creator.createCommand;
    var args = settings.ep_user_creator.createArgs
      .replace('%m', user.email)
      .replace('%d', user.fullname);
    if (req.subdomains) {
      var teamPadName = req.subdomains[0];
    } else {
      var teamPadName = req.baseUrl;
    }
    console.log("teamPadName should be: " + teamPadName);
    var args = args.replace('%t', teamPadName);
    child_process.exec(cmd + ' ' + args, (err, stdout, stderr) => {
      console.log("exec " + cmd);
      if (err) {
	console.log("err: " + err);
      }
      if (stdout) {
	console.log("stdout: " + stdout);
      }
      if (stderr) {
	console.log("stderr: " + stderr);
      }
    });
  }

}
