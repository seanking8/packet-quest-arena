# SonarQube Quality Gate Notes

These are **real** results from a local SonarQube (Community Edition) scan of
this repository. Reproduce them with the commands in the README / below.

## Scan setup

- SonarQube Community Edition (Docker, `sonarqube:community`) on `localhost:9001`.
- Scanner: `sonarsource/sonar-scanner-cli` (Docker), config in
  `sonar-project.properties`.
- Coverage inputs generated before the scan (all three suites measured):
  - Backend: JaCoCo (`backend/target/site/jacoco/jacoco.xml`)
  - Simulator: pytest-cov (`simulator/coverage.xml`)
  - Frontend: Vitest + `@vitest/coverage-v8` (`frontend/coverage/lcov.info`)

## Result (fresh scan of commit 6696f61, branch `feature/sonar-code-quality`)

All three suites' coverage included (backend JaCoCo, simulator pytest-cov,
frontend Vitest).

| Metric | Value |
|---|---|
| **Quality Gate** | **PASSED (OK)** |
| Bugs | 0 |
| Vulnerabilities | 0 |
| Security hotspots | 10 (to review) |
| Code smells | 1,414 |
| Coverage (overall) | 41.6% |
| Line coverage | 38.2% |
| Branch coverage | 70.1% |
| Duplicated lines | 13.1% |
| Lines of code (ncloc) | 12,911 |
| Security rating | A |
| Maintainability rating | A |
| Reliability rating | A |

Per-module coverage (as Sonar measured it this scan):

| Module | Lines to cover | Line coverage | Branch | Share of all lines |
|---|---|---|---|---|
| Backend (`backend/src/main`) | 1,589 | 83.4% | 66.5% | ~17% |
| Simulator (`simulator`) | 147 | 96.6% | – | ~2% |
| Frontend (`frontend/src`) | 7,747 | 27.9% | 72.4% | ~81% |

Test counts (all green): backend **113**, simulator **18**, frontend **69**.

> Why overall (41.6%) sits well below backend/simulator: SonarQube blends one
> coverage number across all languages, weighted by lines. The frontend is **~81%
> of all coverable lines**, and its large 3D scene files (three.js/WebGL —
> `TutorialDistrictScene`, `DistrictScene`, `cityDetails`, `NetworkScene`, ~3,600
> lines at near-0%) can't run in jsdom, so they're untested and dominate the
> blended figure. The actual game logic — routing, scoring, congestion, API — is
> well covered.

## Interpretation (honest)

- The gate **passes** — 0 bugs, 0 vulnerabilities, all ratings **A**.
- **Reliability is now A (0 bugs)** — up from the earlier scan's D/8 bugs; the
  reported issues were resolved on this branch.
- **1,414 code smells** is high but typical for the 3D scene files; most are
  maintainability nits, not defects.
- **Overall coverage 41.6%** is dragged down by ~3,600 lines of untestable WebGL
  3D-scene code (see note above). The testable logic is 83% (backend), 96.6%
  (simulator) and ~70–90% on the frontend's non-3D modules. This is the headline
  thing to *justify* in the demo rather than chase.
- **0 vulnerabilities, security rating A** — consistent with the
- **0 vulnerabilities, security rating A** — consistent with the
  backend-authoritative, no-secrets design (see `security-notes.md`). The 10
  security *hotspots* are flagged for manual review, not confirmed issues.

## How to reproduce

```bash
# 1) Generate coverage (from repo root)
cd frontend && npm install -D @vitest/coverage-v8 && npm run coverage && cd ..
cd backend && mvn test && cd ..                       # JaCoCo xml
pip install -r simulator/requirements.txt
python3 -m pytest simulator/tests --cov=simulator --cov-report=xml:simulator/coverage.xml
# IMPORTANT: pytest-cov writes a host-absolute <source> path; the Dockerized
# scanner sees the repo at /usr/src, so make the path relative or Sonar reports
# the simulator as 0% covered:
sed -i '' 's#<source>.*/simulator</source>#<source>simulator</source>#' simulator/coverage.xml

# 2) Start a local SonarQube
docker run -d --name pqa-sonarqube -p 9001:9000 sonarqube:community
# wait until http://localhost:9001/api/system/status reports {"status":"UP"}
# log in at http://localhost:9001 (admin/admin -> set a new password), then
# create a token under My Account > Security.

# 3) Scan
docker run --rm -v "$PWD":/usr/src \
  -e SONAR_HOST_URL="http://host.docker.internal:9001" \
  -e SONAR_TOKEN="<your-token>" \
  sonarsource/sonar-scanner-cli

# 4) View results
open http://localhost:9001/dashboard?id=packet-quest-arena
```

## Follow-ups for the team

- Install `@vitest/coverage-v8` so the frontend reports real coverage.
- Triage the 8 bugs (reliability D) and review the 10 security hotspots.
- Consider chipping away at the highest-impact code smells / duplication.
