# Jamsocket CLI

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)

# Install

We recommend you use `npx jamsocket` to run the Jamsocket CLI without explicitly installing it. You may also install it locally within a project using `npm install jamsocket`.

# Authentication

Run `npx jamsocket login`.

If you want to use the Jamsocket CLI from an automated environment (e.g. a CI/CD pipeline), you can authenticate with an access token by running `npx jamsocket login --token [ACCESS_TOKEN]`. You can manage and generate access tokens from the [Jamsocket Settings page](https://app.jamsocket.com/settings).

# Commands
<!-- commands -->
* [`jamsocket backend info BACKEND`](#jamsocket-backend-info-backend)
* [`jamsocket backend list`](#jamsocket-backend-list)
* [`jamsocket backend logs BACKEND`](#jamsocket-backend-logs-backend)
* [`jamsocket backend metrics BACKEND`](#jamsocket-backend-metrics-backend)
* [`jamsocket backend terminate BACKENDS`](#jamsocket-backend-terminate-backends)
* [`jamsocket dev`](#jamsocket-dev)
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)
* [`jamsocket images SERVICE`](#jamsocket-images-service)
* [`jamsocket login`](#jamsocket-login)
* [`jamsocket logout`](#jamsocket-logout)
* [`jamsocket logs BACKEND`](#jamsocket-logs-backend)
* [`jamsocket push SERVICE IMAGE`](#jamsocket-push-service-image)
* [`jamsocket service create NAME`](#jamsocket-service-create-name)
* [`jamsocket service delete NAME`](#jamsocket-service-delete-name)
* [`jamsocket service images SERVICE`](#jamsocket-service-images-service)
* [`jamsocket service info NAME`](#jamsocket-service-info-name)
* [`jamsocket service list`](#jamsocket-service-list)
* [`jamsocket service spawn SERVICE`](#jamsocket-service-spawn-service)
* [`jamsocket service use-image SERVICE`](#jamsocket-service-use-image-service)
* [`jamsocket spawn SERVICE`](#jamsocket-spawn-service)
* [`jamsocket terminate BACKENDS`](#jamsocket-terminate-backends)

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

## `jamsocket backend terminate BACKENDS`

Terminates one or more backends given the backend name(s).

```
USAGE
  $ jamsocket backend terminate [BACKENDS]

DESCRIPTION
  Terminates one or more backends given the backend name(s).

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket backend terminate abc123 def456 ...
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

_See code: [src/commands/dev.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.8.0-beta/src/commands/dev.ts)_

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

## `jamsocket images SERVICE`

List uploaded images for a given service (limited to 50 most recent images)

```
USAGE
  $ jamsocket images [SERVICE]

DESCRIPTION
  List uploaded images for a given service (limited to 50 most recent images)

ALIASES
  $ jamsocket images

EXAMPLES
  $ jamsocket images my-service
```

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

_See code: [src/commands/login.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.8.0-beta/src/commands/login.ts)_

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

_See code: [src/commands/logout.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.8.0-beta/src/commands/logout.ts)_

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

_See code: [src/commands/push.ts](https://github.com/drifting-in-space/jamsocket-cli/blob/v0.8.0-beta/src/commands/push.ts)_

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

## `jamsocket service images SERVICE`

List uploaded images for a given service (limited to 50 most recent images)

```
USAGE
  $ jamsocket service images [SERVICE]

DESCRIPTION
  List uploaded images for a given service (limited to 50 most recent images)

ALIASES
  $ jamsocket images

EXAMPLES
  $ jamsocket service images my-service
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

## `jamsocket service spawn SERVICE`

Spawns a session backend with the provided service/environment's docker image.

```
USAGE
  $ jamsocket service spawn [SERVICE] [-e <value>] [-g <value>] [-t <value>] [-r] [-l <value>]

ARGUMENTS
  SERVICE  Name of service/environment to spawn. (Providing the environment is optional if service only has one
           environment, otherwise it is required)

FLAGS
  -e, --env=<value>...        optional environment variables to pass to the container
  -g, --grace=<value>         optional grace period (in seconds) to wait after last connection is closed before shutting
                              down container (default is 300)
  -l, --lock=<value>          optional lock to spawn the service with
  -r, --require-bearer-token  require a bearer token to access the service. A random bearer token will be generated and
                              returned in the result.
  -t, --tag=<value>           optional image tag or digest for the service to spawn

DESCRIPTION
  Spawns a session backend with the provided service/environment's docker image.

ALIASES
  $ jamsocket spawn

EXAMPLES
  $ jamsocket service spawn my-service

  $ jamsocket service spawn my-service/prod

  $ jamsocket service spawn my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket service spawn my-service -g 60

  $ jamsocket service spawn my-service -t latest
```

## `jamsocket service use-image SERVICE`

Sets the image tag or digest to use when spawning a service/environment

```
USAGE
  $ jamsocket service use-image [SERVICE] -i <value>

ARGUMENTS
  SERVICE  Name of service/environment whose image should be updated. If only a service is provided, the "default"
           environment is used.

FLAGS
  -i, --image=<value>  (required) image tag or digest for the service/environment to use (Run `jamsocket images` for a
                       list of images you can use.)

DESCRIPTION
  Sets the image tag or digest to use when spawning a service/environment

EXAMPLES
  $ jamsocket service use-image my-service -i latest

  $ jamsocket service use-image my-service/prod -i sha256:1234abcd
```

## `jamsocket spawn SERVICE`

Spawns a session backend with the provided service/environment's docker image.

```
USAGE
  $ jamsocket spawn [SERVICE] [-e <value>] [-g <value>] [-t <value>] [-r] [-l <value>]

ARGUMENTS
  SERVICE  Name of service/environment to spawn. (Providing the environment is optional if service only has one
           environment, otherwise it is required)

FLAGS
  -e, --env=<value>...        optional environment variables to pass to the container
  -g, --grace=<value>         optional grace period (in seconds) to wait after last connection is closed before shutting
                              down container (default is 300)
  -l, --lock=<value>          optional lock to spawn the service with
  -r, --require-bearer-token  require a bearer token to access the service. A random bearer token will be generated and
                              returned in the result.
  -t, --tag=<value>           optional image tag or digest for the service to spawn

DESCRIPTION
  Spawns a session backend with the provided service/environment's docker image.

ALIASES
  $ jamsocket spawn

EXAMPLES
  $ jamsocket spawn my-service

  $ jamsocket spawn my-service/prod

  $ jamsocket spawn my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket spawn my-service -g 60

  $ jamsocket spawn my-service -t latest
```

## `jamsocket terminate BACKENDS`

Terminates one or more backends given the backend name(s).

```
USAGE
  $ jamsocket terminate [BACKENDS]

DESCRIPTION
  Terminates one or more backends given the backend name(s).

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket terminate abc123 def456 ...
```
<!-- commandsstop -->
