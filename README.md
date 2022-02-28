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
* [`jamsocket logs BACKEND`](#jamsocket-logs-backend)
* [`jamsocket push SERVICE IMAGE`](#jamsocket-push-service-image)
* [`jamsocket service create NAME`](#jamsocket-service-create-name)
* [`jamsocket service list`](#jamsocket-service-list)
* [`jamsocket spawn SERVICE`](#jamsocket-spawn-service)

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

_See code: [dist/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.10/dist/commands/login.ts)_

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

_See code: [dist/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.10/dist/commands/logout.ts)_

## `jamsocket logs BACKEND`

Stream logs from a running backend.

```
USAGE
  $ jamsocket logs [BACKEND]

ARGUMENTS
  BACKEND  The name of the backend, a random string of letters and numbers returned by the spawn command.

DESCRIPTION
  Stream logs from a running backend.

EXAMPLES
  $ jamsocket logs f7em2
```

_See code: [dist/commands/logs.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.10/dist/commands/logs.ts)_

## `jamsocket push SERVICE IMAGE`

Pushes a docker image to the jamcr.io container registry under your logged in user's name

```
USAGE
  $ jamsocket push [SERVICE] [IMAGE] [-t <value>]

ARGUMENTS
  SERVICE  Jamsocket service to push the image to
  IMAGE    Docker image to push

FLAGS
  -t, --tag=<value>  optional tag to apply to the image in the jamsocket registry

DESCRIPTION
  Pushes a docker image to the jamcr.io container registry under your logged in user's name

EXAMPLES
  $ jamsocket push my-service my-image

  $ jamsocket push my-service my-image -t my-tag
```

_See code: [dist/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.10/dist/commands/push.ts)_

## `jamsocket service create NAME`

Creates a service

```
USAGE
  $ jamsocket service create [NAME]

DESCRIPTION
  Creates a service

EXAMPLES
  $ jamsocket service create my-service
```

## `jamsocket service list`

List services for the logged-in user

```
USAGE
  $ jamsocket service list

DESCRIPTION
  List services for the logged-in user

EXAMPLES
  $ jamsocket service list
```

## `jamsocket spawn SERVICE`

Spawns a session-lived application backend from the provided docker image

```
USAGE
  $ jamsocket spawn [SERVICE] [-e <value>] [-p <value>] [-t <value>]

FLAGS
  -e, --env=<value>   optional JSON object of environment variables to pass to the container
  -p, --port=<value>  port for jamsocket to send requests to (default is 8080)
  -t, --tag=<value>   optional tag for the service to spawn (default is latest)

DESCRIPTION
  Spawns a session-lived application backend from the provided docker image

EXAMPLES
  $ jamsocket spawn my-service

  $ jamsocket spawn my-service -p 8080

  $ jamsocket spawn my-service -e='{"SOME_ENV_VAR": "foo"}'

  $ jamsocket spawn my-service -t latest
```

_See code: [dist/commands/spawn.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.10/dist/commands/spawn.ts)_
<!-- commandsstop -->
