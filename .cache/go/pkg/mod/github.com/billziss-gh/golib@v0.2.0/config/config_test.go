/*
 * config_test.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package config

import (
	"io/ioutil"
	"os"
	"reflect"
	"testing"
)

func TestInternals(t *testing.T) {
	var s, rest string

	s = quote(`abc`, false)
	if `abc` != s {
		t.Error()
	}

	s = quote(`abc`, true)
	if `"abc"` != s {
		t.Error()
	}

	s = quote(`a"b"c`, false)
	if `"a\"b\"c"` != s {
		t.Error()
	}

	s, rest = unquote(`"abc""def"`)
	if `abc` != s || `"def"` != rest {
		t.Error()
	}

	s, rest = unquote(`"a\"b\"c""def"`)
	if `a"b"c` != s || `"def"` != rest {
		t.Error()
	}

	s, rest = unquote(`"abc`)
	if `abc` != s || `` != rest {
		t.Error()
	}
}

func testConfig(t *testing.T, dialect *Dialect) {
	f, err := ioutil.TempFile("", "config")
	if nil != err {
		t.Fatal(err)
	}
	defer f.Close()
	defer os.Remove(f.Name())

	conf := Config{}
	sect := Section{}

	sect["string"] = "string"
	sect["string-true"] = "true"
	sect["string-false"] = "false"
	sect["string-int0"] = "0"
	sect["string-int1"] = "0"
	sect["string-float0"] = "0.0"
	sect["string-float1"] = "1.0"
	sect["true"] = "true"
	sect["false"] = "false"
	sect["int0"] = "0"
	sect["float0"] = "0.0"
	sect["int1"] = "1"
	sect["float1"] = "1.0"
	sect["floatN"] = "1.111"
	sect["long name"] = "string"
	sect["empty"] = ""
	sect["escape\t\r\nescape"] = "escape"
	conf[""] = sect
	conf["sect1"] = sect
	conf["sect2"] = sect

	err = dialect.Write(f, conf)
	if nil != err {
		t.Error(err)
	}

	f.Seek(0, 0)
	iconf, err := dialect.Read(f)
	if nil != err {
		t.Error(err)
	}

	if !reflect.DeepEqual(conf, iconf) {
		t.Error()
	}
}

func TestConfig(t *testing.T) {
	testConfig(t, DefaultDialect)

	var dialect = &Dialect{
		AssignChars:    "=:",
		CommentChars:   ";#",
		ReadEmptyKeys:  true,
		WriteEmptyKeys: true,
		Strict:         false,
	}
	testConfig(t, dialect)
}

func TestGetSetDelete(t *testing.T) {
	conf := Config{}

	conf.Set("hello", "world")
	conf.Set("section.hello", "world")
	conf.Set("section.k", "v")
	conf.Set("section2.hello", "world")

	if "world" != conf[""]["hello"] {
		t.Error()
	}
	if "world" != conf["section"]["hello"] {
		t.Error()
	}
	if "v" != conf["section"]["k"] {
		t.Error()
	}
	if "world" != conf["section2"]["hello"] {
		t.Error()
	}

	if "world" != conf.Get("hello") {
		t.Error()
	}
	if "world" != conf.Get("section.hello") {
		t.Error()
	}
	if "v" != conf.Get("section.k") {
		t.Error()
	}
	if "world" != conf.Get("section2.hello") {
		t.Error()
	}

	conf.Delete("hello")
	conf.Delete("section.hello")
	conf.Delete("section.k")
	conf.Delete("section2.hello")

	if 0 != len(conf) {
		t.Error()
	}
}

func testTypedConfig(t *testing.T, dialect *Dialect) {
	f, err := ioutil.TempFile("", "config")
	if nil != err {
		t.Fatal(err)
	}
	defer f.Close()
	defer os.Remove(f.Name())

	conf := TypedConfig{}
	sect := TypedSection{}

	sect["string"] = "string"
	sect["string-true"] = "true"
	sect["string-false"] = "false"
	sect["string-int0"] = "0"
	sect["string-int1"] = "0"
	sect["string-float0"] = "0.0"
	sect["string-float1"] = "1.0"
	sect["true"] = true
	sect["false"] = false
	sect["int0"] = int64(0)
	sect["float0"] = 0.0
	sect["int1"] = int64(1)
	sect["float1"] = 1.0
	sect["floatN"] = 1.111
	sect["long name"] = "string"
	sect["empty"] = ""
	sect["escape\t\r\nescape"] = "escape"
	conf[""] = sect
	conf["sect1"] = sect
	conf["sect2"] = sect

	err = dialect.WriteTyped(f, conf)
	if nil != err {
		t.Error(err)
	}

	f.Seek(0, 0)
	iconf, err := dialect.ReadTyped(f)
	if nil != err {
		t.Error(err)
	}

	if !reflect.DeepEqual(conf, iconf) {
		t.Error()
	}
}

func TestTypedConfig(t *testing.T) {
	testTypedConfig(t, DefaultDialect)

	var dialect = &Dialect{
		AssignChars:    "=:",
		CommentChars:   ";#",
		ReadEmptyKeys:  true,
		WriteEmptyKeys: true,
		Strict:         false,
	}
	testTypedConfig(t, dialect)
}

func TestTypedGetSetDelete(t *testing.T) {
	conf := TypedConfig{}

	conf.Set("hello", "world")
	conf.Set("section.hello", "world")
	conf.Set("section.k", "v")
	conf.Set("section2.hello", "world")

	if "world" != conf[""]["hello"] {
		t.Error()
	}
	if "world" != conf["section"]["hello"] {
		t.Error()
	}
	if "v" != conf["section"]["k"] {
		t.Error()
	}
	if "world" != conf["section2"]["hello"] {
		t.Error()
	}

	if "world" != conf.Get("hello") {
		t.Error()
	}
	if "world" != conf.Get("section.hello") {
		t.Error()
	}
	if "v" != conf.Get("section.k") {
		t.Error()
	}
	if "world" != conf.Get("section2.hello") {
		t.Error()
	}

	conf.Delete("hello")
	conf.Delete("section.hello")
	conf.Delete("section.k")
	conf.Delete("section2.hello")

	if 0 != len(conf) {
		t.Error()
	}
}
