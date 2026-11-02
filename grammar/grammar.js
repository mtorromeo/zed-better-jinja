/**
 * @file Jinja template grammar for mixed-language files (yaml+jinja, html+jinja, ...)
 * @license MIT
 */

// Text outside of tags is exposed as `content` (and `raw_body` inside
// `{% raw %}`) so editors can inject the host language with a combined
// injection. Statements are parsed as flat, independent tags: block
// matching is left to the editor, which keeps partial templates and
// unknown extension tags (Ansible, Salt, ...) error free.

const IDENT = /[\p{XID_Start}_][\p{XID_Continue}]*/.source;
const DOTTED_NAME = new RegExp(`${IDENT}(\\.${IDENT})*`, 'u');

const PREC = {
  ternary: 1,
  or: 2,
  and: 3,
  not: 4,
  compare: 5,
  concat: 6,
  add: 7,
  mul: 8,
  unary: 9,
  pow: 10,
  filter: 11,
  postfix: 12,
};

module.exports = grammar({
  name: 'better_jinja',

  externals: $ => [$.content, $.raw_body],

  extras: _ => [/\s/],

  word: $ => $.identifier,

  // `{% call(a, b=1) macro(a) %}`: caller parameters vs. a tuple expression.
  conflicts: $ => [
    [$._parameter, $._expression],
    [$.parameters, $.tuple],
  ],

  rules: {
    template: $ => repeat(choice(
      $.content,
      $.comment,
      $.expression_tag,
      $.statement_tag,
      $.raw_block,
    )),

    comment: _ => token(seq('{#', /[^#]*#+([^}#][^#]*#+)*/, '}')),

    _expression_open: _ => choice('{{', '{{-', '{{+'),
    _expression_close: _ => choice('}}', '-}}', '+}}'),
    _statement_open: _ => choice('{%', '{%-', '{%+'),
    _statement_close: _ => choice('%}', '-%}', '+%}'),

    expression_tag: $ => seq(
      $._expression_open,
      optional($._expression),
      $._expression_close,
    ),

    raw_block: $ => seq(
      $._statement_open, 'raw', $._statement_close,
      optional($.raw_body),
      $._statement_open, 'endraw', $._statement_close,
    ),

    statement_tag: $ => seq(
      $._statement_open,
      optional($._statement),
      $._statement_close,
    ),

    _statement: $ => choice(
      $.if_statement,
      $.elif_statement,
      $.else_statement,
      $.for_statement,
      $.set_statement,
      $.block_statement,
      $.extends_statement,
      $.include_statement,
      $.import_statement,
      $.from_statement,
      $.macro_statement,
      $.call_statement,
      $.filter_statement,
      $.with_statement,
      $.custom_statement,
    ),

    if_statement: $ => seq('if', field('condition', $._expression)),
    elif_statement: $ => seq('elif', field('condition', $._expression)),
    else_statement: _ => 'else',

    for_statement: $ => seq(
      'for',
      field('left', $._target),
      'in',
      field('right', $._expression),
      optional('recursive'),
    ),

    set_statement: $ => seq(
      'set',
      field('left', $._target),
      optional(choice(
        seq('=', field('right', choice($._expression, alias($.expression_list, $.tuple)))),
        repeat1($._filter_tail),
      )),
    ),

    block_statement: $ => seq(
      'block',
      field('name', $.identifier),
      repeat(choice('scoped', 'required')),
    ),

    extends_statement: $ => seq('extends', field('template', $._expression)),

    include_statement: $ => prec.right(seq(
      'include',
      field('template', $._expression),
      optional(seq('ignore', 'missing')),
      optional($._context_modifier),
    )),

    import_statement: $ => prec.right(seq(
      'import',
      field('template', $._expression),
      'as',
      field('alias', $.identifier),
      optional($._context_modifier),
    )),

    from_statement: $ => prec.right(seq(
      'from',
      field('template', $._expression),
      'import',
      commaSep1($.import_name),
      optional(','),
      optional($._context_modifier),
    )),

    import_name: $ => seq(
      field('name', $.identifier),
      optional(seq('as', field('alias', $.identifier))),
    ),

    _context_modifier: _ => seq(choice('with', 'without'), 'context'),

    macro_statement: $ => seq(
      'macro',
      field('name', $.identifier),
      field('parameters', $.parameters),
    ),

    call_statement: $ => seq(
      'call',
      optional(field('parameters', $.parameters)),
      field('call', $._expression),
    ),

    filter_statement: $ => seq(
      'filter',
      $._filter_call,
      repeat($._filter_tail),
    ),

    with_statement: $ => seq(
      'with',
      optional(seq(commaSep1($.assignment), optional(','))),
    ),

    assignment: $ => seq(
      field('left', $._target),
      '=',
      field('right', $._expression),
    ),

    // Any other tag: endif, endfor, do, trans, break, extension tags, ...
    custom_statement: $ => prec.right(seq(
      field('name', $.identifier),
      repeat(choice($._expression, $.keyword_argument, ',', ':')),
    )),

    // Precedence over tuples for `{% call() ... %}`.
    parameters: $ => prec.dynamic(1, seq(
      '(',
      optional(seq(commaSep1($._parameter), optional(','))),
      ')',
    )),

    _parameter: $ => choice($.identifier, $.default_parameter),

    default_parameter: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
    ),

    _target: $ => choice($._simple_target, $.target_tuple),

    _simple_target: $ => choice(
      $.identifier,
      alias($.target_attribute, $.attribute),
      $.parenthesized_target,
    ),

    // `{% set ns.value = ... %}`
    target_attribute: $ => seq(
      field('object', $.identifier),
      '.',
      field('attribute', $.identifier),
    ),

    parenthesized_target: $ => seq('(', $._target, ')'),

    target_tuple: $ => prec.right(seq(
      $._simple_target,
      repeat1(seq(',', $._simple_target)),
      optional(','),
    )),

    _expression: $ => choice(
      $.identifier,
      $.string,
      $.integer,
      $.float,
      $.boolean,
      $.none,
      $.list,
      $.tuple,
      $.dict,
      $.parenthesized_expression,
      $.attribute,
      $.subscript,
      $.call,
      $.filter,
      $.test,
      $.unary_expression,
      $.binary_expression,
      $.comparison,
      $.not_expression,
      $.boolean_expression,
      $.conditional_expression,
    ),

    conditional_expression: $ => prec.right(PREC.ternary, seq(
      field('consequence', $._expression),
      'if',
      field('condition', $._expression),
      optional(seq('else', field('alternative', $._expression))),
    )),

    boolean_expression: $ => choice(
      prec.left(PREC.or, seq(field('left', $._expression), field('operator', 'or'), field('right', $._expression))),
      prec.left(PREC.and, seq(field('left', $._expression), field('operator', 'and'), field('right', $._expression))),
    ),

    not_expression: $ => prec(PREC.not, seq('not', field('argument', $._expression))),

    comparison: $ => prec.left(PREC.compare, seq(
      field('left', $._expression),
      field('operator', choice('==', '!=', '<', '<=', '>', '>=', 'in', seq('not', 'in'))),
      field('right', $._expression),
    )),

    binary_expression: $ => {
      const table = [
        [PREC.concat, '~'],
        [PREC.add, choice('+', '-')],
        [PREC.mul, choice('*', '/', '//', '%')],
      ];
      return choice(
        ...table.map(([p, op]) => prec.left(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression),
        ))),
        prec.right(PREC.pow, seq(
          field('left', $._expression),
          field('operator', '**'),
          field('right', $._expression),
        )),
      );
    },

    unary_expression: $ => prec(PREC.unary, seq(
      field('operator', choice('-', '+')),
      field('argument', $._expression),
    )),

    filter: $ => prec.left(PREC.filter, seq(
      field('value', $._expression),
      $._filter_tail,
    )),

    _filter_tail: $ => seq('|', $._filter_call),

    _filter_call: $ => prec.right(seq(
      field('name', $.filter_name),
      optional(field('arguments', $.arguments)),
    )),

    // Dotted names allow Ansible FQCN filters/tests (`ansible.builtin.to_json`).
    filter_name: _ => DOTTED_NAME,

    test: $ => prec.right(PREC.filter, seq(
      field('value', $._expression),
      'is',
      optional('not'),
      field('name', $.test_name),
      optional(choice(
        field('arguments', $.arguments),
        field('argument', choice($.string, $.integer, $.float, $.boolean, $.none)),
      )),
    )),

    test_name: $ => choice(
      DOTTED_NAME,
      'none', 'None', 'true', 'True', 'false', 'False', 'in',
    ),

    attribute: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '.',
      field('attribute', choice($.identifier, $.integer)),
    )),

    subscript: $ => prec(PREC.postfix, seq(
      field('value', $._expression),
      '[',
      field('subscript', choice($._expression, $.slice)),
      ']',
    )),

    slice: $ => seq(
      optional($._expression),
      ':',
      optional($._expression),
      optional(seq(':', optional($._expression))),
    ),

    call: $ => prec(PREC.postfix, seq(
      field('function', $._expression),
      field('arguments', $.arguments),
    )),

    arguments: $ => seq(
      '(',
      optional(seq(
        commaSep1(choice(
          $._expression,
          $.keyword_argument,
          $.list_splat,
          $.dictionary_splat,
        )),
        optional(','),
      )),
      ')',
    ),

    keyword_argument: $ => seq(
      field('name', $.identifier),
      '=',
      field('value', $._expression),
    ),

    list_splat: $ => seq('*', $._expression),
    dictionary_splat: $ => seq('**', $._expression),

    // Unparenthesized tuple: `{% set a, b = 1, 2 %}`
    expression_list: $ => prec.right(seq(
      $._expression,
      repeat1(seq(',', $._expression)),
      optional(','),
    )),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple: $ => seq(
      '(',
      optional(choice(
        seq($._expression, ','),
        seq($._expression, repeat1(seq(',', $._expression)), optional(',')),
      )),
      ')',
    ),

    list: $ => seq(
      '[',
      optional(seq(commaSep1($._expression), optional(','))),
      ']',
    ),

    dict: $ => seq(
      '{',
      optional(seq(commaSep1($.pair), optional(','))),
      '}',
    ),

    pair: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._expression),
    ),

    identifier: _ => new RegExp(IDENT, 'u'),

    string: _ => token(choice(
      seq('"', repeat(choice(/[^"\\]+/, /\\(.|\n)/)), '"'),
      seq('\'', repeat(choice(/[^'\\]+/, /\\(.|\n)/)), '\''),
    )),

    integer: _ => token(choice(
      /0[xX][0-9a-fA-F_]+/,
      /0[oO][0-7_]+/,
      /0[bB][01_]+/,
      /[0-9][0-9_]*/,
    )),

    float: _ => token(choice(
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9_]+)?/,
      /[0-9][0-9_]*[eE][+-]?[0-9_]+/,
    )),

    boolean: _ => choice('true', 'True', 'false', 'False'),

    none: _ => choice('none', 'None'),
  },
});

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
