import { TypeAnnotatedNode, Variable, Type } from '../types'
import * as es from 'estree'
import { ancestor } from 'acorn-walk/dist/walk'

const predefined = new Set([
  '-',
  '*',
  '/',
  '%',
  '&&',
  '||',
  '!',
  '+',
  '===',
  '!==',
  '>',
  '>=',
  '<',
  '<=',
  'display',
  'error',
  'Infinity',
  'is_boolean',
  'is_function',
  'is_number',
  'is_string',
  'is_undefined',
  'math_abs',
  'math_acosh',
  'math_acos',
  'math_asin',
  'math_asinh',
  'math_atan',
  'math_atan2',
  'math_atanh',
  'math_cbrt',
  'math_ceil',
  'math_clz32',
  'math_cos',
  'math_cosh',
  'math_exp',
  'math_expml',
  'math_floor',
  'math_fround',
  'math_hypot',
  'math_imul',
  'math_LN2',
  'math_LN10',
  'math_log',
  'math_log1p',
  'math_log2',
  'math_LOG2E',
  'math_log10',
  'math_LOG10E',
  'math_max',
  'math_min',
  'math_PI',
  'math_pow',
  'math_random',
  'math_round',
  'math_sign',
  'math_sin',
  'math_sinh',
  'math_sqrt',
  'math_SQRT1_2',
  'math_SQRT2',
  'math_tan',
  'math_tanh',
  'math_trunc',
  'NaN',
  'parse_int',
  'prompt',
  'runtime',
  'stringify',
  'undefined',
  // Source 4 functions
  'is_list',
  'equal',
  'length',
  'map',
  'build',
  'build_list',
  'for_each',
  'list_to_string',
  'rev',
  'reverse',
  'append',
  'member',
  'remove',
  'remove_all',
  'filter',
  'enum_list',
  'list_ref',
  'accumulate',
  'is_stream',
  'list_to_stream',
  'stream_to_list',
  'stream_length',
  'stream_map',
  'build_stream',
  'stream_for_each',
  'stream_reverse',
  'stream_append',
  'stream_member',
  'stream_remove',
  'stream_remove_all',
  'stream_filter',
  'enum_stream',
  'integers_from',
  'eval_stream',
  'stream_ref'
])

export function printType(type: Type): string {
  // if (type === null) return 'null'
  switch (type.kind) {
    case 'primitive':
      return type.name
    case 'variable':
      return type.isAddable ? `A${type.id}` : `T${type.id}`
    case 'function':
      let params = ''
      for (const argument of type.parameterTypes) {
        params += printType(argument) + ', '
      }
      // remove last comma
      params = params.replace(/,\s*$/, '')
      const returnType = printType(type.returnType)
      return `(${params}) => ${returnType}`
    default:
      return 'Not included in Source 1!'
  }
}

export function printTypeConstraints(typeContraints: Map<Type, Type>) {
  let typeConstraintString = 'Printing Type Constraints:\n'
  for (const [key, value] of typeContraints) {
    typeConstraintString += `${printType(key)} = ${printType(value)}\n`
  }
  typeConstraintString += '\n'
  console.log(typeConstraintString)
}

export function printTypeEnvironment(typeEnvironment: Map<string, any>) {
  // Put everything in one string so test cases can monitor the string in the console.
  let typeEnvironmentString = 'Printing Type Environment:\n'
  for (const [key, value] of typeEnvironment) {
    if (predefined.has(key)) {
      continue
    }
    typeEnvironmentString += `${key} <- ${printType(value.types[0])}\n`
  }
  console.log(typeEnvironmentString)
}

export function printTypeAnnotation(program: TypeAnnotatedNode<es.Program>) {
  let resultString = 'Initial Type Annotations:\n'
  function getTypeVariableId(node: TypeAnnotatedNode<es.Node>): string {
    return `T${(node.typeVariable as Variable).id}`
  }
  function getExpressionString(node: TypeAnnotatedNode<es.Node>): string {
    switch (node.type) {
      case 'Literal': {
        return `${(node as es.Literal).raw}`
      }
      case 'Identifier': {
        return (node as es.Identifier).name
      }
      case 'BinaryExpression': {
        node = node as es.BinaryExpression
        const left = getExpressionString(node.left)
        const right = getExpressionString(node.right)
        const operator = node.operator
        return `${left} ${operator} ${right}`
      }
      case 'UnaryExpression': {
        node = node as es.UnaryExpression
        const operator = node.operator
        const argument = getExpressionString(node.argument)
        return `${operator}${argument}`
      }
      case 'ArrowFunctionExpression': {
        // Arrow function expressions may not always have an identifier, so they are represented by a type variable
        return getTypeVariableId(node)
      }
      case 'FunctionDeclaration': {
        return getExpressionString(node.id as es.Identifier)
      }
      case 'LogicalExpression': {
        node = node as es.LogicalExpression
        const left = getExpressionString(node.left)
        const right = getExpressionString(node.right)
        const operator = node.operator
        return `${left} ${operator} ${right}`
      }
      case 'CallExpression': {
        node = node as es.CallExpression
        const callee = getExpressionString(node.callee)
        let params = '('
        for (const argument of node.arguments) {
          params += getExpressionString(argument) + ', '
        }
        // remove last comma
        params = params.replace(/,\s*$/, '')
        params += ')'
        return `${callee}${params}`
      }
      case 'ConditionalExpression': {
        node = node as es.ConditionalExpression
        const test = getExpressionString(node.test)
        const alternate = getExpressionString(node.alternate)
        const consequent = getExpressionString(node.consequent)
        return `${test} ? ${alternate} : ${consequent}`
      }
      case 'IfStatement': {
        node = node as es.IfStatement
        const test = getExpressionString(node.test)
        const consequent = getExpressionString(node.consequent)
        const alternate = getExpressionString(node.alternate!)
        return `if ${test} ${consequent} else ${alternate}`
      }
      case 'BlockStatement': {
        return '{...}'
      }
      case 'ReturnStatement': {
        // return 'return (...)'
        node = node as es.ReturnStatement
        node.argument = node.argument as es.Expression
        const argument = getExpressionString(node.argument)
        return `return ${argument}`
      }
      default:
        return 'This node type is not in Source 1'
    }
  }

  function printConstantDeclaration(declaration: TypeAnnotatedNode<es.VariableDeclarator>) {
    const id: TypeAnnotatedNode<es.Pattern> = declaration.id
    resultString += `${(id as es.Identifier).name}: ${getTypeVariableId(id)}\n`
  }

  // Q: Why does printIdentifier only handle usage `x^T4` but not declaration `const x^T2` even tho there is an Identifier node in VariableDeclarator
  function printIdentifier(identifier: TypeAnnotatedNode<es.Identifier>) {
    resultString += `${identifier.name}: ${getTypeVariableId(identifier)}\n`
  }

  function printUnaryExpression(unaryExpression: TypeAnnotatedNode<es.UnaryExpression>) {
    resultString += `${getExpressionString(unaryExpression.argument)}: ${getTypeVariableId(
      unaryExpression.argument
    )}\n`
    resultString += `${getExpressionString(unaryExpression)}: ${getTypeVariableId(
      unaryExpression
    )}\n`
  }

  function printFunctionDeclaration(
    functionDeclaration: TypeAnnotatedNode<es.FunctionDeclaration>
  ) {
    let res = '('
    for (const param of (functionDeclaration as es.FunctionDeclaration).params) {
      res += getTypeVariableId(param) + ', '
    }
    // remove last comma
    res = res.replace(/,\s*$/, '')
    res += ') => '
    const result = (functionDeclaration as es.FunctionDeclaration).body
    res += getTypeVariableId(result)
    resultString += `${getExpressionString(functionDeclaration)}: ${res}`
  }

  function printFunctionDefinition(
    functionDefinition: TypeAnnotatedNode<es.ArrowFunctionExpression>
  ) {
    let res = '('
    for (const param of (functionDefinition as es.ArrowFunctionExpression).params) {
      res += getTypeVariableId(param) + ', '
    }
    // remove last comma
    res = res.replace(/,\s*$/, '')
    res += ') => '
    const result = (functionDefinition as es.ArrowFunctionExpression).body
    res += getTypeVariableId(result)
    resultString += `${getTypeVariableId(functionDefinition)}: ${res}\n`
  }

  // generic function to print
  function printExpression(node: TypeAnnotatedNode<es.Node>) {
    resultString += `${getExpressionString(node)}: ${getTypeVariableId(node)}\n`
  }

  ancestor(program as es.Node, {
    Literal: printExpression,
    VariableDeclarator: printConstantDeclaration,
    Identifier: printIdentifier,
    UnaryExpression: printUnaryExpression,
    BinaryExpression: printExpression,
    LogicalExpression: printExpression,
    FunctionDeclaration: printFunctionDeclaration,
    ArrowFunctionExpression: printFunctionDefinition,
    CallExpression: printExpression,
    ConditionalExpression: printExpression,
    BlockStatement: printExpression,
    IfStatement: printExpression,
    ReturnStatement: printExpression
  })
  console.log(resultString)
}
