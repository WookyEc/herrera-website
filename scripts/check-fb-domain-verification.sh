#!/usr/bin/env bash
#
# Verifies the Facebook domain-verification meta tag is present on EVERY HTML page.
# This is the "rule" that guards against a new page shipping without the tag.
#
# Runs automatically in CI on every push (see
# .github/workflows/verify-fb-domain-verification.yml), and can be run locally:
#
#   bash scripts/check-fb-domain-verification.sh
#
set -euo pipefail

TOKEN='b7zmeey6gkhc7gxnfm93k5x1uy54lp'
EXPECTED="<meta name=\"facebook-domain-verification\" content=\"${TOKEN}\" />"
missing=0
checked=0

# Every HTML file in the repo, excluding dependencies and VCS internals.
while IFS= read -r -d '' file; do
  checked=$((checked + 1))
  if grep -qF "facebook-domain-verification" "$file" && grep -qF "$TOKEN" "$file"; then
    echo "ok      $file"
  else
    echo "MISSING $file"
    missing=$((missing + 1))
  fi
done < <(find . -type f -name '*.html' \
           -not -path './node_modules/*' \
           -not -path './.git/*' -print0)

echo "---"
echo "Checked $checked HTML page(s); $missing missing the tag."

if [ "$missing" -ne 0 ]; then
  echo
  echo "ERROR: the Facebook domain-verification meta tag is missing from the page(s) above."
  echo "Add this line inside the <head> of each one:"
  echo "  $EXPECTED"
  exit 1
fi

echo "All HTML pages contain the Facebook domain-verification tag."
