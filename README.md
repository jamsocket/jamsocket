# jamsocket
A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g jamsocket-cli
$ jamsocket COMMAND
running command...
$ jamsocket (--version)
jamsocket-cli/0.0.3 darwin-arm64 node-v16.13.2
$ jamsocket --help [COMMAND]
USAGE
  $ jamsocket COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`jamsocket hello PERSON`](#jamsocket-hello-person)
* [`jamsocket hello world`](#jamsocket-hello-world)
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)

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

_See code: [dist/commands/hello/index.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.0/dist/commands/hello/index.ts)_

## `jamsocket hello world`

Say hello world

```
USAGE
  $ jamsocket hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

<!-- commandsstop -->
