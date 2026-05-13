/*
 * config.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package config is used to read and write configuration files.
//
// Configuration files are similar to Windows INI files. They store a list
// of properties (key/value pairs); they may also be grouped into sections.
//
// The basic syntax of a configuration file is as follows:
//
//     name1=value1
//     name2=value2
//     ...
//
//     [section]
//     name3=value3
//     name4=value4
//     ...
//
// Properties not in a section are placed in the unnamed (empty "") section.
package config

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"math"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

type (
	// Section is used to store a configuration section as string properties.
	Section map[string]string

	// Config is used to store a configuration as string properties.
	//
	// When using Get, Set, Delete to manipulate properties the property names
	// follow the syntax SECTION.PROPNAME
	Config map[string]Section

	// TypedSection is used to store a configuration section as typed properties.
	TypedSection map[string]interface{}

	// TypedConfig is used to store a configuration as typed properties.
	//
	// When using Get, Set, Delete to manipulate properties the property names
	// follow the syntax SECTION.PROPNAME
	TypedConfig map[string]TypedSection
)

// Get gets a property from the configuration.
func (conf Config) Get(k string) string {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		return ""
	}
	return sect[k]
}

// Set sets a property in the configuration.
func (conf Config) Set(k string, v string) {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		sect = Section{}
		conf[s] = sect
	}
	sect[k] = v
}

// Delete deletes a property from the configuration.
func (conf Config) Delete(k string) {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		return
	}
	delete(sect, k)
	if 0 == len(sect) {
		delete(conf, s)
	}
}

// Get gets a property from the configuration.
func (conf TypedConfig) Get(k string) interface{} {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		return nil
	}
	return sect[k]
}

// Set sets a property in the configuration.
func (conf TypedConfig) Set(k string, v interface{}) {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		sect = TypedSection{}
		conf[s] = sect
	}
	sect[k] = v
}

// Delete deletes a property from the configuration.
func (conf TypedConfig) Delete(k string) {
	s := ""
	if i := strings.LastIndex(k, "."); -1 != i {
		s = k[:i]
		k = k[i+1:]
	}
	sect, ok := conf[s]
	if !ok {
		return
	}
	delete(sect, k)
	if 0 == len(sect) {
		delete(conf, s)
	}
}

// Dialect is used to represent different dialects of configuration files.
type Dialect struct {
	// AssignChars contains the characters used for property assignment.
	// The first character in AssignChars is the character used during
	// writing.
	AssignChars string

	// CommentChars contains the characters used for comments.
	CommentChars string

	// ReadEmptyKeys determines whether to read properties with missing values.
	// The properties so created will be interpretted as empty strings for Read
	// and boolean true for ReadTyped.
	ReadEmptyKeys bool

	// WriteEmptyKeys determines whether to write properties with missing values.
	// This is only important when writing boolean true properties with
	// WriteTyped; these will be written with missing values.
	WriteEmptyKeys bool

	// Strict determines whether parse errors should be reported.
	Strict bool
}

// DefaultDialect contains the default configuration dialect.
// It is compatible with Windows INI files.
var DefaultDialect = &Dialect{
	AssignChars:    "=:",
	CommentChars:   ";#",
	ReadEmptyKeys:  true,
	WriteEmptyKeys: false,
	Strict:         false,
}

func (dialect *Dialect) ReadFunc(
	reader io.Reader, fn func(sect, name string, valu interface{})) error {
	scan := bufio.NewScanner(reader)
	sect := ""
	errc := 0
	for scan.Scan() {
		line := scan.Text()
		line = strings.TrimSpace(line)
		if 0 == len(line) {
			continue
		}

		// comment
		if i := strings.IndexByte(dialect.CommentChars, line[0]); -1 != i {
			continue
		}

		// section name
		if '[' == line[0] {
			if i := strings.IndexByte(line, ']'); -1 != i {
				sect = line[1:i]
			} else {
				errc++
			}
			continue
		}

		name := ""
		valu := (interface{})(nil)

		// name
		if '"' == line[0] {
			name, line = unquote(line)
			line = strings.TrimLeftFunc(line, unicode.IsSpace)
			if 0 == len(line) {
			} else if i := strings.IndexByte(dialect.AssignChars, line[0]); -1 != i {
				line = strings.TrimLeftFunc(line[i+1:], unicode.IsSpace)
				valu = ""
			} else {
				errc++
				continue
			}
		} else {
			if i := strings.IndexAny(line, dialect.AssignChars); -1 != i {
				name = strings.TrimRightFunc(line[:i], unicode.IsSpace)
				line = strings.TrimLeftFunc(line[i+1:], unicode.IsSpace)
				valu = ""
			} else {
				name = line
				line = ""
			}
		}

		// value
		if nil == valu && !dialect.ReadEmptyKeys {
			errc++
			continue
		}
		if 0 != len(line) {
			valu = line
		}

		fn(sect, name, valu)
	}

	if err := scan.Err(); nil != err {
		return err
	}

	if 0 != errc && dialect.Strict {
		return fmt.Errorf("unable to parse %d lines", errc)
	}

	return nil
}

// Read reads a configuration from the supplied reader.
func (dialect *Dialect) Read(reader io.Reader) (Config, error) {
	conf := Config{}

	err := dialect.ReadFunc(reader, func(sect, name string, valu interface{}) {
		v, _ := valu.(string)
		if 0 < len(v) && '"' == v[0] {
			v, _ = unquote(v)
		}
		if smap, ok := conf[sect]; ok {
			smap[name] = v
		} else {
			smap = Section{}
			conf[sect] = smap
			smap[name] = v
		}
	})
	if nil != err {
		return nil, err
	}

	return conf, nil
}

// ReadTyped reads a typed configuration from the supplied reader.
func (dialect *Dialect) ReadTyped(reader io.Reader) (TypedConfig, error) {
	conf := TypedConfig{}

	err := dialect.ReadFunc(reader, func(sect, name string, valu interface{}) {
		var v interface{}
		if nil == valu {
			v = true
		} else {
			s := valu.(string)
			if 0 < len(s) && '"' == s[0] {
				s, _ = unquote(s)
				v = s
				goto done
			}
			var err error
			v, err = strconv.ParseInt(s, 0, 64)
			if nil == err {
				goto done
			}
			v, err = strconv.ParseFloat(s, 64)
			if nil == err {
				goto done
			}
			v, err = strconv.ParseBool(s)
			if nil == err {
				goto done
			}
			v = s
		}
	done:
		if smap, ok := conf[sect]; ok {
			smap[name] = v
		} else {
			smap = TypedSection{}
			conf[sect] = smap
			smap[name] = v
		}
	})
	if nil != err {
		return nil, err
	}

	return conf, nil
}

// Write writes a configuration to the supplied writer.
func (dialect *Dialect) Write(writer io.Writer, conf Config) error {
	bufw := bufio.NewWriter(writer)

	sects := make([]string, 0, len(conf))
	for sect := range conf {
		sects = append(sects, sect)
	}
	sort.Sort(sort.StringSlice(sects))

	for _, sect := range sects {
		if "" != sect {
			bufw.WriteByte('[')
			bufw.WriteString(sect)
			bufw.WriteByte(']')
			bufw.WriteByte('\n')
		}

		smap := conf[sect]
		names := make([]string, 0, len(smap))
		for name := range smap {
			names = append(names, name)
		}
		sort.Sort(sort.StringSlice(names))

		for _, name := range names {
			valu := smap[name]
			name = quote(name, false)
			valu = quote(valu, false)
			bufw.WriteString(name)
			bufw.WriteByte(dialect.AssignChars[0])
			bufw.WriteString(valu)
			bufw.WriteByte('\n')
		}

		bufw.WriteByte('\n')
	}

	return bufw.Flush()
}

// WriteTyped writes a typed configuration to the supplied writer.
func (dialect *Dialect) WriteTyped(writer io.Writer, conf TypedConfig) error {
	bufw := bufio.NewWriter(writer)

	sects := make([]string, 0, len(conf))
	for sect := range conf {
		sects = append(sects, sect)
	}
	sort.Sort(sort.StringSlice(sects))

	for _, sect := range sects {
		if "" != sect {
			bufw.WriteByte('[')
			bufw.WriteString(sect)
			bufw.WriteByte(']')
			bufw.WriteByte('\n')
		}

		smap := conf[sect]
		names := make([]string, 0, len(smap))
		for name := range smap {
			names = append(names, name)
		}
		sort.Sort(sort.StringSlice(names))

		for _, name := range names {
			valu := smap[name]
			name = quote(name, false)
			q := ""
			switch v := valu.(type) {
			case string:
				q = quote(v, true)
			case bool:
				if v && dialect.WriteEmptyKeys {
					bufw.WriteString(name)
					continue
				}
				q = strconv.FormatBool(v)
			case int:
				q = strconv.FormatInt(int64(v), 10)
			case int32:
				q = strconv.FormatInt(int64(v), 10)
			case int64:
				q = strconv.FormatInt(v, 10)
			case uint:
				q = strconv.FormatUint(uint64(v), 10)
			case uint32:
				q = strconv.FormatUint(uint64(v), 10)
			case uint64:
				q = strconv.FormatUint(v, 10)
			case float32:
				q = formatFloat(float64(v), 32)
			case float64:
				q = formatFloat(v, 64)
			default:
				q = quote(fmt.Sprintf("%v", v), false)
			}
			bufw.WriteString(name)
			bufw.WriteByte(dialect.AssignChars[0])
			bufw.WriteString(q)
			bufw.WriteByte('\n')
		}

		bufw.WriteByte('\n')
	}

	return bufw.Flush()
}

func quote(s string, force bool) string {
	i := 0
	if !force {
	testloop:
		for ; len(s) > i; i++ {
			c := s[i]
			switch {
			case 'A' <= c && c <= 'Z', 'a' <= c && c <= 'z',
				'0' <= c && c <= '9',
				'_' == c, '-' == c, '.' == c:
			default:
				break testloop
			}
		}
		if len(s) == i {
			return s
		}
	}

	buf := bytes.Buffer{}
	buf.WriteByte('"')
	buf.WriteString(s[:i])
	for ; len(s) > i; i++ {
		switch c := s[i]; c {
		case '\r':
			buf.WriteByte('\\')
			buf.WriteByte('r')
		case '\n':
			buf.WriteByte('\\')
			buf.WriteByte('n')
		case '"', '\\':
			buf.WriteByte('\\')
			buf.WriteByte(c)
		default:
			buf.WriteByte(c)
		}
	}
	buf.WriteByte('"')
	return buf.String()
}

func unquote(s string) (string, string) {
	buf := bytes.Buffer{}
	for i := 1; len(s) > i; i++ {
		switch c := s[i]; c {
		case 'r':
			if '\\' == s[i-1] {
				c = '\r'
			}
			buf.WriteByte(c)
		case 'n':
			if '\\' == s[i-1] {
				c = '\n'
			}
			buf.WriteByte(c)
		case '\\':
		case '"':
			if '\\' != s[i-1] {
				return buf.String(), s[i+1:]
			}
			fallthrough
		default:
			buf.WriteByte(c)
		}
	}
	return buf.String(), ""
}

func formatFloat(f float64, bits int) string {
	if f == math.Floor(f) {
		return strconv.FormatFloat(f, 'f', 1, bits)
	} else {
		return strconv.FormatFloat(f, 'f', -1, bits)
	}
}

func ReadFunc(
	reader io.Reader, fn func(sect, name string, valu interface{})) error {
	return DefaultDialect.ReadFunc(reader, fn)
}

// Read reads a configuration from the supplied reader
// using the default dialect.
func Read(reader io.Reader) (Config, error) {
	return DefaultDialect.Read(reader)
}

// ReadTyped reads a typed configuration from the supplied reader
// using the default dialect.
func ReadTyped(reader io.Reader) (TypedConfig, error) {
	return DefaultDialect.ReadTyped(reader)
}

// Write writes a configuration to the supplied writer
// using the default dialect.
func Write(writer io.Writer, conf Config) error {
	return DefaultDialect.Write(writer, conf)
}

// WriteTyped writes a typed configuration to the supplied writer
// using the default dialect.
func WriteTyped(writer io.Writer, conf TypedConfig) error {
	return DefaultDialect.WriteTyped(writer, conf)
}
