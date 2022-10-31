# Jamsocket CLI

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)

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
* [`jamsocket login [TOKEN]`](#jamsocket-login-token)
* [`jamsocket logout`](#jamsocket-logout)
* [`jamsocket logs BACKEND`](#jamsocket-logs-backend)
* [`jamsocket push SERVICE IMAGE`](#jamsocket-push-service-image)
* [`jamsocket service create NAME`](#jamsocket-service-create-name)
* [`jamsocket service list`](#jamsocket-service-list)
* [`jamsocket spawn SERVICE`](#jamsocket-spawn-service)
* [`jamsocket spawn-token create SERVICE`](#jamsocket-spawn-token-create-service)
* [`jamsocket spawn-token revoke TOKEN`](#jamsocket-spawn-token-revoke-token)
* [`jamsocket spawn-token spawn TOKEN`](#jamsocket-spawn-token-spawn-token)

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

## `jamsocket login [TOKEN]`

Authenticates user to the Jamsocket API with a token.

```
USAGE
  $ jamsocket login [TOKEN]

ARGUMENTS
  TOKEN  optional token to log into the CLI with

DESCRIPTION
  Authenticates user to the Jamsocket API with a token.

EXAMPLES
  $ jamsocket login

  $ jamsocket login W3guqHFk0FJdtquC.iDxcHZr4rg1AIWPxpnk0SWHm95Vfdl
```

_See code: [src/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.4.3/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.4.3/src/commands/logout.ts)_

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

_See code: [src/commands/logs.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.4.3/src/commands/logs.ts)_

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

_See code: [src/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.4.3/src/commands/push.ts)_

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
  $ jamsocket spawn [SERVICE] [-e <value>] [-g <value>] [-t <value>]

FLAGS
  -e, --env=<value>...  optional environment variables to pass to the container
  -g, --grace=<value>   optional grace period (in seconds) to wait after last connection is closed before shutting down
                        container
  -t, --tag=<value>     optional tag for the service to spawn (default is latest)

DESCRIPTION
  Spawns a session-lived application backend from the provided docker image

EXAMPLES
  $ jamsocket spawn my-service

  $ jamsocket spawn my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket spawn my-service -g 60

  $ jamsocket spawn my-service -t latest
```

_See code: [src/commands/spawn.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.4.3/src/commands/spawn.ts)_

## `jamsocket spawn-token create SERVICE`

Generate a token that can be used to spawn the given service.

```
USAGE
  $ jamsocket spawn-token create [SERVICE] [-g <value>] [-t <value>]

FLAGS
  -g, --grace=<value>  optional grace period (in seconds) to wait after last connection is closed before shutting down
                       container
  -t, --tag=<value>    optional tag for the service to spawn (default is latest)

DESCRIPTION
  Generate a token that can be used to spawn the given service.

EXAMPLES
  $ jamsocket spawn-token create my-service

  $ jamsocket spawn-token create my-service --tag latest --grace 300
```

## `jamsocket spawn-token revoke TOKEN`

Revoke a spawn token permanently.

```
USAGE
  $ jamsocket spawn-token revoke [TOKEN]

DESCRIPTION
  Revoke a spawn token permanently.

EXAMPLES
  $ jamsocket spawn-token revoke jNCuGvecEEk706SDm2xYRJc7mqplE2
```

## `jamsocket spawn-token spawn TOKEN`

Spawn a backend using a spawn token.

```
USAGE
  $ jamsocket spawn-token spawn [TOKEN]

DESCRIPTION
  Spawn a backend using a spawn token.

EXAMPLES
  $ jamsocket spawn-token spawn jNCuGvecEEk706SDm2xYRJc7mqplE2
```
<!-- commandsstop -->
