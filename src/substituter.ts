import { generate } from 'astring'
import * as es from 'estree'
import createContext from './createContext'
import * as errors from './interpreter-errors'
import { parse } from './parser'
import { BlockExpression, Context, FunctionDeclarationExpression } from './types'
import * as ast from './utils/astCreator'
import {
  dummyBlockStatement,
  dummyExpression,
  dummyProgram,
  dummyStatement,
  dummyVariableDeclarator
} from './utils/dummyAstCreator'
import { evaluateBinaryExpression, evaluateUnaryExpression } from './utils/operators'
import * as rttc from './utils/rttc'

function isIrreducible(node: es.Node) {
  return ['Identifier', 'Literal', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
    node.type
  )
}

/* tslint:disable:no-shadowed-variable */
// wrapper function, calls substitute immediately.
function substituteMain(
  name: es.Identifier,
  replacement: es.FunctionExpression | es.Literal | es.ArrowFunctionExpression,
  target: es.Node
): es.Node {
  const seenBefore: Map<es.Node, es.Node> = new Map()
  /**
   * Substituters are invoked only when the target is not seen before,
   *  therefore each function has the responsbility of registering the
   *  [target, replacement] pair in seenBefore.
   * Substituter have two general steps:
   * 1. Create dummy replacement with 1. and push [target, dummyReplacement]
   *  into the seenBefore array.
   * 2. [recursive step] we substitute the children, and return the dummyReplacement.
   */
  const substituters = {
    Identifier(
      target: es.Identifier
    ): es.Identifier | FunctionDeclarationExpression | es.Literal | es.Expression {
      if (replacement.type === 'Literal') {
        // only accept string, boolean and numbers for arguments
        if (!['string', 'boolean', 'number'].includes(typeof replacement.value)) {
          throw new rttc.TypeError(
            replacement,
            '',
            'string, boolean or number',
            typeof replacement.value
          )
        } else {
          // target as Identifier is guaranteed to be a tree.
          return target.name === name.name ? ast.primitive(replacement.value) : target
        }
      } else {
        return target.name === name.name
          ? (substitute(replacement) as FunctionDeclarationExpression)
          : target
      }
    },

    ExpressionStatement(target: es.ExpressionStatement): es.ExpressionStatement {
      const substedExpressionStatement = ast.expressionStatement(dummyExpression())
      seenBefore.set(target, substedExpressionStatement)
      substedExpressionStatement.expression = substitute(target.expression) as es.Expression
      return substedExpressionStatement
    },

    BinaryExpression(target: es.BinaryExpression): es.BinaryExpression {
      const substedBinaryExpression = ast.binaryExpression(
        target.operator,
        dummyExpression(),
        dummyExpression(),
        target.loc!
      )
      seenBefore.set(target, substedBinaryExpression)
      substedBinaryExpression.left = substitute(target.left) as es.Expression
      substedBinaryExpression.right = substitute(target.right) as es.Expression
      return substedBinaryExpression
    },

    UnaryExpression(target: es.UnaryExpression): es.UnaryExpression {
      const substedUnaryExpression = ast.unaryExpression(
        target.operator,
        dummyExpression(),
        target.loc!
      )
      seenBefore.set(target, substedUnaryExpression)
      substedUnaryExpression.argument = substitute(target.argument) as es.Expression
      return substedUnaryExpression
    },

    ConditionalExpression(target: es.ConditionalExpression): es.ConditionalExpression {
      const substedConditionalExpression = ast.conditionalExpression(
        dummyExpression(),
        dummyExpression(),
        dummyExpression(),
        target.loc!
      )
      seenBefore.set(target, substedConditionalExpression)
      substedConditionalExpression.test = substitute(target.test) as es.Expression
      substedConditionalExpression.consequent = substitute(target.consequent) as es.Expression
      substedConditionalExpression.alternate = substitute(target.alternate) as es.Expression
      return substedConditionalExpression
    },

    CallExpression(target: es.CallExpression): es.CallExpression {
      const dummyArgs = target.arguments.map(() => dummyExpression())
      const substedCallExpression = ast.callExpression(dummyExpression(), dummyArgs, target.loc!)
      seenBefore.set(target, substedCallExpression)
      substedCallExpression.arguments = target.arguments.map(
        expn => substitute(expn) as es.Expression
      )
      // do not subst callee for 1. const declarations and 2. Formal argument
      // substitution of parameters
      // TODO
      if (replacement.type === 'Literal') {
        substedCallExpression.callee = target.callee as es.Expression
      } else {
        substedCallExpression.callee = substitute(target.callee) as es.Expression
      }
      return substedCallExpression
    },

    FunctionDeclaration(target: es.FunctionDeclaration): es.FunctionDeclaration {
      const substedFunctionDeclaration = ast.functionDeclaration(
        target.id,
        target.params,
        dummyBlockStatement()
      )
      seenBefore.set(target, substedFunctionDeclaration)
      // check for free/bounded variable
      for (const param of target.params) {
        if (param.type === 'Identifier' && param.name === name.name) {
          substedFunctionDeclaration.body = target.body
          return substedFunctionDeclaration
        }
      }
      substedFunctionDeclaration.body = substitute(target.body) as es.BlockStatement
      return substedFunctionDeclaration
    },

    FunctionExpression(target: es.FunctionExpression): es.FunctionExpression {
      const substedFunctionExpression = target.id
        ? ast.functionDeclarationExpression(target.id, target.params, dummyBlockStatement())
        : ast.functionExpression(target.params as es.Identifier[], dummyBlockStatement())
      seenBefore.set(target, substedFunctionExpression)
      // check for free/bounded variable
      for (const param of target.params) {
        if (param.type === 'Identifier' && param.name === name.name) {
          substedFunctionExpression.body = target.body
          return substedFunctionExpression
        }
      }
      substedFunctionExpression.body = substitute(target.body) as es.BlockStatement
      return substedFunctionExpression
    },

    Program(target: es.Program): es.Program {
      const substedProgram = ast.program(target.body.map(() => dummyStatement()))
      seenBefore.set(target, substedProgram)
      substedProgram.body = target.body.map(stmt => substitute(stmt) as es.Statement)
      return substedProgram
    },

    BlockStatement(target: es.BlockStatement): es.BlockStatement {
      const substedBody = target.body.map(() => dummyStatement())
      const substedBlockStatement = ast.blockStatement(substedBody)
      seenBefore.set(target, substedBlockStatement)
      substedBlockStatement.body = target.body.map(stmt => substitute(stmt) as es.Statement)
      return substedBlockStatement
    },

    ReturnStatement(target: es.ReturnStatement): es.ReturnStatement {
      const substedReturnStatement = ast.returnStatement(dummyExpression(), target.loc!)
      seenBefore.set(target, substedReturnStatement)
      substedReturnStatement.argument = substitute(target.argument!) as es.Expression
      return substedReturnStatement
    },

    // source 1
    ArrowFunctionExpression(target: es.ArrowFunctionExpression): es.ArrowFunctionExpression {
      const substedArrow = ast.arrowFunctionExpression(target.params, dummyBlockStatement())
      seenBefore.set(target, substedArrow)
      // check for free/bounded variable
      for (const param of target.params) {
        if (param.type === 'Identifier' && param.name === name.name) {
          substedArrow.body = target.body
          substedArrow.expression = target.body.type !== 'BlockStatement'
          return substedArrow
        }
      }
      substedArrow.body = substitute(target.body) as es.BlockStatement | es.Expression
      substedArrow.expression = target.body.type !== 'BlockStatement'
      return substedArrow
    },

    VariableDeclaration(target: es.VariableDeclaration): es.VariableDeclaration {
      const substedVariableDeclaration = ast.variableDeclaration([dummyVariableDeclarator()])
      seenBefore.set(target, substedVariableDeclaration)
      substedVariableDeclaration.declarations = target.declarations.map(
        substitute
      ) as es.VariableDeclarator[]
      return substedVariableDeclaration
    },

    VariableDeclarator(target: es.VariableDeclarator): es.VariableDeclarator {
      const substedVariableDeclarator = ast.variableDeclarator(target.id, dummyExpression())
      seenBefore.set(target, substedVariableDeclarator)
      substedVariableDeclarator.init =
        target.id.type === 'Identifier' && name.name === target.id.name
          ? target.init
          : // in source, we only allow const, and hence init cannot be undefined
            (substitute(target.init!) as es.Expression)
      return substedVariableDeclarator
    },

    IfStatement(target: es.IfStatement): es.IfStatement {
      const substedIfStatement = ast.ifStatement(
        dummyExpression(),
        dummyBlockStatement(),
        dummyBlockStatement(),
        target.loc!
      )
      seenBefore.set(target, substedIfStatement)
      substedIfStatement.test = substitute(target.test) as es.Expression
      substedIfStatement.consequent = substitute(target.consequent) as es.BlockStatement
      substedIfStatement.alternate = target.alternate
        ? (substitute(target.alternate) as es.BlockStatement)
        : null
      return substedIfStatement
    }
  }

  /**
   * For mapper use, maps a [symbol, value] pair to the node supplied.
   * @param name the name to be replaced
   * @param replacement the expression to replace the name with
   * @param node a node holding the target symbols
   * @param seenBefore a list of nodes that are seen before in substitution
   */
  function substitute(target: es.Node): es.Node {
    const result = seenBefore.get(target)
    if (result) {
      return result
    }
    const substituter = substituters[target.type]
    if (substituter === undefined) {
      seenBefore.set(target, target)
      return target // no need to subst, such as literals
    } else {
      // substituters are responsible of registering seenBefore
      return substituter(target)
    }
  }
  return substitute(target)
}

/**
 * Substitutes a call expression with the body of the callee (funExp)
 * and the body will have all ocurrences of parameters substituted
 * with the arguments.
 * @param call call expression with callee as functionExpression
 * @param args arguments supplied to the call expression
 */
function apply(
  callee: es.FunctionExpression | es.ArrowFunctionExpression,
  args: Array<es.Identifier | es.Literal | es.FunctionExpression | es.ArrowFunctionExpression>
): BlockExpression | es.Expression {
  let substedBody = callee.body
  for (let i = 0; i < args.length; i++) {
    // source discipline requires parameters to be identifiers.
    const param = callee.params[i] as es.Identifier
    const arg = args[i] as es.Literal

    substedBody = substituteMain(param, arg, substedBody) as typeof substedBody
  }

  if (callee.type === 'ArrowFunctionExpression' && callee.expression) {
    return substedBody as es.Expression
  }

  const firstStatement: es.Statement = (substedBody as es.BlockStatement).body[0]
  return firstStatement.type === 'ReturnStatement'
    ? (firstStatement.argument as es.Expression)
    : ast.blockExpression((substedBody as es.BlockStatement).body)
}

const reducers = {
  // source 0
  Identifier(node: es.Identifier, context: Context): [es.Node, Context] {
    // can only be built ins. the rest should have been declared
    const globalFrame = context.runtime.environments[0].head
    if (!(node.name in globalFrame)) {
      throw new errors.UndefinedVariable(node.name, node)
    } else {
      // builtin functions will remain as name
      if (typeof globalFrame[node.name] === 'function') {
        return [node, context]
      } else {
        return [globalFrame[node.name], context]
      }
    }
  },

  ExpressionStatement(node: es.ExpressionStatement, context: Context): [es.Node, Context] {
    const [reduced] = reduce(node.expression, context)
    return [
      reduced.type.includes('Statement')
        ? reduced
        : ast.expressionStatement(reduced as es.Expression),
      context
    ]
  },

  BinaryExpression(node: es.BinaryExpression, context: Context): [es.Node, Context] {
    const { operator, left, right } = node
    if (left.type === 'Literal') {
      if (right.type === 'Literal') {
        const error = rttc.checkBinaryExpression(node, operator, left.value, right.value)
        if (error === undefined) {
          const lit = ast.literal(evaluateBinaryExpression(operator, left.value, right.value))
          return [lit, context]
        } else {
          throw error
        }
      } else {
        const [reducedRight] = reduce(right, context)
        const reducedExpression = ast.binaryExpression(
          operator,
          left,
          reducedRight as es.Expression,
          node.loc!
        )
        return [reducedExpression, context]
      }
    } else {
      const [reducedLeft] = reduce(node.left, context)
      const reducedExpression = ast.binaryExpression(
        operator,
        reducedLeft as es.Expression,
        right,
        node.loc!
      )
      return [reducedExpression, context]
    }
  },

  UnaryExpression(node: es.UnaryExpression, context: Context): [es.Node, Context] {
    const { operator, argument } = node
    if (argument.type === 'Literal') {
      const error = rttc.checkUnaryExpression(node, operator, argument.value)
      if (error === undefined) {
        return [ast.literal(evaluateUnaryExpression(operator, argument.value)), context]
      } else {
        throw error
      }
    } else {
      const [reducedArgument] = reduce(argument, context)
      const reducedExpression = ast.unaryExpression(
        operator,
        reducedArgument as es.Expression,
        node.loc!
      )
      return [reducedExpression, context]
    }
  },

  LogicalExpression(node: es.LogicalExpression, context: Context): [es.Node, Context] {
    const { left, right } = node
    if (left.type === 'Literal') {
      if (typeof left.value !== 'boolean') {
        throw new rttc.TypeError(
          left,
          ' on left hand side of operation',
          'boolean',
          typeof left.value
        )
      } else {
        if (right.type === 'Literal' && typeof right.value !== 'boolean') {
          throw new rttc.TypeError(
            left,
            ' on left hand side of operation',
            'boolean',
            typeof left.value
          )
        } else {
          const result =
            node.operator === '&&'
              ? left.value
                ? right
                : ast.expressionStatement(ast.literal(false, node.loc!))
              : left.value
              ? ast.expressionStatement(ast.literal(true, node.loc!))
              : right
          return [result as es.Node, context]
        }
      }
    } else {
      const [reducedLeft] = reduce(left, context)
      return [
        ast.logicalExpression(
          node.operator,
          reducedLeft as es.Expression,
          right,
          node.loc!
        ) as es.Node,
        context
      ]
    }
  },

  ConditionalExpression(node: es.ConditionalExpression, context: Context): [es.Node, Context] {
    const { test, consequent, alternate } = node
    if (test.type === 'Literal') {
      const error = rttc.checkIfStatement(node, test.value)
      if (error === undefined) {
        return [(test.value ? consequent : alternate) as es.Expression, context]
      } else {
        throw error
      }
    } else {
      const [reducedTest] = reduce(test, context)
      const reducedExpression = ast.conditionalExpression(
        reducedTest as es.Expression,
        consequent,
        alternate,
        node.loc!
      )
      return [reducedExpression, context]
    }
  },

  // core of the subst model
  CallExpression(node: es.CallExpression, context: Context): [es.Node, Context] {
    const [callee, args] = [node.callee, node.arguments]
    // source 0: discipline: any expression can be transformed into either literal, ident(builtin) or funexp
    // if functor can reduce, reduce functor
    if (!isIrreducible(callee)) {
      return [
        ast.callExpression(
          reduce(callee, context)[0] as es.Expression,
          args as es.Expression[],
          node.loc!
        ),
        context
      ]
    } else if (callee.type === 'Literal') {
      throw new errors.CallingNonFunctionValue(callee, node)
    } else if (
      callee.type === 'Identifier' &&
      !(callee.name in context.runtime.environments[0].head)
    ) {
      throw new errors.UndefinedVariable(callee.name, callee)
    } else {
      // callee is builtin or funexp
      if (
        (callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') &&
        args.length !== callee.params.length
      ) {
        throw new errors.InvalidNumberOfArguments(node, args.length, callee.params.length)
      } else {
        for (let i = 0; i < args.length; i++) {
          const currentArg = args[i]
          if (!isIrreducible(currentArg)) {
            const reducedArgs = [
              ...args.slice(0, i),
              reduce(currentArg, context)[0],
              ...args.slice(i + 1)
            ]
            return [
              ast.callExpression(
                callee as es.Expression,
                reducedArgs as es.Expression[],
                node.loc!
              ),
              context
            ]
          }
          if (
            currentArg.type === 'Identifier' &&
            !(currentArg.name in context.runtime.environments[0].head)
          ) {
            throw new errors.UndefinedVariable(currentArg.name, currentArg)
          }
        }
      }
      // if it reaches here, means all the arguments are legal.
      return [
        callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression'
          ? apply(
              callee as FunctionDeclarationExpression,
              args as Array<es.Literal | es.Identifier>
            )
          : context.runtime.environments[0].head[name](...args),
        context
      ]
    }
  },

  Program(node: es.Program, context: Context): [es.Node, Context] {
    const [firstStatement, ...otherStatements] = node.body
    if (firstStatement.type === 'ExpressionStatement' && isIrreducible(firstStatement.expression)) {
      return [ast.program(otherStatements as es.Statement[]), context]
    } else if (firstStatement.type === 'FunctionDeclaration') {
      let funDecExp = ast.functionDeclarationExpression(
        firstStatement.id!,
        firstStatement.params,
        firstStatement.body
      ) as FunctionDeclarationExpression
      // substitute body
      funDecExp = substituteMain(
        funDecExp.id,
        funDecExp,
        funDecExp
      ) as FunctionDeclarationExpression
      // substitute the rest of the program
      const remainingProgram = ast.program(otherStatements as es.Statement[])
      return [substituteMain(funDecExp.id, funDecExp, remainingProgram), context]
    } else if (firstStatement.type === 'VariableDeclaration') {
      const { kind, declarations } = firstStatement
      if (kind !== 'const') {
        // TODO: cannot use let or var
        return [dummyProgram(), context]
      } else if (
        declarations.length <= 0 ||
        declarations.length > 1 ||
        declarations[0].type !== 'VariableDeclarator' ||
        !declarations[0].init
      ) {
        // TODO: syntax error
        return [dummyProgram(), context]
      } else {
        const declarator = declarations[0] as es.VariableDeclarator
        const rhs = declarator.init!
        if (declarator.id.type !== 'Identifier') {
          // TODO: source does not allow destructuring
        } else if (rhs.type === 'Literal') {
          const remainingProgram = ast.program(otherStatements as es.Statement[])
          return [substituteMain(declarator.id, rhs, remainingProgram), context]
        } else if (rhs.type === 'ArrowFunctionExpression') {
          let funDecExp = ast.functionDeclarationExpression(
            declarator.id,
            rhs.params,
            rhs.body.type === 'BlockStatement'
              ? rhs.body
              : ast.blockStatement([ast.returnStatement(rhs.body)])
          ) as FunctionDeclarationExpression
          // substitute body
          funDecExp = substituteMain(
            funDecExp.id,
            funDecExp,
            funDecExp
          ) as FunctionDeclarationExpression
          // substitute the rest of the program
          const remainingProgram = ast.program(otherStatements as es.Statement[])
          return [substituteMain(funDecExp.id, funDecExp, remainingProgram), context]
        } else {
          const [reducedRhs] = reduce(rhs, context)
          return [
            ast.program([
              ast.declaration(
                declarator.id.name,
                'const',
                reducedRhs as es.Expression
              ) as es.Statement,
              ...(otherStatements as es.Statement[])
            ]),
            context
          ]
        }
      }
    }
    const [reduced] = reduce(firstStatement, context)
    return [ast.program([reduced as es.Statement, ...(otherStatements as es.Statement[])]), context]
  },

  BlockStatement(node: es.BlockStatement, context: Context): [es.Node, Context] {
    const [firstStatement, ...otherStatements] = node.body
    if (firstStatement.type === 'ReturnStatement') {
      const arg = firstStatement.argument as es.Expression
      if (isIrreducible(arg)) {
        return [ast.expressionStatement(arg), context]
      } else {
        const reducedReturn = ast.returnStatement(
          reduce(arg, context)[0] as es.Expression,
          firstStatement.loc!
        )
        return [ast.blockStatement([reducedReturn, ...otherStatements]), context]
      }
    } else if (
      firstStatement.type === 'ExpressionStatement' &&
      isIrreducible(firstStatement.expression)
    ) {
      return [ast.program(otherStatements), context]
    } else if (firstStatement.type === 'FunctionDeclaration') {
      let funDecExp = ast.functionDeclarationExpression(
        firstStatement.id!,
        firstStatement.params,
        firstStatement.body,
        firstStatement.loc!
      ) as FunctionDeclarationExpression
      // substitute body
      funDecExp = substituteMain(
        funDecExp.id,
        funDecExp,
        funDecExp
      ) as FunctionDeclarationExpression
      // substitute the rest of the program
      const remainingBlock = ast.blockStatement(otherStatements)
      return [substituteMain(funDecExp.id, funDecExp, remainingBlock), context]
    } else {
      const [reduced] = reduce(firstStatement, context)
      return [ast.program([reduced as es.Statement, ...otherStatements]), context]
    }
  },

  // source 1
  IfStatement(node: es.IfStatement, context: Context): [es.Node, Context] {
    const { test, consequent, alternate } = node
    if (test.type === 'Literal') {
      const error = rttc.checkIfStatement(node, test.value)
      if (error === undefined) {
        return [(test.value ? consequent : alternate) as es.Statement, context]
      } else {
        throw error
      }
    } else {
      const [reducedTest] = reduce(test, context)
      const reducedIfStatement = ast.ifStatement(
        reducedTest as es.Expression,
        consequent as es.BlockStatement,
        alternate as es.IfStatement | es.BlockStatement,
        node.loc!
      )
      return [reducedIfStatement, context]
    }
  }
}

function reduce(node: es.Node, context: Context): [es.Node, Context] {
  const reducer = reducers[node.type]
  if (reducer === undefined) {
    return [ast.program([]), context] // exit early
    // return [node, context] // if reducer is not found we just get stuck
  } else {
    return reducer(node, context)
  }
}

// TODO: change the context to include the predefined fn names
function substPredefinedFns(node: es.Node, context: Context): [es.Node, Context] {
  /*
  const globalFrame = context.runtime.environments[0].head
  let predefinedFns: Array<es.FunctionDeclaration> = globalFrame.keys
    .filter((name: string) => context.predefinedFnNames.includes(name))
    .map((name: string) => globalFrame[name])
  for (let i = 0; i < predefinedFns.length; i++) {
    node = substitute(predefinedFns[i], node)
  }
  */
  return [node, context]
}

export function treeifyMain(program: es.Program): es.Program {
  // recurse down the program like substitute
  // if see a function at expression position,
  //   has an identifier: replace with the name
  //   else: replace with an identifer "=>"
  const treeifiers = {
    // Identifier: return
    ExpressionStatement: (target: es.ExpressionStatement): es.ExpressionStatement => {
      return ast.expressionStatement(treeify(target.expression) as es.Expression)
    },

    BinaryExpression: (target: es.BinaryExpression) => {
      return ast.binaryExpression(
        target.operator,
        treeify(target.left) as es.Expression,
        treeify(target.right) as es.Expression
      )
    },

    UnaryExpression: (target: es.UnaryExpression): es.UnaryExpression => {
      return ast.unaryExpression(target.operator, treeify(target.argument) as es.Expression)
    },

    ConditionalExpression: (target: es.ConditionalExpression): es.ConditionalExpression => {
      return ast.conditionalExpression(
        treeify(target.test) as es.Expression,
        treeify(target.consequent) as es.Expression,
        treeify(target.alternate) as es.Expression
      )
    },

    CallExpression: (target: es.CallExpression): es.CallExpression => {
      return ast.callExpression(
        treeify(target.callee) as es.Expression,
        target.arguments.map(arg => treeify(arg) as es.Expression)
      )
    },

    FunctionDeclaration: (target: es.FunctionDeclaration): es.FunctionDeclaration => {
      return ast.functionDeclaration(target.id, target.params, treeify(
        target.body
      ) as es.BlockStatement)
    },

    // CORE
    FunctionExpression: (target: es.FunctionExpression): es.Identifier => {
      return ast.identifier(target.id ? target.id.name : '=>')
    },

    Program: (target: es.Program): es.Program => {
      return ast.program(target.body.map(stmt => treeify(stmt) as es.Statement))
    },

    BlockStatement: (target: es.BlockStatement): es.BlockStatement => {
      return ast.blockStatement(target.body.map(stmt => treeify(stmt) as es.Statement))
    },

    ReturnStatement: (target: es.ReturnStatement): es.ReturnStatement => {
      return ast.returnStatement(treeify(target.argument!) as es.Expression)
    },

    // source 1
    VariableDeclaration: (target: es.VariableDeclaration): es.VariableDeclaration => {
      return ast.variableDeclaration(target.declarations.map(treeify) as es.VariableDeclarator[])
    },

    VariableDeclarator: (target: es.VariableDeclarator): es.VariableDeclarator => {
      return ast.variableDeclarator(target.id, treeify(target.init!) as es.Expression)
    },

    IfStatement: (target: es.IfStatement): es.IfStatement => {
      return ast.ifStatement(
        treeify(target.test) as es.Expression,
        treeify(target.consequent) as es.BlockStatement,
        treeify(target.alternate!) as es.BlockStatement | es.IfStatement
      )
    },

    // CORE
    ArrowFunctionExpression: (target: es.ArrowFunctionExpression): es.Identifier => {
      return ast.identifier('=>')
    }
  }

  function treeify(target: es.Node): es.Node {
    const treeifier = treeifiers[target.type]
    if (treeifier === undefined) {
      return target
    } else {
      return treeifier(target)
    }
  }

  return treeify(program) as es.Program
}

// the context here is for builtins
export function getEvaluationSteps(program: es.Program, context: Context): es.Node[] {
  const steps: es.Node[] = []
  try {
    // starts with substituting predefined fns.
    let [reduced] = substPredefinedFns(program, context)
    while ((reduced as es.Program).body.length > 0) {
      steps.push(reduced)
      // some bug with no semis
      // tslint:disable-next-line
      ;[reduced] = reduce(reduced, context)
    }
    return steps.map(step => treeifyMain(step as es.Program))
  } catch (error) {
    context.errors.push(error)
    return steps.map(step => treeifyMain(step as es.Program))
  }
}

function debug() {
  const code = `function f(g, x) {return g(x);} f(x=>2, 1);`
  const context = createContext(1)
  const program = parse(code, context)
  const steps = getEvaluationSteps(program!, context)
  return steps.map(treeifyMain).map(generate)
}

debug()
