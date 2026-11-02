; Delimiters

[
  "{{" "{{-" "{{+"
  "}}" "-}}" "+}}"
  "{%" "{%-" "{%+"
  "%}" "-%}" "+%}"
] @punctuation.special

(comment) @comment

; Statement keywords

[
  "if" "elif" "else" "for" "in" "recursive"
  "set" "block" "scoped" "required" "extends"
  "include" "ignore" "missing" "import" "from" "as"
  "with" "without" "context" "macro" "call" "filter"
  "raw" "endraw"
] @keyword

(else_statement) @keyword

; Operators

[
  "and" "or" "not" "is"
] @keyword.operator

[
  "==" "!=" "<" "<=" ">" ">="
  "+" "-" "*" "/" "//" "%" "**" "~"
  "|" "="
] @operator

(list_splat "*" @operator)
(dictionary_splat "**" @operator)

; Names

(identifier) @variable

((identifier) @variable.special
  (#any-of? @variable.special "loop" "self" "super" "caller" "varargs" "kwargs"))

(attribute
  attribute: (identifier) @property)

(keyword_argument
  name: (identifier) @variable.parameter)

(parameters (identifier) @variable.parameter)

(default_parameter
  name: (identifier) @variable.parameter)

(call
  function: (identifier) @function)

(call
  function: (attribute
    attribute: (identifier) @function.method))

(filter_name) @function

(test_name) @function

(macro_statement
  name: (identifier) @function)

(block_statement
  name: (identifier) @function)

(import_statement
  alias: (identifier) @namespace)

(import_name
  name: (identifier) @function)

; Literals

(string) @string

[
  (integer)
  (float)
] @number

(boolean) @boolean

(none) @constant.builtin

(extends_statement
  template: (string) @string.special)

(include_statement
  template: (string) @string.special)

(import_statement
  template: (string) @string.special)

(from_statement
  template: (string) @string.special)

; Punctuation

["(" ")" "[" "]" "{" "}"] @punctuation.bracket

["," ":" "."] @punctuation.delimiter

; Tag names of endif, endfor, do, trans and extension tags (after @variable).

(custom_statement
  name: (identifier) @keyword)
