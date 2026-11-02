#!/usr/bin/env bash
# Regenerates languages/jinja-*/ from scripts/languages.tsv and the shared queries/.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$root"/languages/jinja-*

while IFS=$'\t' read -r dir name host suffixes; do
  [[ -z "$dir" || "$dir" == \#* ]] && continue
  out="$root/languages/jinja-$dir"
  mkdir -p "$out"
  cp "$root"/queries/*.scm "$out/"

  list=""
  for suffix in $suffixes; do
    for ext in j2 jinja jinja2; do
      list+="\"$suffix.$ext\", "
    done
  done

  cat > "$out/config.toml" <<TOML
name = "$name"
grammar = "better_jinja"
path_suffixes = [${list%, }]
block_comment = ["{# ", " #}"]
autoclose_before = "}])>\"'"
brackets = [
  { start = "{{", end = "}}", close = true, newline = false },
  { start = "{%", end = "%}", close = true, newline = false },
  { start = "{#", end = "#}", close = true, newline = false },
  { start = "[", end = "]", close = true, newline = true },
  { start = "(", end = ")", close = true, newline = true },
  { start = "\"", end = "\"", close = true, newline = false, not_in = ["comment", "string"] },
  { start = "'", end = "'", close = true, newline = false, not_in = ["comment", "string"] },
]
TOML

  cat > "$out/injections.scm" <<SCM
((content) @injection.content
  (#set! injection.language "$host")
  (#set! injection.combined))

((raw_body) @injection.content
  (#set! injection.language "$host")
  (#set! injection.combined))
SCM
done < "$root/scripts/languages.tsv"
