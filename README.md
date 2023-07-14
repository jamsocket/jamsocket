# Jamsocket CLI

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)

# Install

You may run the Jamsocket CLI without explicitly installing it using `npx jamsocket`. However, this may lead to CLI-version-related issues as [NPX is not guaranteed to run the latest version](https://github.com/npm/cli/issues/4108) and will instead use whatever version was cached with the first usage.

For this reason it is recommended that you first install the Jamsocket CLI either globally or in your project and _then_ use `npx jamsocket`. (When running `npx jamsocket` from your project, the locally-installed `jamsocket` will be used.) When installing the Jamsocket CLI globally, it is recommended you use a tool like [Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating) to manage your NodeJS binaries. NVM makes sure these binaries are installed under your user so global npm installs do not require root privileges. Once NVM is set up, run `npm install jamsocket --global`.

# Upgrading

```sh
npm install jamsocket@latest # to update the locally-installed Jamsocket
npm install jamsocket@latest --global # to update the global installation of Jamsocket
```

# Authentication

Run `jamsocket login`.

If you want to use the Jamsocket CLI from an automated environment (e.g. a CI/CD pipeline), you can authenticate with an access token by running `jamsocket login --token [ACCESS_TOKEN]`. You can manage and generate access tokens from the [Jamsocket Settings page](https://app.jamsocket.com/settings).

# Commands
<!-- commands -->
* [`jamsocket backend info BACKEND`](#jamsocket-backend-info-backend)
* [`jamsocket backend list`](#jamsocket-backend-list)
* [`jamsocket backend logs BACKEND`](#jamsocket-backend-logs-backend)
* [`jamsocket backend metrics BACKEND`](#jamsocket-backend-metrics-backend)
* [`jamsocket backend terminate BACKEND`](#jamsocket-backend-terminate-backend)
* [`jamsocket dev`](#jamsocket-dev)
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)
* [`jamsocket login`](#jamsocket-login)
* [`jamsocket logout`](#jamsocket-logout)
* [`jamsocket logs BACKEND`](#jamsocket-logs-backend)
* [`jamsocket push SERVICE IMAGE`](#jamsocket-push-service-image)
* [`jamsocket service create NAME`](#jamsocket-service-create-name)
* [`jamsocket service delete NAME`](#jamsocket-service-delete-name)
* [`jamsocket service info NAME`](#jamsocket-service-info-name)
* [`jamsocket service list`](#jamsocket-service-list)
* [`jamsocket spawn SERVICE`](#jamsocket-spawn-service)
* [`jamsocket terminate BACKEND`](#jamsocket-terminate-backend)

## `jamsocket backend info BACKEND`

Retrieves information about a backend given its name.

```
USAGE
  $ jamsocket backend info [BACKEND]

DESCRIPTION
  Retrieves information about a backend given its name.

EXAMPLES
  $ jamsocket backend info a8m32q
```

## `jamsocket backend list`

List running backends for the logged-in user

```
USAGE
  $ jamsocket backend list

DESCRIPTION
  List running backends for the logged-in user

EXAMPLES
  $ jamsocket backend list
```

## `jamsocket backend logs BACKEND`

Stream logs from a running backend.

```
USAGE
  $ jamsocket backend logs [BACKEND]

ARGUMENTS
  BACKEND  The name of the backend, a random string of letters and numbers returned by the spawn command.

DESCRIPTION
  Stream logs from a running backend.

ALIASES
  $ jamsocket logs

EXAMPLES
  $ jamsocket backend logs f7em2
```

## `jamsocket backend metrics BACKEND`

Stream metrics from a running backend

```
USAGE
  $ jamsocket backend metrics [BACKEND]

ARGUMENTS
  BACKEND  The name of the backend, a random string of letters and numbers returned by the spawn command.

DESCRIPTION
  Stream metrics from a running backend

EXAMPLES
  $ jamsocket backend metrics f7em2
```

## `jamsocket backend terminate BACKEND`

Terminates a backend based on its backend name.

```
USAGE
  $ jamsocket backend terminate [BACKEND]

DESCRIPTION
  Terminates a backend based on its backend name.

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket backend terminate a8m32q
```

## `jamsocket dev`

(Experimental) Starts a jamsocket dev server.

```
USAGE
  $ jamsocket dev

DESCRIPTION
  (Experimental) Starts a jamsocket dev server.

EXAMPLES
  $ jamsocket dev
```

_See code: [src/commands/dev.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.6.5-1/src/commands/dev.ts)_

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

Authenticates user to the Jamsocket API.

```
USAGE
  $ jamsocket login [-t <value>]

FLAGS
  -t, --token=<value>  for automated environments, optional API token to log into the CLI with

DESCRIPTION
  Authenticates user to the Jamsocket API.

EXAMPLES
  $ jamsocket login
```

_See code: [src/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.6.5-1/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.6.5-1/src/commands/logout.ts)_

## `jamsocket logs BACKEND`

Stream logs from a running backend.

```
USAGE
  $ jamsocket logs [BACKEND]

ARGUMENTS
  BACKEND  The name of the backend, a random string of letters and numbers returned by the spawn command.

DESCRIPTION
  Stream logs from a running backend.

ALIASES
  $ jamsocket logs

EXAMPLES
  $ jamsocket logs f7em2
```

## `jamsocket push SERVICE IMAGE`

Pushes a docker image to the jamcr.io container registry under your logged in user's name.

```
USAGE
  $ jamsocket push [SERVICE] [IMAGE] [-t <value>]

ARGUMENTS
  SERVICE  Jamsocket service to push the image to
  IMAGE    Docker image to push

FLAGS
  -t, --tag=<value>  optional tag to apply to the image in the jamsocket registry

DESCRIPTION
  Pushes a docker image to the jamcr.io container registry under your logged in user's name.

EXAMPLES
  $ jamsocket push my-service my-image

  $ jamsocket push my-service my-image -t my-tag
```

_See code: [src/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.6.5-1/src/commands/push.ts)_

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

## `jamsocket service delete NAME`

Deletes a service

```
USAGE
  $ jamsocket service delete [NAME]

DESCRIPTION
  Deletes a service

EXAMPLES
  $ jamsocket service delete my-service
```

## `jamsocket service info NAME`

Gets some information about a service

```
USAGE
  $ jamsocket service info [NAME]

DESCRIPTION
  Gets some information about a service

EXAMPLES
  $ jamsocket service info my-service
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

Spawns a session backend from the provided docker image.

```
USAGE
  $ jamsocket spawn [SERVICE] [-e <value>] [-g <value>] [-t <value>] [-r] [-l <value>]

FLAGS
  -e, --env=<value>...        optional environment variables to pass to the container
  -g, --grace=<value>         optional grace period (in seconds) to wait after last connection is closed before shutting
                              down container
  -l, --lock=<value>          optional lock to spawn the service with
  -r, --require-bearer-token  require a bearer token to access the service. A random bearer token will be generated and
                              returned in the result.
  -t, --tag=<value>           optional tag for the service to spawn (default is latest)

DESCRIPTION
  Spawns a session backend from the provided docker image.

EXAMPLES
  $ jamsocket spawn my-service

  $ jamsocket spawn my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket spawn my-service -g 60

  $ jamsocket spawn my-service -t latest
```

_See code: [src/commands/spawn.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.6.5-1/src/commands/spawn.ts)_

## `jamsocket terminate BACKEND`

Terminates a backend based on its backend name.

```
USAGE
  $ jamsocket terminate [BACKEND]

DESCRIPTION
  Terminates a backend based on its backend name.

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket terminate a8m32q
```
<!-- commandsstop -->
