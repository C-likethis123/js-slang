import { stripIndent } from '../../utils/formatters'
import {
  printTypeEnvironment,
  printTypeConstraints,
  printTypeAnnotation
} from '../../utils/inferencerUtils'
import { toTypeInferredAst } from '../../utils/testing'
import { parseError } from '../..'
import { SourceError } from '../../types'

beforeEach(() => jest.spyOn(console, 'log').mockImplementationOnce(() => {}))

afterEach(() => (console.log as any).mockRestore())

test('Infer unary operators correctly', async () => {
  const code = stripIndent`const num = 2;
  const bool = true;
  const negative = -2;
  const applyMinusToVariable = -num;
  const negated = !bool;
  const applyNegationToVariable = !bool;
  `
  const [program, typeEnvironment, constraintStore] = toTypeInferredAst(code)
  printTypeEnvironment(typeEnvironment)
  expect((console.log as any).mock.calls[(console.log as any).mock.calls.length - 1][0])
    .toMatchInlineSnapshot(`
"Printing Type Environment:
num <- number
bool <- boolean
negative <- number
applyMinusToVariable <- number
negated <- boolean
applyNegationToVariable <- boolean
"
`)

  printTypeAnnotation(program)
  expect((console.log as any).mock.calls[(console.log as any).mock.calls.length - 1][0])
    .toMatchInlineSnapshot(`
"Initial Type Annotations:
2: T23
num: T24
true: T25
bool: T26
2: T27
2: T27
-2: T29
negative: T28
num: T30
num: T30
-num: T32
applyMinusToVariable: T31
bool: T33
bool: T33
!bool: T35
negated: T34
bool: T36
bool: T36
!bool: T38
applyNegationToVariable: T37
"
`)

  printTypeConstraints(constraintStore)
  expect((console.log as any).mock.calls[(console.log as any).mock.calls.length - 1][0])
    .toMatchInlineSnapshot(`
"Printing Type Constraints:
T23 = number
T24 = number
T25 = boolean
T26 = boolean
T27 = number
T29 = number
T28 = number
T30 = number
T32 = number
T31 = number
T33 = boolean
T35 = boolean
T34 = boolean
T36 = boolean
T38 = boolean
T37 = boolean

"
`)
})

test(`Throws an error when '-' applied to the wrong type`, async () => {
  const code = stripIndent`const wrongApplicationOfMinus = -bool;`
  const errors: SourceError[] = []
  try {
    toTypeInferredAst(code)
  } catch (err) {
    errors.push(err)
  }
  expect(errors).toHaveLength(1)
  expect(parseError(errors)).toMatchInlineSnapshot(
    `"Line 1: The function expects argument #1 to be a number but got a boolean instead."`
  )
})

test(`Throws an error when '!' applied to the wrong type`, async () => {
  const code = stripIndent`!2;`
  const errors: SourceError[] = []
  try {
    toTypeInferredAst(code)
  } catch (err) {
    errors.push(err)
  }
  expect(errors).toHaveLength(1)
  expect(parseError(errors)).toMatchInlineSnapshot(
    `"Line 1: The function expects argument #1 to be a boolean but got a number instead."`
  )
})
