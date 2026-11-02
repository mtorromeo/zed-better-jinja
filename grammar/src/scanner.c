#include "tree_sitter/parser.h"

#include <wctype.h>

enum TokenType {
  CONTENT,
  RAW_BODY,
};

void *tree_sitter_better_jinja_external_scanner_create(void) { return NULL; }

void tree_sitter_better_jinja_external_scanner_destroy(void *payload) {}

unsigned tree_sitter_better_jinja_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_better_jinja_external_scanner_deserialize(void *payload, const char *buffer,
                                                           unsigned length) {}

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

// Template text up to the next `{{`, `{%` or `{#`.
static bool scan_content(TSLexer *lexer) {
  bool has_content = false;

  for (;;) {
    if (lexer->eof(lexer)) {
      lexer->mark_end(lexer);
      break;
    }
    if (lexer->lookahead == '{') {
      lexer->mark_end(lexer);
      advance(lexer);
      if (lexer->lookahead == '{' || lexer->lookahead == '%' || lexer->lookahead == '#') {
        break;
      }
    } else {
      advance(lexer);
    }
    has_content = true;
  }

  lexer->result_symbol = CONTENT;
  return has_content;
}

static bool match_word(TSLexer *lexer, const char *word) {
  for (; *word; word++) {
    if (lexer->lookahead != *word) return false;
    advance(lexer);
  }
  return true;
}

// Verbatim text up to the `{% endraw %}` tag (with optional whitespace control).
static bool scan_raw_body(TSLexer *lexer) {
  bool has_content = false;

  for (;;) {
    if (lexer->eof(lexer)) {
      lexer->mark_end(lexer);
      break;
    }
    if (lexer->lookahead == '{') {
      lexer->mark_end(lexer);
      advance(lexer);
      if (lexer->lookahead == '%') {
        advance(lexer);
        if (lexer->lookahead == '-' || lexer->lookahead == '+') advance(lexer);
        while (iswspace(lexer->lookahead)) advance(lexer);
        if (match_word(lexer, "endraw")) {
          while (iswspace(lexer->lookahead)) advance(lexer);
          if (lexer->lookahead == '-' || lexer->lookahead == '+') advance(lexer);
          if (lexer->lookahead == '%') {
            advance(lexer);
            if (lexer->lookahead == '}') break;
          }
        }
      }
    } else {
      advance(lexer);
    }
    has_content = true;
  }

  lexer->result_symbol = RAW_BODY;
  return has_content;
}

bool tree_sitter_better_jinja_external_scanner_scan(void *payload, TSLexer *lexer,
                                                    const bool *valid_symbols) {
  // Both valid only during error recovery: let the internal lexer handle it.
  if (valid_symbols[CONTENT] && valid_symbols[RAW_BODY]) return false;
  if (valid_symbols[RAW_BODY]) return scan_raw_body(lexer);
  if (valid_symbols[CONTENT]) return scan_content(lexer);
  return false;
}
