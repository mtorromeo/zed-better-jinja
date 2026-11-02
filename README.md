# Better Jinja for Zed

Syntax highlighting for files that mix Jinja templates with another language,
inspired by the [Better Jinja](https://marketplace.visualstudio.com/items?itemName=samuelcolvin.jinjahtml)
extension for VS Code.

The text outside Jinja tags is highlighted by the host language (through a
combined injection), while `{{ … }}`, `{% … %}` and `{# … #}` are highlighted
by a dedicated Jinja grammar.

## Languages

Each suffix works with `.j2`, `.jinja` and `.jinja2` (e.g. `config.yaml.j2`).

| Language           | Host language  | Suffixes                     |
| ------------------ | -------------- | ---------------------------- |
| Jinja HTML         | HTML           | `html`, `htm`                |
| Jinja YAML         | YAML           | `yaml`, `yml`                |
| Jinja JSON         | JSON           | `json`                       |
| Jinja TOML         | TOML           | `toml`                       |
| Jinja SQL          | SQL            | `sql`                        |
| Jinja Markdown     | Markdown       | `md`, `markdown`             |
| Jinja XML          | XML            | `xml`                        |
| Jinja CSS          | CSS            | `css`                        |
| Jinja JavaScript   | JavaScript     | `js`                         |
| Jinja Python       | Python         | `py`                         |
| Jinja Shell Script | Shell Script   | `sh`, `bash`, `zsh`          |
| Jinja INI          | ini            | `ini`, `cfg`                 |
| Jinja Nginx        | Nginx          | `nginx`, `nginx.conf`        |
| Jinja Dockerfile   | Dockerfile     | `Dockerfile`, `dockerfile`   |

HTML, TOML, SQL, XML, INI, Nginx and Dockerfile are provided by other Zed
extensions: install them to get the host language highlighted.

Plain Jinja files (`.j2`, `.jinja`, `.jinja2`) are not claimed by this
extension. Other files can be associated with
[`file_types`](https://zed.dev/docs/configuring-languages#file-associations):

```json
{
  "file_types": {
    "Jinja YAML": ["**/templates/*.yml", "**/templates/*.yaml"]
  }
}
```

## Grammar

The tree-sitter grammar lives in [`grammar/`](grammar). Statements are parsed
as independent tags (no block matching), so partial templates and extension
tags (Ansible, Salt, …) parse without errors. Ansible-style dotted filter and
test names (`ansible.builtin.to_json`) are supported.

```sh
cd grammar
tree-sitter generate
tree-sitter test
```

## Development

The language folders are generated from `scripts/languages.tsv` and the shared
queries in `queries/`:

```sh
scripts/sync-languages.sh
```

To add a host language, add a line to `scripts/languages.tsv` and run the
script. Then use `zed: install dev extension` on this folder.
