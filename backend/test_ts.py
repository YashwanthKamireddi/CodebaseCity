import tree_sitter
import tree_sitter_python
q = tree_sitter.Query(tree_sitter.Language(tree_sitter_python.language()), "(class_definition name: (identifier) @name)")
parser = tree_sitter.Parser(tree_sitter.Language(tree_sitter_python.language()))
tree = parser.parse(b"def foo():\n  pass\nclass Bar:\n  pass")
node = tree.root_node
print("Node type:", node.type)
cursor = tree_sitter.QueryCursor(q)
print("Matches:")
for m in cursor.matches(node):
    print(m)
print("Captures:")
for m in cursor.captures(node):
    print(m)
