# PrecParser

Operator Precedence Parsingで数式を構文解析して計算するJavaScriptのプログラムです。

## 数式入力のデモ

https://querykuma.github.io/PrecParser

## 文法規則

factor:  NUMBER | "(" expression ")"<br>
expression:  factor | factor (+|-|*|/|^|**) factor

## 演算子の優先順位

| 演算子 | 優先順位 | 結合法則 |
| ------ | -------- | -------- |
| +, -   | 1        | 左       |
| *, /   | 2        | 左       |
| ^, **  | 3        | 右       |

## License

This software is released under the MIT License.
