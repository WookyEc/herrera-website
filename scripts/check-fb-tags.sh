#!/usr/bin/env bash
#
# Verifies that EVERY HTML page carries the required Meta/Facebook tags:
#   1. the Facebook domain-verification meta tag, and
#   2. the Meta Pixel base code (pixel ID).
#
# This is the "rule" that guards against a new page shipping without them.
# Runs automatically in CI on every push (see .github/workflows/verify-fb-tags.yml)
# and can be run locally:
#
#   bash scripts/check-fb-tags.sh
#
set -euo pipefail

DOMAIN_TOKEN='b7zmeey6gkhc7gxnfm93k5x1uy54lp'
PIXEL_ID='1093644965972172'
missing=0
checked=0

# Every HTML file in the repo, excluding dependencies and VCS internals.
while IFS= read -r -d '' file; do
  checked=$((checked + 1))
  problems=""

  if ! { grep -qF 'facebook-domain-verification' "$file" && grep -qF "$DOMAIN_TOKEN" "$file"; }; then
    problems="$problems domain-verification"
  fi
  if ! grep -qF "$PIXEL_ID" "$file"; then
    problems="$problems meta-pixel"
  fi

  if [ -n "$problems" ]; then
    echo "MISSING [$problems ]  $file"
    missing=$((missing + 1))
  else
    echo "ok    $file"
  fi
done < <(find . -type f -name '*.html' \
           -not -path './node_modules/*' \
           -not -path './.git/*' -print0)

echo "---"
echo "Checked $checked HTML page(s); $missing with missing tag(s)."

if [ "$missing" -ne 0 ]; then
  echo
  echo "ERROR: one or more HTML pages are missing required Meta tags (see above)."
  echo "Every page's <head> must contain BOTH:"
  echo "  <meta name=\"facebook-domain-verification\" content=\"${DOMAIN_TOKEN}\" />"
  echo "  the Meta Pixel base code with: fbq('init', '${PIXEL_ID}');"
  exit 1
fi

echo "All HTML pages contain the domain-verification tag and the Meta Pixel."
