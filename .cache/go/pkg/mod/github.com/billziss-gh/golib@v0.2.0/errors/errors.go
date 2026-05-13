/*
 * errors.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package errors implements functions for advanced error handling.
//
// Errors in this package contain a message, a cause (an error that caused
// this error) and an attachment (any interface{}). Errors also contain
// information about the program location where they were created.
//
// Errors can be printed using the fmt.Printf verbs %s, %q, %x, %X, %v. In
// particular the %+v format will print an error complete with its stack trace.
//
// Inspired by https://github.com/pkg/errors
package errors

import (
	"bytes"
	"fmt"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

type errData struct {
	usermsg    string
	cause      error
	attachment interface{}
	pc         uintptr
}

func (err *errData) message(fn *runtime.Func) string {
	if "" == err.usermsg || ':' == err.usermsg[0] {
		name := ""
		if nil == fn {
			fn = runtime.FuncForPC(err.pc)
		}
		if nil != fn {
			name = fn.Name()
			if i := strings.LastIndex(name, "/"); -1 != i {
				name = name[i+1:]
			}
			part := strings.Split(name, ".")
			switch len(part) {
			case 1:
				// should not happen!
				name = part[0]
			case 2:
				// package.function
				name = part[1]
			default:
				// package.function.funcN...
				// package.type.function...
				name = part[1]
				if "" != part[1] && '(' == part[1][0] {
					name = part[2]
				} else {
					_, err := strconv.ParseUint(strings.TrimPrefix(part[2], "func"), 10, 32)
					if nil != err {
						name = part[2]
					}
				}
			}
		} else {
			name = fmt.Sprintf("pc=%x", err.pc)
		}
		return name + err.usermsg
	}
	return err.usermsg
}

func (err *errData) Error() string {
	if nil == err.cause {
		return err.message(nil)
	} else {
		var buf bytes.Buffer
		buf.WriteString(err.message(nil))
		for {
			cause := err.cause
			if nil == cause {
				break
			} else if e, ok := cause.(*errData); ok {
				buf.WriteString("; ")
				buf.WriteString(e.message(nil))
				err = e
			} else {
				buf.WriteString("; ")
				buf.WriteString(cause.Error())
				break
			}
		}
		return buf.String()
	}
}

func (err *errData) Format(f fmt.State, c rune) {
	switch c {
	case 'v':
		if f.Flag('+') {
			name := ""
			file := ""
			line := 0
			fn := runtime.FuncForPC(err.pc)
			if nil != fn {
				name = fn.Name()
				sepc := strings.Count(name, "/")
				if i := strings.LastIndex(name, "/"); -1 != i {
					name = name[i+1:]
				}
				file, line = fn.FileLine(err.pc)
				comp := strings.Split(filepath.ToSlash(file), "/")
				file = strings.Join(comp[len(comp)-sepc-2:], "/")
			}
			if nil == fn && nil == err.attachment {
				fmt.Fprintf(f, "%s\n    \tpc=%x",
					err.message(fn), err.pc)
			} else if nil != fn && nil == err.attachment {
				fmt.Fprintf(f, "%s\n    \t%s:%s:%d",
					err.message(fn), name, file, line)
			} else if nil == fn && nil != err.attachment {
				fmt.Fprintf(f, "%s (%v)\n    \tpc=%x",
					err.message(fn), err.attachment, err.pc)
			} else {
				fmt.Fprintf(f, "%s (%v)\n    \t%s:%s:%d",
					err.message(fn), err.attachment, name, file, line)
			}
			if nil == err.cause {
			} else if formatter, ok := err.cause.(fmt.Formatter); ok {
				fmt.Fprint(f, "\n")
				formatter.Format(f, c)
			} else {
				fmt.Fprintf(f, "\n%+v", err.cause)
			}
			break
		} else if f.Flag('#') {
			fmt.Fprintf(f, "&%#v", *err)
			break
		}
		fallthrough
	case 's', 'q', 'x', 'X':
		fmt.Fprintf(f, "%"+string(c), err.Error())
	}
}

// New creates an error with a message. Additionally the error may contain
// a cause (an error that caused this error) and an attachment (any
// interface{}). New will also record information about the program location
// where it was called.
func New(message string, args ...interface{}) error {
	var cause error
	var attachment interface{}
	if 1 <= len(args) {
		cause, _ = args[0].(error)
	}
	if 2 <= len(args) {
		attachment = args[1]
	}

	pc, _, _, _ := runtime.Caller(1)

	return &errData{message, cause, attachment, pc}
}

// Cause will return the error that caused this error (if any).
func Cause(err error) error {
	switch e := err.(type) {
	case *errData:
		return e.cause
	default:
		return nil
	}
}

// Attachment will return additional information attached to this error
// (if any).
func Attachment(err error) interface{} {
	switch e := err.(type) {
	case *errData:
		return e.attachment
	default:
		return nil
	}
}

// HasCause determines if a particular error is in the causal chain
// of this error.
func HasCause(err error, cause error) bool {
	for e := err; nil != e; e = Cause(e) {
		if e == cause {
			return true
		}
	}
	return false
}

// HasAttachment determines if a particular attachment is in the causal chain
// of this error.
func HasAttachment(err error, attachment interface{}) bool {
	for e := err; nil != e; e = Cause(e) {
		if Attachment(e) == attachment {
			return true
		}
	}
	return false
}
