jamsocket
=========

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)
[![Downloads/week](https://img.shields.io/npm/dw/jamsocket)](https://npmjs.org/package/jamsocket)
[![License](https://img.shields.io/npm/l/jamsocket)](https://github.com/drifting-in-space/jamsocket-cli/blob/main/LICENSE)

# Install

You may run the Jamsocket CLI without explicitly installing it using `npx jamsocket`. However, this may lead to CLI-version-related issues as [NPX is not guaranteed to run the latest version](https://github.com/npm/cli/issues/4108) and will instead use whatever version was cached with the first usage. For this reason it is recommended that you install the Jamsocket CLI in your project with `npm install jamsocket` first and _then_ use `npx jamsocket`. (When run from your project, this will use the locally-installed `jamsocket`.) You may also install the Jamsocket CLI globally, but it is recommended you use a tool like [Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating) to manage your NodeJS binaries. NVM makes sure these binaries are installed under your user so global npm installs do not require root privileges. Once NVM is set up, run `npm install jamsocket --global`.

# Upgrading

```sh
npm install jamsocket@latest # to update the locally-installed Jamsocket
npm install jamsocket@latest --global # to update the global installation of Jamsocket
```

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
* [`jamsocket token create SERVICE`](#jamsocket-token-create-service)
* [`jamsocket token revoke TOKEN`](#jamsocket-token-revoke-token)
* [`jamsocket token spawn TOKEN`](#jamsocket-token-spawn-token)

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

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

_See code: [dist/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.15/dist/commands/login.ts)_

## `jamsocket logout`

Logs out of Jamsocket and removes locally-stored credentials.

```
USAGE
  $ jamsocket logout

DESCRIPTION
  Logs out of Jamsocket and removes locally-stored credentials.

EXAMPLES
  $ jamsocket logout
```

_See code: [dist/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.15/dist/commands/logout.ts)_

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

_See code: [dist/commands/logs.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.15/dist/commands/logs.ts)_

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

_See code: [dist/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.15/dist/commands/push.ts)_

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
  $ jamsocket spawn [SERVICE] [-e <value>] [-g <value>] [-p <value>] [-t <value>]

FLAGS
  -e, --env=<value>...  optional environment variables to pass to the container
  -g, --grace=<value>   optional grace period (in seconds) to wait after last connection is closed before shutting down
                        container
  -p, --port=<value>    optional port for jamsocket to proxy requests to (default is 8080)
  -t, --tag=<value>     optional tag for the service to spawn (default is latest)

DESCRIPTION
  Spawns a session-lived application backend from the provided docker image

EXAMPLES
  $ jamsocket spawn my-service

  $ jamsocket spawn my-service -p 8080

  $ jamsocket spawn my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket spawn my-service -g 60

  $ jamsocket spawn my-service -t latest
```

_See code: [dist/commands/spawn.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.0.15/dist/commands/spawn.ts)_

## `jamsocket token create SERVICE`

Generate a token that can be used to spawn the given service.

```
USAGE
  $ jamsocket token create [SERVICE] [-g <value>] [-p <value>] [-t <value>]

FLAGS
  -g, --grace=<value>  optional grace period (in seconds) to wait after last connection is closed before shutting down
                       container
  -p, --port=<value>   optional port for jamsocket to proxy requests to (default is 8080)
  -t, --tag=<value>    optional tag for the service to spawn (default is latest)

DESCRIPTION
  Generate a token that can be used to spawn the given service.

EXAMPLES
  $ jamsocket token create my-service

  $ jamsocket token create my-service --port 8080

  $ jamsocket token create my-service --tag latest --port 8080 --grace 300
```

## `jamsocket token revoke TOKEN`

Revoke a token permanently.

```
USAGE
  $ jamsocket token revoke [TOKEN]

DESCRIPTION
  Revoke a token permanently.

EXAMPLES
  $ jamsocket token revoke jNCuGvecEEk706SDm2xYRJc7mqplE2
```

## `jamsocket token spawn TOKEN`

Spawn a backend using a token.

```
USAGE
  $ jamsocket token spawn [TOKEN]

DESCRIPTION
  Spawn a backend using a token.

EXAMPLES
  $ jamsocket token spawn jNCuGvecEEk706SDm2xYRJc7mqplE2
```
<!-- commandsstop -->
