# jamsocket
A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [jamsocket](#jamsocket)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g jamsocket
$ jamsocket COMMAND
running command...
$ jamsocket (--version)
jamsocket/0.0.4 darwin-arm64 node-v16.13.2
$ jamsocket --help [COMMAND]
USAGE
  $ jamsocket COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`jamsocket hello PERSON`](#jamsocket-hello-person)
* [`jamsocket hello:world`](#jamsocket-helloworld)
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)
* [`jamsocket plugins`](#jamsocket-plugins)
* [`jamsocket plugins:inspect PLUGIN...`](#jamsocket-pluginsinspect-plugin)
* [`jamsocket plugins:install PLUGIN...`](#jamsocket-pluginsinstall-plugin)
* [`jamsocket plugins:link PLUGIN`](#jamsocket-pluginslink-plugin)
* [`jamsocket plugins:uninstall PLUGIN...`](#jamsocket-pluginsuninstall-plugin)
* [`jamsocket plugins:update`](#jamsocket-pluginsupdate)

## `jamsocket hello PERSON`

Say hello

```
USAGE
  $ jamsocket hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Whom is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.4/dist/commands/hello/index.ts)_

## `jamsocket hello:world`

Say hello world

```
USAGE
  $ jamsocket hello:world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [dist/commands/hello/world.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.4/dist/commands/hello/world.ts)_

## `jamsocket help [COMMAND]`

Display help for jamsocket.

```
USAGE
  $ jamsocket help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for jamsocket.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.11/src/commands/help.ts)_

## `jamsocket plugins`

List installed plugins.

```
USAGE
  $ jamsocket plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ jamsocket plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

## `jamsocket plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ jamsocket plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ jamsocket plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/inspect.ts)_

## `jamsocket plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ jamsocket plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ jamsocket plugins:add

EXAMPLES
  $ jamsocket plugins:install myplugin 

  $ jamsocket plugins:install https://github.com/someuser/someplugin

  $ jamsocket plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/install.ts)_

## `jamsocket plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ jamsocket plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ jamsocket plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/link.ts)_

## `jamsocket plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ jamsocket plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ jamsocket plugins:unlink
  $ jamsocket plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/uninstall.ts)_

## `jamsocket plugins:update`

Update installed plugins.

```
USAGE
  $ jamsocket plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/update.ts)_
<!-- commandsstop -->
