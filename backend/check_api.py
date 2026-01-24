
import tree_sitter
from tree_sitter import Language, Parser
import tree_sitter_python

try:
    PY_LANGUAGE = Language(tree_sitter_python.language())
    query = PY_LANGUAGE.query("(import_statement) @import")
    print("Query object attributes:")
    print(dir(query))
except Exception as e:
    print(e)
