/*
 * errors_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package errors

import (
	goerrors "errors"
	"fmt"
	"regexp"
	"testing"
)

func TestErrors(t *testing.T) {
	e0 := New("e0")
	e1 := New("e1", e0)
	e2 := New("e2", e1, 42)

	g0 := goerrors.New("g0")
	g1 := New("g1", g0)
	g2 := New("g2", g1, "42")

	if "e2; e1; e0" != e2.Error() {
		t.Error()
	}
	if "e2; e1; e0" != fmt.Sprintf("%s", e2) {
		t.Error()
	}
	if `"e2; e1; e0"` != fmt.Sprintf("%q", e2) {
		t.Error()
	}
	if "e2; e1; e0" != fmt.Sprintf("%v", e2) {
		t.Error()
	}

	E := `e2 (42)
    	errors.TestErrors:github.com/billziss-gh/golib/errors/errors_test.go:25
e1
    	errors.TestErrors:github.com/billziss-gh/golib/errors/errors_test.go:24
e0
    	errors.TestErrors:github.com/billziss-gh/golib/errors/errors_test.go:23`
	if E != printPlusVStripVendor(e2) {
		t.Error()
	}

	if "g2; g1; g0" != g2.Error() {
		t.Error()
	}
	if "g2; g1; g0" != fmt.Sprintf("%s", g2) {
		t.Error()
	}
	if `"g2; g1; g0"` != fmt.Sprintf("%q", g2) {
		t.Error()
	}

	G := `g2 (42)
    	errors.TestErrors:github.com/billziss-gh/golib/errors/errors_test.go:29
g1
    	errors.TestErrors:github.com/billziss-gh/golib/errors/errors_test.go:28
g0`
	if G != printPlusVStripVendor(g2) {
		t.Error()
	}

	if nil != Cause(e0) {
		t.Error()
	}
	if e0 != Cause(e1) {
		t.Error()
	}
	if e1 != Cause(e2) {
		t.Error()
	}

	if nil != Cause(g0) {
		t.Error()
	}
	if g0 != Cause(g1) {
		t.Error()
	}
	if g1 != Cause(g2) {
		t.Error()
	}

	if nil != Attachment(e0) {
		t.Error()
	}
	if nil != Attachment(e1) {
		t.Error()
	}
	if 42 != Attachment(e2) {
		t.Error()
	}

	if nil != Attachment(g0) {
		t.Error()
	}
	if nil != Attachment(g1) {
		t.Error()
	}
	if "42" != Attachment(g2) {
		t.Error()
	}

	if HasCause(nil, nil) {
		t.Error()
	}

	if !HasCause(e2, e2) {
		t.Error()
	}
	if !HasCause(e2, e1) {
		t.Error()
	}
	if !HasCause(e2, e0) {
		t.Error()
	}
	if HasCause(e2, nil) {
		t.Error()
	}

	if !HasCause(g2, g2) {
		t.Error()
	}
	if !HasCause(g2, g1) {
		t.Error()
	}
	if !HasCause(g2, g0) {
		t.Error()
	}
	if HasCause(g2, nil) {
		t.Error()
	}

	e3 := New("e3", e2)
	g3 := New("g3", g2)

	if HasAttachment(nil, nil) {
		t.Error()
	}

	if !HasAttachment(e3, 42) {
		t.Error()
	}
	if !HasAttachment(e2, 42) {
		t.Error()
	}
	if HasAttachment(e1, 42) {
		t.Error()
	}
	if HasAttachment(e0, 42) {
		t.Error()
	}

	if !HasAttachment(g3, "42") {
		t.Error()
	}
	if !HasAttachment(g2, "42") {
		t.Error()
	}
	if HasAttachment(g1, "42") {
		t.Error()
	}
	if HasAttachment(g0, "42") {
		t.Error()
	}
}

func TestMessage(t *testing.T) {
	e0 := New(": e0")
	e1 := New("", e0)
	e2 := New(": e2", e1)

	if "TestMessage: e2; TestMessage; TestMessage: e0" != e2.Error() {
		t.Error()
	}

	E := `TestMessage: e2
    	errors.TestMessage:github.com/billziss-gh/golib/errors/errors_test.go:180
TestMessage
    	errors.TestMessage:github.com/billziss-gh/golib/errors/errors_test.go:179
TestMessage: e0
    	errors.TestMessage:github.com/billziss-gh/golib/errors/errors_test.go:178`
	if E != printPlusVStripVendor(e2) {
		t.Error()
	}

	func() {
		e0 := New(": e0")
		e1 := New("", e0)
		e2 := New(": e2", e1)

		if "TestMessage: e2; TestMessage; TestMessage: e0" != e2.Error() {
			t.Error()
		}

		E := `TestMessage: e2
    	errors.TestMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:199
TestMessage
    	errors.TestMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:198
TestMessage: e0
    	errors.TestMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:197`
		if E != printPlusVStripVendor(e2) {
			t.Error()
		}
	}()

	myint(42).testMessage(t)
}

type myint int

func (i myint) testMessage(t *testing.T) {
	e0 := New(": e0")
	e1 := New("", e0)
	e2 := New(": e2", e1)

	if "testMessage: e2; testMessage; testMessage: e0" != e2.Error() {
		t.Error()
	}

	E := `testMessage: e2
    	errors.myint.testMessage:github.com/billziss-gh/golib/errors/errors_test.go:224
testMessage
    	errors.myint.testMessage:github.com/billziss-gh/golib/errors/errors_test.go:223
testMessage: e0
    	errors.myint.testMessage:github.com/billziss-gh/golib/errors/errors_test.go:222`
	if E != printPlusVStripVendor(e2) {
		t.Error()
	}

	func() {
		e0 := New(": e0")
		e1 := New("", e0)
		e2 := New(": e2", e1)

		if "testMessage: e2; testMessage; testMessage: e0" != e2.Error() {
			t.Error()
		}

		E := `testMessage: e2
    	errors.myint.testMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:243
testMessage
    	errors.myint.testMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:242
testMessage: e0
    	errors.myint.testMessage.func1:github.com/billziss-gh/golib/errors/errors_test.go:241`
		if E != printPlusVStripVendor(e2) {
			t.Error()
		}
	}()
}

func printPlusVStripVendor(e error) string {
	return vendor_re.ReplaceAllString(fmt.Sprintf("%+v", e), ":")
}

var vendor_re = regexp.MustCompilePOSIX(`:.*/vendor/`)
