from parsing.code_parser import CodeParser

def test_ast():
    parser = CodeParser()

    python_code = """
import os
from sys import path

class MyServer:
    def __init__(self):
        self.port = 8080

    async def start(self):
        print("Started")

def global_helper():
    pass
"""

    js_code = """
import { useState } from 'react';

class Widget extends React.Component {
    render() { return null; }
}

function useWidget() {
    return true;
}

const arrowFunc = () => { console.log("arrow"); }
"""

    print("PYTHON CLASSES:", parser.extract_classes(python_code, "python"))
    print("PYTHON FUNCTIONS:", parser.extract_functions(python_code, "python"))

    print("JS CLASSES:", parser.extract_classes(js_code, "javascript"))
    print("JS FUNCTIONS:", parser.extract_functions(js_code, "javascript"))

if __name__ == "__main__":
    test_ast()
