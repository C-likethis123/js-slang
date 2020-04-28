////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function simple() {
//     return 1;
// }
// simple();   // returns 1

/* ************ WORKINGS ************
 * 1. Annotate
 * function simple() { (return (1^T23))^T24 }^T25
 * simple^T26()^T27
 * 
 * 2. Type Env
 * simple <- () => T25 ~~> simple <- () => number
 * 
 * 3. Type Constraints
 * T23 = number                     // inferLiteral()
 * T24 = T23 ~~> T24 = number       // inferReturnStatement()
 * T25 = T24 ~~> T25 = number       // inferBlockStatement()
 * 
 * T26 = () => number               // inferIdentifier()
 * T27 = number                     // inferFunctionApplication() - set return type
 * ************/



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect no. of args
////////////////////////////////////////////////////////////////////////////////
// function simple() {
//     return 0;
// }
// simple(3);  // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect usage of func application
////////////////////////////////////////////////////////////////////////////////
function simple() {
    return true;
}
simple() - 1;   // !! TYPE ERR !!

/* ************ WORKINGS ************
 * 1. Annotate
 * function simple() { (return (true^T23))^T24 }^T25
 * (simple^T26()^T27 - 1^T28)^T29
 * 
 * 2. Type Env
 * simple <- () => T25 ~~> simple <- () => boolean
 * 
 * 3. Type Constraints
 * T23 = boolean                    // inferLiteral()
 * T24 = T23 ~~> T24 = boolean      // inferReturnStatement()
 * T25 = T24 ~~> T25 = boolean      // inferBlockStatement()
 * 
 * T26 = () => boolean              // inferIdentifier()
 * T27 = boolean                    // inferFunctionApplication() - set return type
 * T28 = number                     // inferLiteral()
 * T27 = number ~~> !! TYPE ERR !!  // inferBinaryExpression()
 * ************/



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function identity(x) {
//     return x;
// }
// identity(3);    // returns 3

/* ************ WORKINGS ************
 * 1. Annotate
 * function identity(x^T26) { (return (x^T23))^T24 }^T25
 * identity^T28(3^T27)^T29 
 * 
 * 2. Type Env
 * identity <- (T26) => T25 ~~> identity <- (T26) => T26
 * 
 * 3. Type Constraints
 * T23 = T26                        // inferIdentifier()
 * T24 = T23 ~~> T24 = T26          // inferReturnStatement()
 * T25 = T24 ~~> T25 = T26          // inferBlockStatement()
 * 
 * T27 = number                     // inferLiteral()
 * T28 = (T26) => T26               // inferIdentifier()
 * T27 = T30 ~~> T30 = number       // inferFunctionApplication() - check arg type (w fresh type var)
 * T29 = T30 ~~> T29 = number       // inferFunctionApplication() - set return type
 * ************/



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect usage of func application
////////////////////////////////////////////////////////////////////////////////
// function identity(x) {
//     return x;
// }
// identity(true) - 2;     // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function identity(x) {
//     return x > (x - 1);
// }
// identity(1);    // returns true



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect input to func application
////////////////////////////////////////////////////////////////////////////////
// function identity(x) {
//     return x && (x - 1);
// }
// identity(1);    // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function nested(x) {
//     if (x) {
//         return true;
//     } else {
//         return false;
//     }
// }
// nested(true) && 3;   // returns 3



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect usage of func application
////////////////////////////////////////////////////////////////////////////////
// function nested(x) {
//     if (x) {
//         return true;
//     } else {
//         return false;
//     }
// }
// nested(true) - 3;  // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect input to func application
////////////////////////////////////////////////////////////////////////////////
// function nested(x) {
//     if (x) {
//         return true;
//     } else {
//         return false;
//     }
// }
// nested(1);  // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Inconsistent return types
////////////////////////////////////////////////////////////////////////////////
// function nested(x) {
//     if (x) {
//         return true;
//     } else if (x && x) {
//         return true;
//     } else {
//         return 0;
//     }
// }   // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function multarg(x, y) {
//     if (x && y) {
//         return true;
//     } else {
//         return false;
//     }
// }
// multarg(true, false) && 5;   // returns false



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect no. of args
////////////////////////////////////////////////////////////////////////////////
// function multarg(x, y) {
//     return 0;
// }
// multarg(true);  // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Incorrect input to func application
////////////////////////////////////////////////////////////////////////////////
// function multarg(x, y) {
//     // return (x && y);    // TODO: Unable to check for this type err (for now) as we don't eval output of && operator..
//     return (x > y);
// }
// multarg(true, 3) && 5;  // !! TYPE ERR !!



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// function deepnest(x, y, z) {
//     if (x) {
//         if (y) {
//             return 1;
//         } else {
//             if (z === 0) {
//                 return 2;
//             }
//             else {
//                 return 3;
//             }
//         }
//     } else {
//         return 4;
//     }
// }
// deepnest(true, false, 0) + 10;   // returns 12



////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
// Inconsistent return types
////////////////////////////////////////////////////////////////////////////////
// function deepnest(x, y, z) {
//     if (x) {
//         if (y) {
//             return 1;
//         } else {
//             if (z === 0) {
//                 return 2;
//             }
//             else {
//                 return false;
//             }
//         }
//     } else {
//         return 4;
//     }
// }
// deepnest(true, false, 0) + 10;   // !! TYPE ERR !!



///////////////////
// TEST VAR ARGS //
///////////////////


////////////////////////////////
// display(...) <- var => var //
////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// display('a', 'b', 'c') + 'hi';  // returns 'ahi'
// display(1, 2, 3) + 4;           // returns 5

////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
////////////////////////////////////////////////////////////////////////////////
// display('a', 'b', 'c') + 1;
// display(1, 2, 3) + 'hi';


//////////////////////////////
// error(...) <- var => var //
////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// error('a', 'b') + 'hi';   // Note that Editor throws the specified error as intended
// error(1, 2) + 3;          // Note that Editor throws the specified error as intended

////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
////////////////////////////////////////////////////////////////////////////////
// error('a', 'b') + 1;
// error(1, 2) + 'hi';


//////////////////////////////////////
// math_hypot(...) <- var => number //
////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// math_hypot('a', 'b') + 3;   // returns NaN
// math_hypot(1, 2) + 3;       // returns 5.236

////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
////////////////////////////////////////////////////////////////////////////////
// math_hypot('a', 'b') + true;
// math_hypot(1, 2) + 'hi';


//////////////////////////////////////
// math_max(...) <- var => number //
////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// math_max('a', 'b') + 3;   // returns NaN
// math_max(1, 2) + 3;       // returns 5

////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
////////////////////////////////////////////////////////////////////////////////
// math_max('a', 'b') + false;
// math_max(1, 2) + 'hi';


//////////////////////////////////////
// math_min(...) <- var => number //
////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT PASS
////////////////////////////////////////////////////////////////////////////////
// math_min('a', 'b') + 3;          // returns NaN
// math_min(1, 2, 3, -2) + 3;       // returns 1

////////////////////////////////////////////////////////////////////////////////
// TEST CASE - EXPECT FAIL
////////////////////////////////////////////////////////////////////////////////
// math_min('a', 'b') + false;
// math_min(1, 2, 3) + 'hi';
