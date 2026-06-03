#!/usr/bin/env bash
#
# Restore the curated "PQA JS way" SonarQube quality profile and assign it to
# the project. The local SonarQube container uses ephemeral H2 storage, so
# recreating it wipes custom profiles and reverts the project to "Sonar way"
# defaults — which re-enables ~1,300 React/JSX issues we have deliberately
# disabled (see Docs/quality-gate-notes.md for the justification).
#
# Run this after (re)creating the SonarQube container.
#
#   SONAR_URL=http://localhost:9001 SONAR_AUTH=admin:yourpassword ./restore-profile.sh
#
set -euo pipefail

URL="${SONAR_URL:-http://localhost:9001}"
AUTH="${SONAR_AUTH:?set SONAR_AUTH=admin:password}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="$HERE/pqa-js-way-profile.xml"
PROJECT="packet-quest-arena"

echo "==> Restoring profile from $BACKUP"
curl -s -u "$AUTH" -X POST "$URL/api/qualityprofiles/restore" \
  -F "backup=@$BACKUP" >/dev/null

echo "==> Assigning 'PQA JS way' to project '$PROJECT'"
curl -s -u "$AUTH" -X POST "$URL/api/qualityprofiles/add_project" \
  --data-urlencode "qualityProfile=PQA JS way" \
  --data-urlencode "language=js" \
  --data-urlencode "project=$PROJECT" >/dev/null

echo "==> Done. Re-run a scan to apply (see Docs/quality-gate-notes.md)."
