# Local contributor checklist

A short checklist for your first contribution to eShop. Each item links to the full guide: [README](../README.md) and [CONTRIBUTING](../CONTRIBUTING.md).

## Before you start

- [ ] Look for issues tagged `"good first issue"` or `"help wanted"` ([Getting Started](../CONTRIBUTING.md#getting-started)).
- [ ] For a typo or other small fix, open a pull request directly; no issue is needed ([Spot a Typo?](../CONTRIBUTING.md#spot-a-typo)).
- [ ] For a suggestion, open an issue with a clear title and description, any relevant examples or mockups, and whether you want to implement it yourself ([Have a Suggestion?](../CONTRIBUTING.md#have-a-suggestion)).
- [ ] Read the [Contribution Principles](../CONTRIBUTING.md#contribution-principles) and the [Code of Conduct](../CODE-OF-CONDUCT.md).

## Prerequisites

See [Prerequisites](../README.md#prerequisites) for details.

- [ ] Install a [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) that satisfies [`global.json`](../global.json).
- [ ] Install the [Aspire CLI](https://aspire.dev/get-started/install-cli/) and check it with `aspire --version`.
- [ ] Install and start an OCI-compatible container runtime: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended) or [Podman](https://podman.io/docs/installation).
- [ ] Clone the repository: `git clone https://github.com/dotnet/eShop.git`, then `cd eShop`.
- [ ] Optional: set up an IDE ([Optional IDE setup](../README.md#optional-ide-setup)).

## Run the app locally

> [!WARNING]
> Make sure your container runtime is running before you start eShop.

- [ ] From the repository root, run `aspire run` and open the dashboard URL it prints. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.
- [ ] Or run in the background with `aspire start`, check with `aspire ps`, and stop with `aspire stop`.

More options: [Running the solution](../README.md#running-the-solution).

## Check your change before opening a PR

Run the checks that match what you changed. See [Running tests](../README.md#running-tests) and the [workflows](../.github/workflows/).

- [ ] **Server or web code:** build and run the server tests.

    ```console
    dotnet build eShop.Web.slnf
    dotnet test --solution eShop.Web.slnf
    ```

- [ ] **Browser journeys:** run the Playwright tests (they start the AppHost, so the container runtime must be running).

    ```console
    npm ci
    npx playwright install chromium
    npm run test:e2e
    ```

    Optional scripts from [`package.json`](../package.json): `npm run test:e2e:headed` and `npm run test:e2e:report`.

- [ ] **Markdown:** run the same lint as CI.

    ```console
    npm i -g markdownlint-cli
    markdownlint --ignore '.dotnet/' '**/*.md'
    ```

- [ ] **MAUI client** (`src/ClientApp/**` or `tests/ClientApp.UnitTests/**`): build and test the client. CI runs these on Windows with the `android`, `ios`, `maccatalyst` and `maui` workloads installed; see the [.NET MAUI workload](../README.md#optional-ide-setup) note.

    ```console
    dotnet build src/ClientApp/ClientApp.csproj
    dotnet test --project tests/ClientApp.UnitTests/ClientApp.UnitTests.csproj
    ```

## What CI runs on your PR

- [ ] **Markdownlint** (`markdownlint.yml`) runs on every pull request.
- [ ] **Build and test** (`pr-validation.yml`) and **Playwright** (`playwright.yml`) are skipped when every changed file is a `**.md` file or in the MAUI client paths, so a Markdown-only PR runs only Markdownlint.
- [ ] **.NET MAUI validation** (`pr-validation-maui.yml`) runs only when the PR changes `src/ClientApp/**`, `tests/ClientApp.UnitTests/**` or that workflow.
