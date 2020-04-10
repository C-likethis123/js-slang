import { ancestor } from 'acorn-walk/dist/walk'
import { TypeAnnotatedNode, Variable, Type } from '../types'
import * as es from 'estree'

// The Type Environment
export const primitiveMap = new Map()

// Main function that will update the type environment e.g. for declarations
export function updateTypeEnvironment(program: es.Program) {
  function updateForConstantDeclaration(
    constantDeclaration: TypeAnnotatedNode<es.VariableDeclaration>
  ) {
    // e.g. Given: const x^T1 = 1^T2, Set: Γ[ x ← T2 ]
    const iden = constantDeclaration.declarations[0].id as TypeAnnotatedNode<es.Identifier>
    const idenName = iden.name

    const value = constantDeclaration.declarations[0].init as TypeAnnotatedNode<es.Node> // use es.Node because rhs could be any value/expression
    const valueTypeVariable = value.typeVariable as Variable

    if (idenName !== undefined && valueTypeVariable !== undefined) {
      primitiveMap.set(idenName, valueTypeVariable)
    }
  }

  ancestor(program as es.Node, {
    VariableDeclaration: updateForConstantDeclaration // Source 1 only has constant declaration
    // FunctionDeclaration: updateForFunctionDeclaration
  })
}

// Create Type objects for use later
const numberType: Type = {
  kind: 'primitive',
  name: 'number'
}
const booleanType: Type = {
  kind: 'primitive',
  name: 'boolean'
}
const stringType: Type = {
  kind: 'primitive',
  name: 'string'
}
const undefinedType: Type = {
  kind: 'primitive',
  name: 'undefined'
}

// Initiatize Type Environment
primitiveMap.set('-', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: numberType },
    { argumentTypes: [numberType], resultType: numberType }
  ],
  isPolymorphic: false
})
primitiveMap.set('*', {
  types: [{ argumentTypes: [numberType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('/', {
  types: [{ argumentTypes: [numberType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('%', {
  types: [{ argumentTypes: [numberType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('&&', {
  types: [{ argumentTypes: [booleanType, 'any'], resultType: 'any' }],
  isPolymorphic: false
})
primitiveMap.set('||', {
  types: [{ argumentTypes: [booleanType, 'any'], resultType: 'any' }],
  isPolymorphic: false
})
primitiveMap.set('!', {
  types: [{ argumentTypes: [booleanType], resultType: booleanType }],
  isPolymorphic: false
})

primitiveMap.set('+', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: numberType },
    { argumentTypes: [stringType, stringType], resultType: stringType }
  ],
  isPolymorphic: true
})
primitiveMap.set('===', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})
primitiveMap.set('!==', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})
primitiveMap.set('>', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})
primitiveMap.set('>=', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})
primitiveMap.set('<', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})
primitiveMap.set('<=', {
  types: [
    { argumentTypes: [numberType, numberType], resultType: booleanType },
    { argumentTypes: [stringType, stringType], resultType: booleanType }
  ],
  isPolymorphic: true
})

primitiveMap.set('display', {
  types: [
    { argumentTypes: [numberType], resultType: undefined },
    { argumentTypes: [stringType], resultType: undefined }
  ],
  isPolymorphic: false
})
primitiveMap.set('error', {
  types: [
    { argumentTypes: [numberType], resultType: undefined },
    { argumentTypes: [stringType], resultType: undefined }
  ],
  isPolymorphic: false
})
primitiveMap.set('Infinity', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('is_boolean', {
  types: [
    { argumentTypes: [numberType], resultType: booleanType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('is_function', {
  types: [
    { argumentTypes: [numberType], resultType: booleanType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('is_number', {
  types: [
    { argumentTypes: [numberType], resultType: booleanType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('is_string', {
  types: [
    { argumentTypes: [numberType], resultType: booleanType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('is_undefined', {
  types: [
    { argumentTypes: [numberType], resultType: booleanType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('math_abs', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_acos', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_acosh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_asin', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_asinh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_atan', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_atan2', {
  types: [{ argumentTypes: [numberType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_atanh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_cbrt', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_ceil', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_clz32', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_cos', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_cosh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_exp', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_expml', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_floor', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_fround', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_hypot', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_imul', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_LN2', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_LN10', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_log', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_log1p', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_log2', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_LOG2E', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_log10', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_LOG10E', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_max', {
  types: [
    { argumentTypes: [numberType], resultType: undefined },
    { argumentTypes: [stringType], resultType: undefined }
  ],
  isPolymorphic: false
})
primitiveMap.set('math_min', {
  types: [
    { argumentTypes: [numberType], resultType: undefined },
    { argumentTypes: [stringType], resultType: undefined }
  ],
  isPolymorphic: false
})
primitiveMap.set('math_PI', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_pow', {
  types: [{ argumentTypes: [numberType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_random', {
  types: [{ argumentTypes: [], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_round', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_sign', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_sin', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_sinh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_sqrt', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_SQRT1_2', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_SQRT2', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('math_tan', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_tanh', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('math_trunc', {
  types: [{ argumentTypes: [numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('NaN', {
  types: [{ argumentTypes: [numberType], resultType: undefined }],
  isPolymorphic: false
})
primitiveMap.set('parse_int', {
  types: [{ argumentTypes: [stringType, numberType], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('prompt', {
  types: [{ argumentTypes: [stringType], resultType: stringType }],
  isPolymorphic: false
})
primitiveMap.set('runtime', {
  types: [{ argumentTypes: [], resultType: numberType }],
  isPolymorphic: false
})
primitiveMap.set('stringify', {
  types: [
    { argumentTypes: [numberType], resultType: stringType },
    { argumentTypes: [stringType], resultType: stringType }
  ],
  isPolymorphic: false
})
primitiveMap.set('undefined', {
  types: [{ argumentTypes: [undefinedType], resultType: undefined }],
  isPolymorphic: false
})
