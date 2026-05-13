/*
 * shlex_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package shlex

import (
	"reflect"
	"strings"
	"testing"
)

func TestPosix(t *testing.T) {
	tests := []struct {
		i string
		o []string
	}{
		{"", []string{}},
		{"foo", []string{"foo"}},
		{" foo", []string{"foo"}},
		{"   foo", []string{"foo"}},
		{"foo ", []string{"foo"}},
		{"foo   ", []string{"foo"}},
		{"foo bar", []string{"foo", "bar"}},
		{"foo   bar", []string{"foo", "bar"}},
		{`foo"   "bar`, []string{"foo   bar"}},
		{`foo"   `, []string{"foo   "}},
		{`"   "foo`, []string{"   foo"}},
		{`foo "bar   baz"`, []string{"foo", "bar   baz"}},
		{`foo "bar   baz`, []string{"foo", "bar   baz"}},
		{`foo "bar   baz `, []string{"foo", "bar   baz "}},
		{`foo "bar   baz" `, []string{"foo", "bar   baz"}},
		{`foo "bar   baz" bag`, []string{"foo", "bar   baz", "bag"}},
		{`foo "bar   baz"bag`, []string{"foo", "bar   bazbag"}},
		{`foo ""`, []string{"foo", ""}},
		{`foo "" bar`, []string{"foo", "", "bar"}},
		{`foo'   'bar`, []string{"foo   bar"}},
		{`foo'   `, []string{"foo   "}},
		{`'   foo`, []string{"   foo"}},
		{`foo 'bar   baz'`, []string{"foo", "bar   baz"}},
		{`foo 'bar   baz`, []string{"foo", "bar   baz"}},
		{`foo 'bar   baz `, []string{"foo", "bar   baz "}},
		{`foo 'bar   baz' `, []string{"foo", "bar   baz"}},
		{`foo 'bar   baz' bag`, []string{"foo", "bar   baz", "bag"}},
		{`foo 'bar   baz'bag`, []string{"foo", "bar   bazbag"}},
		{`foo ''`, []string{"foo", ""}},
		{`foo '' bar`, []string{"foo", "", "bar"}},
		{`\foo`, []string{`foo`}},
		{`f\oo`, []string{`foo`}},
		{`foo\`, []string{`foo`}},
		{`\"foo`, []string{`"foo`}},
		{`f\"oo`, []string{`f"oo`}},
		{`foo\"`, []string{`foo"`}},
		{`\'foo`, []string{`'foo`}},
		{`f\'oo`, []string{`f'oo`}},
		{`foo\'`, []string{`foo'`}},
		{"foo\\\nbar", []string{"foobar"}},
		{`foo "b\ar"`, []string{`foo`, `b\ar`}},
		{`foo "b\"ar"`, []string{`foo`, `b"ar`}},
		{`foo "b'ar"`, []string{`foo`, `b'ar`}},
		{`foo "b'a'r"`, []string{`foo`, `b'a'r`}},
		{`foo"\`, []string{`foo`}},
		{"foo\"\\\nbar\"", []string{"foobar"}},
		{"foo\"\\\nbar", []string{"foobar"}},
		{`foo 'b\ar'`, []string{`foo`, `b\ar`}},
		{`foo 'b\"ar'`, []string{`foo`, `b\"ar`}},
		{`foo 'b"ar'`, []string{`foo`, `b"ar`}},
		{`foo 'b"a"r'`, []string{`foo`, `b"a"r`}},
		{`foo'\`, []string{`foo\`}},
		{"foo'\\\nbar'", []string{"foo\\\nbar"}},
		{"foo'\\\nbar", []string{"foo\\\nbar"}},
	}

	for _, test := range tests {
		o := Posix.Split(test.i)
		if !reflect.DeepEqual(test.o, o) {
			t.Errorf("expect %#v, got %#v", test.o, o)
		}
	}
}

func TestPosix2(t *testing.T) {
	// See cpython/Lib/test/test_shlex.py (branch 2.7)
	tests := `x|x|
foo bar|foo|bar|
 foo bar|foo|bar|
 foo bar |foo|bar|
foo   bar    bla     fasel|foo|bar|bla|fasel|
x y  z              xxxx|x|y|z|xxxx|
\x bar|x|bar|
\ x bar| x|bar|
\ bar| bar|
foo \x bar|foo|x|bar|
foo \ x bar|foo| x|bar|
foo \ bar|foo| bar|
foo "bar" bla|foo|bar|bla|
"foo" "bar" "bla"|foo|bar|bla|
"foo" bar "bla"|foo|bar|bla|
"foo" bar bla|foo|bar|bla|
foo 'bar' bla|foo|bar|bla|
'foo' 'bar' 'bla'|foo|bar|bla|
'foo' bar 'bla'|foo|bar|bla|
'foo' bar bla|foo|bar|bla|
blurb foo"bar"bar"fasel" baz|blurb|foobarbarfasel|baz|
blurb foo'bar'bar'fasel' baz|blurb|foobarbarfasel|baz|
""||
''||
foo "" bar|foo||bar|
foo '' bar|foo||bar|
foo "" "" "" bar|foo||||bar|
foo '' '' '' bar|foo||||bar|
\"|"|
"\""|"|
"foo\ bar"|foo\ bar|
"foo\\ bar"|foo\ bar|
"foo\\ bar\""|foo\ bar"|
"foo\\" bar\"|foo\|bar"|
"foo\\ bar\" dfadf"|foo\ bar" dfadf|
"foo\\\ bar\" dfadf"|foo\\ bar" dfadf|
"foo\\\x bar\" dfadf"|foo\\x bar" dfadf|
"foo\x bar\" dfadf"|foo\x bar" dfadf|
\'|'|
'foo\ bar'|foo\ bar|
'foo\\ bar'|foo\\ bar|
"foo\\\x bar\" df'a\ 'df"|foo\\x bar" df'a\ 'df|
\"foo|"foo|
\"foo\x|"foox|
"foo\x"|foo\x|
"foo\ "|foo\ |
foo\ xx|foo xx|
foo\ x\x|foo xx|
foo\ x\x\"|foo xx"|
"foo\ x\x"|foo\ x\x|
"foo\ x\x\\"|foo\ x\x\|
"foo\ x\x\\""foobar"|foo\ x\x\foobar|
"foo\ x\x\\"\'"foobar"|foo\ x\x\'foobar|
"foo\ x\x\\"\'"fo'obar"|foo\ x\x\'fo'obar|
"foo\ x\x\\"\'"fo'obar" 'don'\''t'|foo\ x\x\'fo'obar|don't|
"foo\ x\x\\"\'"fo'obar" 'don'\''t' \\|foo\ x\x\'fo'obar|don't|\|
'foo\ bar'|foo\ bar|
'foo\\ bar'|foo\\ bar|
foo\ bar|foo bar|
:-) ;-)|:-)|;-)|
áéíóú|áéíóú|`

	for i, l := range strings.Split(tests, "\n") {
		l = l[:len(l)-1]
		p := strings.Split(l, "|")

		test_i := p[0]
		test_o := p[1:]

		o := Posix.Split(test_i)
		if !reflect.DeepEqual(test_o, o) {
			t.Errorf("(%v) expect %#v, got %#v", i, test_o, o)
		}
	}
}

func TestWindows(t *testing.T) {
	tests := []struct {
		i string
		o []string
	}{
		{"", []string{}},
		{"foo", []string{"foo"}},
		{" foo", []string{"foo"}},
		{"   foo", []string{"foo"}},
		{"foo ", []string{"foo"}},
		{"foo   ", []string{"foo"}},
		{"foo bar", []string{"foo", "bar"}},
		{"foo   bar", []string{"foo", "bar"}},
		{`foo"   "bar`, []string{"foo   bar"}},
		{`foo"   `, []string{"foo   "}},
		{`"   "foo`, []string{"   foo"}},
		{`foo "bar   baz"`, []string{"foo", "bar   baz"}},
		{`foo "bar   baz`, []string{"foo", "bar   baz"}},
		{`foo "bar   baz `, []string{"foo", "bar   baz "}},
		{`foo "bar   baz" `, []string{"foo", "bar   baz"}},
		{`foo "bar   baz" bag`, []string{"foo", "bar   baz", "bag"}},
		{`foo "bar   baz"bag`, []string{"foo", "bar   bazbag"}},
		{`foo ""`, []string{"foo", ""}},
		{`foo "" bar`, []string{"foo", "", "bar"}},
		{`\foo`, []string{`\foo`}},
		{`f\oo`, []string{`f\oo`}},
		{`foo\`, []string{`foo\`}},
		{`\"foo`, []string{`"foo`}},
		{`f\"oo`, []string{`f"oo`}},
		{`foo\"`, []string{`foo"`}},
		{`foo "b\ar"`, []string{`foo`, `b\ar`}},
		{`foo "b\"ar"`, []string{`foo`, `b"ar`}},
		{`foo "b""ar"`, []string{`foo`, `b"ar`}},
		{`foo\\`, []string{`foo\\`}},
		{`foo\\\`, []string{`foo\\\`}},
		{`foo\\\\`, []string{`foo\\\\`}},
		{`foo\\\\\`, []string{`foo\\\\\`}},
		{`foo\\"`, []string{`foo\`}},
		{`foo\\\"`, []string{`foo\"`}},
		{`foo\\\\"`, []string{`foo\\`}},
		{`foo\\\\\"`, []string{`foo\\"`}},
		{`"foo\\"   bar`, []string{`foo\`, `bar`}},
		{`"foo\\\"   bar"`, []string{`foo\"   bar`}},
		{`"foo\\\\"   bar"`, []string{`foo\\`, `bar`}},
		{`"foo\\\\\"   bar"`, []string{`foo\\"   bar`}},
		{`"foo\\   bar"`, []string{`foo\\   bar`}},
		{`"foo\\\   bar"`, []string{`foo\\\   bar`}},
		{`"foo\\\\   bar"`, []string{`foo\\\\   bar`}},
		{`"foo\\\\\   bar"`, []string{`foo\\\\\   bar`}},
	}

	for _, test := range tests {
		o := Windows.Split(test.i)
		if !reflect.DeepEqual(test.o, o) {
			t.Errorf("expect %#v, got %#v", test.o, o)
		}
	}
}

func TestWindows2(t *testing.T) {
	// See https://tinyurl.com/ycdj5ghh
	tests := []struct {
		i string
		o []string
	}{
		{`CallMeIshmael`, []string{`CallMeIshmael`}},
		{`"Call Me Ishmael"`, []string{`Call Me Ishmael`}},
		{`Cal"l Me I"shmael`, []string{`Call Me Ishmael`}},
		{`CallMe\"Ishmael`, []string{`CallMe"Ishmael`}},
		{`"CallMe\"Ishmael"`, []string{`CallMe"Ishmael`}},
		{`"Call Me Ishmael\\"`, []string{`Call Me Ishmael\`}},
		{`"CallMe\\\"Ishmael"`, []string{`CallMe\"Ishmael`}},
		{`a\\\b`, []string{`a\\\b`}},
		{`"a\\\b"`, []string{`a\\\b`}},
		{`"\"Call Me Ishmael\""`, []string{`"Call Me Ishmael"`}},
		{`"C:\TEST A\\"`, []string{`C:\TEST A\`}},
		{`"\"C:\TEST A\\\""`, []string{`"C:\TEST A\"`}},
		{`"a b c"  d  e`, []string{`a b c`, `d`, `e`}},
		{`"ab\"c"  "\\"  d`, []string{`ab"c`, `\`, `d`}},
		{`a\\\b d"e f"g h`, []string{`a\\\b`, `de fg`, `h`}},
		{`a\\\"b c d`, []string{`a\"b`, `c`, `d`}},
		{`a\\\\"b c" d e`, []string{`a\\b c`, `d`, `e`}},
		{`"a b c""`, []string{`a b c"`}},
		{`"""CallMeIshmael"""  b  c`, []string{`"CallMeIshmael"`, `b`, `c`}},
		{`"""Call Me Ishmael"""`, []string{`"Call Me Ishmael"`}},
		{`""""Call Me Ishmael"" b c`, []string{`"Call`, `Me`, `Ishmael`, `b`, `c`}},
	}

	for _, test := range tests {
		o := Windows.Split(test.i)
		if !reflect.DeepEqual(test.o, o) {
			t.Errorf("expect %#v, got %#v", test.o, o)
		}
	}
}
