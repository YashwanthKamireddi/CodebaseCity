
import tree_sitter
try:
    print("QueryCursor exists:", hasattr(tree_sitter, 'QueryCursor'))
    if hasattr(tree_sitter, 'QueryCursor'):
        print("QueryCursor dir:", dir(tree_sitter.QueryCursor))
except Exception as e:
    print(e)
