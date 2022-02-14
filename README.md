jamsocket
=========

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)
[![Downloads/week](https://img.shields.io/npm/dw/jamsocket)](https://npmjs.org/package/jamsocket)
[![License](https://img.shields.io/npm/l/jamsocket)](https://github.com/drifting-in-space/jamsocket-cli/blob/main/LICENSE)

# Commands
<!-- commands -->
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)
* [`jamsocket login`](#jamsocket-login)
* [`jamsocket logout`](#jamsocket-logout)
* [`jamsocket push IMAGE`](#jamsocket-push-image)
* [`jamsocket spawn [IMAGE]`](#jamsocket-spawn-image)

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

## `jamsocket login`

Authenticates user with jamcr.io container registery

```
USAGE
  $ jamsocket login

DESCRIPTION
  Authenticates user with jamcr.io container registery

EXAMPLES
  $ jamsocket login
```

_See code: [dist/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.9/dist/commands/login.ts)_

## `jamsocket logout`

Logs out of jamcr.io container registry and removes locally-stored credentials.

```
USAGE
  $ jamsocket logout

DESCRIPTION
  Logs out of jamcr.io container registry and removes locally-stored credentials.

EXAMPLES
  $ jamsocket logout
```

_See code: [dist/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.9/dist/commands/logout.ts)_

## `jamsocket push IMAGE`

Pushes a docker image to the jamcr.io container registry under your logged in user's name

```
USAGE
  $ jamsocket push [IMAGE] [-t <value>]

ARGUMENTS
  IMAGE  Docker image to push to jamcr.io

FLAGS
  -t, --tag=<value>  optional tag to apply to the docker image

DESCRIPTION
  Pushes a docker image to the jamcr.io container registry under your logged in user's name

EXAMPLES
  $ jamsocket push 33fe99c5649e -t my-image
```

_See code: [dist/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.9/dist/commands/push.ts)_

## `jamsocket spawn [IMAGE]`

Spawns a session-lived application backend from the provided docker image

```
USAGE
  $ jamsocket spawn [IMAGE] [-e <value>] [-p <value>]

FLAGS
  -e, --env=<value>   optional JSON object of environment variables to pass to the container
  -p, --port=<value>  port for jamsocket to send requests to (default is 8080)

DESCRIPTION
  Spawns a session-lived application backend from the provided docker image

EXAMPLES
  $ jamsocket spawn my-image -e='{"PORT":8080}'
```

_See code: [dist/commands/spawn.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.9/dist/commands/spawn.ts)_
<!-- commandsstop -->
