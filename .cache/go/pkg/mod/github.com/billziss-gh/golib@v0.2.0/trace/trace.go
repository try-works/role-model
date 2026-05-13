/*
 * trace.go
 *
 * Copyright 2017-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package trace provides a simple tracing facility for Go functions.
// Given the function below, program execution will be traced whenever
// the function is entered or exited.
//
//     func fn(p1 ptype1, p2 ptype2, ...) (r1 rtyp1, r2 rtype2, ...) {
//         defer trace.Trace(0, "TRACE", p1, p2)(&r1, &r2)
//         // ...
//     }
//
// The trace facility is disabled unless the variable Verbose is true and
// the environment variable GOLIB_TRACE is set to a pattern matching one
// of the traced functions. A pattern is a a comma-separated list of
// file-style patterns containing wildcards such as * and ?.
package trace

import (
	"fmt"
	"log"
	"os"
	"path"
	"runtime"
	"strings"

	"github.com/billziss-gh/golib/terminal"
)

var (
	Verbose = false
	Pattern = os.Getenv("GOLIB_TRACE")

	Logger = log.New(terminal.Stderr, "", log.LstdFlags)
)

func traceName(skip int) string {
	if !Verbose || "" == Pattern {
		return ""
	}

	name := ""
	pc, _, _, ok := runtime.Caller(skip + 2)
	if ok {
		fn := runtime.FuncForPC(pc)
		if nil != fn {
			name = fn.Name()
		}
	}

	if "" == name {
		name = fmt.Sprintf("pc=%x", pc)
	}

	found := false
	for _, p := range strings.Split(Pattern, ",") {
		if m, _ := path.Match(p, name); m {
			found = true
			break
		}
	}
	if !found {
		return ""
	}

	if i := strings.LastIndex(name, "/"); -1 != i {
		return name[i+1:]
	}
	return name
}

func traceJoin(deref bool, vals []interface{}) string {
	rslt := ""
	for _, v := range vals {
		if deref {
			switch i := v.(type) {
			case *bool:
				rslt += fmt.Sprintf(", %#v", *i)
			case *int:
				rslt += fmt.Sprintf(", %#v", *i)
			case *int8:
				rslt += fmt.Sprintf(", %#v", *i)
			case *int16:
				rslt += fmt.Sprintf(", %#v", *i)
			case *int32:
				rslt += fmt.Sprintf(", %#v", *i)
			case *int64:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uint:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uint8:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uint16:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uint32:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uint64:
				rslt += fmt.Sprintf(", %#v", *i)
			case *uintptr:
				rslt += fmt.Sprintf(", %#v", *i)
			case *float32:
				rslt += fmt.Sprintf(", %#v", *i)
			case *float64:
				rslt += fmt.Sprintf(", %#v", *i)
			case *complex64:
				rslt += fmt.Sprintf(", %#v", *i)
			case *complex128:
				rslt += fmt.Sprintf(", %#v", *i)
			case *string:
				rslt += fmt.Sprintf(", %#v", *i)
			case *error:
				rslt += fmt.Sprintf(", %#v", *i)
			default:
				rslt += fmt.Sprintf(", %#v", v)
			}
		} else {
			rslt += fmt.Sprintf(", %#v", v)
		}
	}
	if len(rslt) > 0 {
		rslt = rslt[2:]
	}
	return rslt
}

func Trace(skip int, prfx string, vals ...interface{}) func(vals ...interface{}) {
	name := traceName(skip)
	if "" == name {
		return func(vals ...interface{}) {
		}
	}

	if "" != prfx {
		prfx = prfx + ": "
	}

	args := traceJoin(false, vals)
	return func(vals ...interface{}) {
		form := "%v{{bold blue}}%v{{off}}(%v) = %v"
		rslt := ""
		rcvr := recover()
		if nil != rcvr {
			rslt = fmt.Sprintf("!PANIC:%v", rcvr)
		} else {
			if len(vals) != 1 {
				form = "%v{{bold blue}}%v{{off}}(%v) = (%v)"
			}
			rslt = traceJoin(true, vals)
		}
		Logger.Printf(form, prfx, name, args, rslt)
		if nil != rcvr {
			panic(rcvr)
		}
	}
}

func Tracef(skip int, form string, vals ...interface{}) {
	name := traceName(skip)
	if "" == name {
		return
	}

	Logger.Printf(strings.Replace(name, "%", "%%", -1)+": "+form, vals...)
}
