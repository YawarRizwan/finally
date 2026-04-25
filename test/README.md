# FinAlly E2E tests

Playwright end-to-end tests for the FinAlly trading workstation. Tests drive the production Docker image with `LLM_MOCK=true` and the built-in market simulator, so no external API keys are required.

## Run it

One command, from the project root:

```
docker compose -f test/docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from playwright
```

The `playwright` container's exit code propagates as the suite's exit code.

## Run against a host-mounted stack (iteration)

Start the backend (and its served static frontend) locally, then:

```
cd test
npm install
APP_BASE_URL=http://localhost:8000 npx playwright test
```

`APP_BASE_URL` defaults to `http://app:8000` (the compose network name); override it for any other target.
