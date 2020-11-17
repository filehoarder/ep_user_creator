ep_user_creator
==============-

This etherpad plugin adds a website to the admin backend to create new users identified by file-based ep_hash_auth. New users are created by a custom script defined in settings.json.

settings.json:
..
  "ep_user_creator": {
    "createCommand": "./create.py",
    "createArgs": "-t %t -m %m -d %d",
    "optionalCreateArgs": {
    }
..
