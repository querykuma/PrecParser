/* eslint-disable max-classes-per-file */
let isNumber = (str) => str.length > 0 && !isNaN(Number(str));

class Evaluator {

  constructor(ast) {

    this.ast = ast;

  }

  eval() {

    let value = this.eval_ast(this.ast);

    return value;

  }

  eval_ast(ast) {

    if (ast instanceof Object) {

      let op = ast.op.op;
      let left = this.eval_ast(ast.left);
      let right = this.eval_ast(ast.right);

      switch (op) {

        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '**':
        case '^':
          return left ** right;

        default:
          throw new Error("unexpected operator: " + op);

      }

    } else {

      // Leaf is Number
      return Number(ast);

    }

  }

}
class Lexer {

  constructor(text) {

    this.text = text;
    this.tokens = [];
    this.index = 0;
    this.parse();
    this.length = this.tokens.length;

  }

  fix_minus_sub(i) {

    let j = i;
    let is_minus = false;
    let tokens = this.tokens;
    let token;

    for (; j < tokens.length; j++) {

      token = tokens[j];

      switch (token) {

        case '+':
          break;
        case '-':
          is_minus = !is_minus;
          break;
        case '(':
        case ')':
          if (is_minus) {

            return [j, ['-1', '*', token], true];

          }
          return [j, [token], true];

        default:
          if (isNumber(token)) {

            if (is_minus) {

              token = "-" + token;

            }
            return [j, [token], false];

          }
          throw new Error("unexpected token: " + token);

      }

    }
    return [j, [token], false];

  }

  /**
   * マイナスと数値の並びをマイナスの数値に修正する。
   * たとえば[-,-,-,1,-,-,2]を[-1,-,-2]に修正する。
   * @memberof Lexer
   */
  fix_minus() {

    let next_is_number = true;
    let tokens = this.tokens;
    let new_tokens = [];
    let token_ary;
    let is_paren;

    for (let i = 0; i < tokens.length; i++) {

      if (next_is_number) {

        [i, token_ary, is_paren] = this.fix_minus_sub(i);
        new_tokens.push(...token_ary);
        if (!is_paren) {

          next_is_number = !next_is_number;

        }

      } else {

        let token = tokens[i];

        new_tokens.push(token);

        if (!(token === '(' || token === ')')) {

          next_is_number = !next_is_number;

        }

      }

    }
    this.tokens = new_tokens;

  }

  parse() {

    let text = this.text;

    for (; ;) {

      let m = text.match(/^\s*(\+|-|\*{1,2}|\/|%|\^|[\d.]+|\(|\))\s*(.*)$/su);

      if (!m) {

        if (text) {

          throw new Error("lexer can't perse: '" + text + "'");

        }
        break;

      }

      let token = m[1];

      this.tokens.push(token);

      text = m[2];

    }

    this.fix_minus();

  }

  get_token(flags) {

    if (this.index >= this.length) {

      return "";

    }
    let token = this.tokens[this.index];

    if (!(flags && flags.peek)) {

      this.index++;

    }

    return token;

  }

}
class Tree {

  constructor(op, left, right) {

    this.op = op;
    this.left = left;
    this.right = right;

  }

  toString() {

    return "(" + this.left + " " + this.op + " " + this.right + ")";

  }

}
class Precedence {

  constructor(op, prec, left_assoc) {

    this.op = op;
    this.prec = prec;
    this.left_assoc = left_assoc;

  }

  toString() {

    return this.op;

  }

}
class PrecParser {

  constructor(lexer) {

    this.lexer = lexer;
    this.operators = {};
    this.register_operators();

  }

  make_ast() {

    let expression = this.expression();
    let token = this.lexer.get_token({ "peek": true });

    if (token) {

      throw new Error("Error unread token: " + token);

    }
    return expression;

  }

  expression() {

    let val = this.factor();
    let next_op = this.get_next_op({ "peek": true });

    while (next_op) {

      val = this.do_shift(val, 0);
      next_op = this.get_next_op({ "peek": true });

    }

    return val;

  }

  static isRightAssoc(op, next_op) {

    if (!next_op) {

      return false;

    }

    if (next_op.left_assoc) {

      return op.prec < next_op.prec;

    }

    return op.prec <= next_op.prec;

  }

  do_shift(left_in, depth) {

    let left = left_in;
    let op = this.get_next_op();
    let right = this.factor();
    let next_op = this.get_next_op({ "peek": true });
    let is_right_assoc = PrecParser.isRightAssoc(op, next_op);

    while (next_op && is_right_assoc) {

      right = this.do_shift(right, depth + 1);
      next_op = this.get_next_op({ "peek": true });
      is_right_assoc = PrecParser.isRightAssoc(op, next_op);

    }

    // console.log(" ".repeat(depth * 2) + op + " " + left + " " + right);

    let tree = new Tree(op, left, right);

    return tree;

  }

  get_next_op(flags) {

    let token = this.lexer.get_token(flags);

    if (token === "" || token == ")") {

      return null;

    }

    let op = this.operators[token];

    if (!op) {

      throw new Error("operator not found: '" + token + "'");

    }

    return op;

  }

  factor() {

    let token = this.lexer.get_token();

    if (token === "(") {

      let ast = this.expression();
      let token2 = this.lexer.get_token();

      if (token2 !== ")") {

        throw new Error("token2 !== )");

      }

      return ast;

    } else if (!isNumber(token)) {

      throw new Error("not number: '" + token + "'");

    }

    return token;

  }

  register_operators() {

    this.add_operator('+', 1, true);
    this.add_operator('-', 1, true);
    this.add_operator('*', 2, true);
    this.add_operator('/', 2, true);
    this.add_operator('%', 2, true);
    this.add_operator('^', 3, false);
    this.add_operator('**', 3, false);

  }

  add_operator(op, prec, left_assoc) {

    let p = new Precedence(op, prec, left_assoc);

    this.operators[op] = p;

  }

}
class Main {

  constructor() {

    this.button_input = document.getElementById("button_input");
    this.button_clear = document.getElementById("button_clear");
    this.textarea = document.getElementById("textarea");
    this.output = document.getElementById("output");

    this.button_input.addEventListener("click", () => this.button_input_click());
    this.button_clear.addEventListener("click", () => this.button_clear_click());

  }

  button_input_click() {

    let text = this.textarea.value;

    this.output.textContent = "";

    try {

      this.lexer = new Lexer(text);

      this.prec_parser = new PrecParser(this.lexer);
      this.ast = this.prec_parser.make_ast();

      this.output.textContent += this.ast + "\n";

      this.evaluator = new Evaluator(this.ast);
      this.value = this.evaluator.eval();

      this.output.textContent += this.value + "\n";

    } catch (error) {

      console.error(error);
      this.output.textContent += error + "\n";

    }

  }

  button_clear_click() {

    this.output.textContent = "";

  }

}
let loaded = () => {

  // eslint-disable-next-line no-unused-vars
  let main = new Main();

};

document.addEventListener("DOMContentLoaded", loaded);
