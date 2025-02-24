# Jamsocket CLI

A CLI for the Jamsocket platform

[![Version](https://img.shields.io/npm/v/jamsocket)](https://npmjs.org/package/jamsocket)
[![Discord](https://img.shields.io/discord/939641163265232947)](https://discord.gg/N5sEpsuhh9)
![License](https://img.shields.io/github/license/jamsocket/jamsocket)

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
* [`jamsocket connect SERVICE`](#jamsocket-connect-service)
* [`jamsocket dev`](#jamsocket-dev)
* [`jamsocket help [COMMAND]`](#jamsocket-help-command)
* [`jamsocket images SERVICE`](#jamsocket-images-service)
* [`jamsocket login [ACCOUNT]`](#jamsocket-login-account)
* [`jamsocket logout`](#jamsocket-logout)
* [`jamsocket logs BACKEND`](#jamsocket-logs-backend)
* [`jamsocket push SERVICE [IMAGE]`](#jamsocket-push-service-image)
* [`jamsocket service connect SERVICE`](#jamsocket-service-connect-service)
* [`jamsocket service create SERVICE`](#jamsocket-service-create-service)
* [`jamsocket service delete SERVICE`](#jamsocket-service-delete-service)
* [`jamsocket service images SERVICE`](#jamsocket-service-images-service)
* [`jamsocket service info SERVICE`](#jamsocket-service-info-service)
* [`jamsocket service list`](#jamsocket-service-list)
* [`jamsocket service use-image SERVICE`](#jamsocket-service-use-image-service)
* [`jamsocket terminate BACKENDS`](#jamsocket-terminate-backends)

## `jamsocket backend info BACKEND`

Retrieves information about a backend given a Backend ID.

```
USAGE
  $ jamsocket backend info [BACKEND]

DESCRIPTION
  Retrieves information about a backend given a Backend ID.

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
  BACKEND  The backend ID, a random string of letters and numbers returned by the connect command.

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
  BACKEND  The backend ID, a random string of letters and numbers returned by the connect command.

DESCRIPTION
  Stream metrics from a running backend

EXAMPLES
  $ jamsocket backend metrics f7em2
```

## `jamsocket backend terminate BACKENDS`

Terminates one or more backends given the backend ID(s). To terminate all backends for a service, use the "terminate-all-backends" command.

```
USAGE
  $ jamsocket backend terminate [BACKENDS] [-f]

FLAGS
  -f, --force  whether to force the backend to hard terminate (defaults to false)

DESCRIPTION
  Terminates one or more backends given the backend ID(s). To terminate all backends for a service, use the
  "terminate-all-backends" command.

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket backend terminate abc123 def456 ...
```

## `jamsocket connect SERVICE`

Gets a URL that can be used to connect to a session backend. Will spawn a new session backend if no key (aka lock) is provided or if no session backend is currently holding the provided key.

```
USAGE
  $ jamsocket connect [SERVICE] [-e <value>] [-t <value>] [-c <value>] [-i <value>] [-l <value>] [-k <value>]
    [-u <value>] [-a <value>] [--spawn]

ARGUMENTS
  SERVICE  Name of service to spawn.

FLAGS
  -a, --auth=<value>                    Optional serialized JSON to be passed to a session backend when connecting with
                                        the returned URL/connection string.
  -c, --cluster=<value>                 The cluster to spawn the backend in (only relevant if you are running multiple
                                        clusters with Jamsocket).
  -e, --env=<value>...                  optional environment variables to pass to the container
  -i, --max-idle-seconds=<value>        The max time in seconds a session backend should wait after last connection is
                                        closed before shutting down container (default is 300)
  -k, --key=<value>                     If provided, fetches the session backend currently holding the given key
                                        (formerly known as a "lock"). If no session backend holds the key, or if a key
                                        is not provided, a new session backend will be spawned.
  -l, --lifetime-limit-seconds=<value>  The max time in seconds the session backend should be allowed to run.
  -t, --tag=<value>                     An optional image tag or image digest to use when spawning a backend.
  -u, --user=<value>                    Optional username to be associated with the URL/connection string returned by
                                        the connect command.
  --[no-]spawn                          Whether to spawn a new session backend if no session backend is currently
                                        holding the provided key.

DESCRIPTION
  Gets a URL that can be used to connect to a session backend. Will spawn a new session backend if no key (aka lock) is
  provided or if no session backend is currently holding the provided key.

ALIASES
  $ jamsocket connect

EXAMPLES
  $ jamsocket connect my-service

  $ jamsocket connect my-service -k my-key

  $ jamsocket connect my-service -t my-tag

  $ jamsocket connect my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket connect my-service -i 60

  $ jamsocket connect my-service -l 300

  $ jamsocket connect my-service --no-spawn

  $ jamsocket connect my-service -u my-user -a '{"foo":"my-json-data"}'
```

## `jamsocket dev`

Starts a local jamsocket dev server. You may configure the dev server with a jamsocket.config.json file in the current directory or by passing flags. (Flags take precedence over jamsocket.config.json)

```
USAGE
  $ jamsocket dev [-f <value>] [-c <value>] [-w <value>] [-p <value>] [-i] [--style-log-output]

FLAGS
  -c, --context=<value>     Path to the build context for the Dockerfile (defaults to current working directory)
  -f, --dockerfile=<value>  Path to the session backend's Dockerfile
  -i, --[no-]interactive    Enables/Disables TTY iteractivity. (Defaults to true)
  -p, --port=<value>        The port to run the dev server on. (Defaults to 8080)
  -w, --watch=<value>...    A file or directory to watch for changes
  --[no-]style-log-output   Styles log output from session backends for better readability. (Defaults to true)

DESCRIPTION
  Starts a local jamsocket dev server. You may configure the dev server with a jamsocket.config.json file in the current
  directory or by passing flags. (Flags take precedence over jamsocket.config.json)

EXAMPLES
  $ jamsocket dev

  $ jamsocket dev --dockerfile session-backend/Dockerfile --watch src --watch package.json --port 8080
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

## `jamsocket login [ACCOUNT]`

Authenticates user to the Jamsocket API.

```
USAGE
  $ jamsocket login [ACCOUNT] [-t <value>]

ARGUMENTS
  ACCOUNT  Account to use when logging in. (Only necessary for users with multiple accounts.)

FLAGS
  -t, --token=<value>  for automated environments, optional API token to log into the CLI with

DESCRIPTION
  Authenticates user to the Jamsocket API.

EXAMPLES
  $ jamsocket login
```

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

## `jamsocket logs BACKEND`

Stream logs from a running backend.

```
USAGE
  $ jamsocket logs [BACKEND]

ARGUMENTS
  BACKEND  The backend ID, a random string of letters and numbers returned by the connect command.

DESCRIPTION
  Stream logs from a running backend.

ALIASES
  $ jamsocket logs

EXAMPLES
  $ jamsocket logs f7em2
```

## `jamsocket push SERVICE [IMAGE]`

Builds and pushes an image to Jamsocket's container registry using the provided Dockerfile.

```
USAGE
  $ jamsocket push [SERVICE] [IMAGE] [-f <value>] [-c <value>] [-b <value>] [-t <value>] [-g]

ARGUMENTS
  SERVICE  Jamsocket service to push the image to
  IMAGE    Optionally, provide an image to push instead of a Dockerfile

FLAGS
  -b, --build-context=<value>...  Additional named build contexts to be used when building the image (e.g.
                                  --build-context alpine=docker-image://alpine@sha256:0123456789)
  -c, --context=<value>           path to the build context for the Dockerfile (defaults to current working directory)
  -f, --dockerfile=<value>        path to the Dockerfile to build the image from
  -g, --include-git-commit        optionally include git commit metadata as labels in the image (uses the git repo of
                                  the docker context)
  -t, --tag=<value>               optional tag to apply to the image in the jamsocket registry

DESCRIPTION
  Builds and pushes an image to Jamsocket's container registry using the provided Dockerfile.

EXAMPLES
  $ jamsocket push my-service -f path/to/Dockerfile

  $ jamsocket push my-service -f path/to/Dockerfile -c .

  $ jamsocket push my-service my-image -t my-tag
```

## `jamsocket service connect SERVICE`

Gets a URL that can be used to connect to a session backend. Will spawn a new session backend if no key (aka lock) is provided or if no session backend is currently holding the provided key.

```
USAGE
  $ jamsocket service connect [SERVICE] [-e <value>] [-t <value>] [-c <value>] [-i <value>] [-l <value>] [-k <value>]
    [-u <value>] [-a <value>] [--spawn]

ARGUMENTS
  SERVICE  Name of service to spawn.

FLAGS
  -a, --auth=<value>                    Optional serialized JSON to be passed to a session backend when connecting with
                                        the returned URL/connection string.
  -c, --cluster=<value>                 The cluster to spawn the backend in (only relevant if you are running multiple
                                        clusters with Jamsocket).
  -e, --env=<value>...                  optional environment variables to pass to the container
  -i, --max-idle-seconds=<value>        The max time in seconds a session backend should wait after last connection is
                                        closed before shutting down container (default is 300)
  -k, --key=<value>                     If provided, fetches the session backend currently holding the given key
                                        (formerly known as a "lock"). If no session backend holds the key, or if a key
                                        is not provided, a new session backend will be spawned.
  -l, --lifetime-limit-seconds=<value>  The max time in seconds the session backend should be allowed to run.
  -t, --tag=<value>                     An optional image tag or image digest to use when spawning a backend.
  -u, --user=<value>                    Optional username to be associated with the URL/connection string returned by
                                        the connect command.
  --[no-]spawn                          Whether to spawn a new session backend if no session backend is currently
                                        holding the provided key.

DESCRIPTION
  Gets a URL that can be used to connect to a session backend. Will spawn a new session backend if no key (aka lock) is
  provided or if no session backend is currently holding the provided key.

ALIASES
  $ jamsocket connect

EXAMPLES
  $ jamsocket service connect my-service

  $ jamsocket service connect my-service -k my-key

  $ jamsocket service connect my-service -t my-tag

  $ jamsocket service connect my-service -e SOME_ENV_VAR=foo -e ANOTHER_ENV_VAR=bar

  $ jamsocket service connect my-service -i 60

  $ jamsocket service connect my-service -l 300

  $ jamsocket service connect my-service --no-spawn

  $ jamsocket service connect my-service -u my-user -a '{"foo":"my-json-data"}'
```

## `jamsocket service create SERVICE`

Creates a service

```
USAGE
  $ jamsocket service create [SERVICE]

DESCRIPTION
  Creates a service

EXAMPLES
  $ jamsocket service create my-service
```

## `jamsocket service delete SERVICE`

Deletes a service

```
USAGE
  $ jamsocket service delete [SERVICE] [-y]

FLAGS
  -y, --yes  Skip confirmation prompt

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

## `jamsocket service info SERVICE`

Gets some information about a service

```
USAGE
  $ jamsocket service info [SERVICE]

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

## `jamsocket service use-image SERVICE`

Sets the image tag or digest to use when spawning a service

```
USAGE
  $ jamsocket service use-image [SERVICE] -i <value>

ARGUMENTS
  SERVICE  Name of service whose spawning image should be updated.

FLAGS
  -i, --image=<value>  (required) image tag or digest for the service to use (Run `jamsocket images` for a list of
                       images you can use.)

DESCRIPTION
  Sets the image tag or digest to use when spawning a service

EXAMPLES
  $ jamsocket service use-image my-service -i latest
```

## `jamsocket terminate BACKENDS`

Terminates one or more backends given the backend ID(s). To terminate all backends for a service, use the "terminate-all-backends" command.

```
USAGE
  $ jamsocket terminate [BACKENDS] [-f]

FLAGS
  -f, --force  whether to force the backend to hard terminate (defaults to false)

DESCRIPTION
  Terminates one or more backends given the backend ID(s). To terminate all backends for a service, use the
  "terminate-all-backends" command.

ALIASES
  $ jamsocket terminate

EXAMPLES
  $ jamsocket terminate abc123 def456 ...
```
<!-- commandsstop -->
