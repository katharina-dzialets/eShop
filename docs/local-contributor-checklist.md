# Local contributor checklist

Run these checks locally before you open a pull request; each command is copied from the file linked in its section.

## Prerequisites

Sources: [README.md](../README.md), [global.json](../global.json), [playwright.yml](../.github/workflows/playwright.yml), [markdownlint.yml](../.github/workflows/markdownlint.yml)

- [ ] A .NET 10 SDK that satisfies [global.json](../global.json): version `10.0.302` with `rollForward: latestFeature`.
- [ ] The Aspire CLI, verified with `aspire --version`.
- [ ] A running OCI-compatible container runtime: Docker Desktop (recommended) or Podman.
- [ ] Node.js and npm, for the Playwright and markdownlint checks.

## Build

Sources: [pr-validation.yml](../.github/workflows/pr-validation.yml), [ci.yml](../ci.yml)

- [ ] `dotnet build eShop.Web.slnf`

## Server tests

Sources: [README.md](../README.md), [pr-validation.yml](../.github/workflows/pr-validation.yml), [tests/README.md](../tests/README.md)

- [ ] Start the container runtime first: functional tests use the Aspire host to start test containers.
- [ ] `dotnet test --solution eShop.Web.slnf`
- [ ] To match CI: `dotnet test --solution eShop.Web.slnf --no-build --no-progress --output detailed`

## Playwright browser tests

Sources: [README.md](../README.md), [package.json](../package.json), [playwright.config.ts](../playwright.config.ts), [login.setup.ts](../e2e/login.setup.ts), [playwright.yml](../.github/workflows/playwright.yml), [.gitignore](../.gitignore)

- [ ] Start the container runtime first. Playwright starts the AppHost itself (`dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj`) and waits for `http://localhost:5045`.
- [ ] Set `USERNAME1` and `PASSWORD`, which the login setup requires, in the environment or in a `.env` file (`.gitignore` excludes it). CI uses `USERNAME1=bob`, `PASSWORD=Pass123$` and `ESHOP_USE_HTTP_ENDPOINTS=1`.
- [ ] `npm ci`
- [ ] `npx playwright install chromium` (CI runs `npx playwright install --with-deps chromium`)
- [ ] `npm run test:e2e`

## Markdown lint

Source: [markdownlint.yml](../.github/workflows/markdownlint.yml), rules in [.markdownlint.json](../.markdownlint.json)

- [ ] `npm i -g markdownlint-cli`
- [ ] `markdownlint --ignore '.dotnet/' '**/*.md'`

## .NET MAUI client

Source: [pr-validation-maui.yml](../.github/workflows/pr-validation-maui.yml). Only when you change `src/ClientApp/**` or `tests/ClientApp.UnitTests/**`; CI runs it on Windows.

- [ ] `dotnet workload update`, then `dotnet workload install android`, `dotnet workload install ios`, `dotnet workload install maccatalyst` and `dotnet workload install maui`
- [ ] `dotnet build src/ClientApp/ClientApp.csproj`
- [ ] `dotnet test --project tests/ClientApp.UnitTests/ClientApp.UnitTests.csproj --no-progress --output detailed`

## Which CI checks run on a pull request

Sources: [pr-validation.yml](../.github/workflows/pr-validation.yml), [playwright.yml](../.github/workflows/playwright.yml), [markdownlint.yml](../.github/workflows/markdownlint.yml)

- [ ] Markdownlint runs on every pull request.
- [ ] Build, server tests and Playwright skip pull requests that change only Markdown files (`'**.md'` under `paths-ignore`).
