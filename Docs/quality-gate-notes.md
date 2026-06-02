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

## Result (rescan of commit 12d4d0c with frontend coverage included)

| Metric | Value |
|---|---|
| **Quality Gate** | **PASSED (OK)** |
| Bugs | 8 |
| Vulnerabilities | 0 |
| Security hotspots | 10 (to review) |
| Code smells | 1559 |
| Coverage (overall) | 31.5% |
| Duplicated lines | 14.2% |
| Lines of code (ncloc) | 12,120 |
| Security rating | A |
| Maintainability rating | A |
| Reliability rating | D |

Component coverage (measured directly):

| Suite | Tests | Coverage |
|---|---|---|
| Backend (JaCoCo) | 112 pass | ~82% instructions, ~82% lines, ~64% branches |
| Simulator (pytest-cov) | 18 pass | ~98% lines |
| Frontend (Vitest) | 26 pass | ~19% lines |

> Note: overall coverage (31.5%) is *lower* than the first scan (36%) precisely
> because the frontend is now **included** with its real ~19% — earlier the
> frontend was excluded from the denominator, which flattered the number. The
> frontend tests cover utils/api/format well but the large screen components
> and 3D scenes are mostly untested — the clearest place to add tests next.

## Interpretation (honest)

- The gate **passes** because the default "Sonar way" gate evaluates *new code*,
  and this is the first analysis (no prior baseline), so most conditions are
  not yet triggered.
- **Reliability is D** because of 8 reported bugs — these should be reviewed and
  triaged; some are likely minor (e.g. React/JS patterns) but a few may be real.
- **1559 code smells** is high but typical for an unreviewed codebase + the 3D
  scene files; most are maintainability nits, not defects.
- **Coverage 36%** is misleadingly low: backend (~82%) and simulator (~98%) are
  well covered; the frontend wasn't measured. Installing `@vitest/coverage-v8`
  and re-scanning would raise the overall figure substantially.
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
