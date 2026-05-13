/*
 * escape.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package terminal

import (
	"io"
	"strings"
)

// Escape replaces escape code instances within a string. Escape codes
// must be delimited using the delimiters in the delims parameter, which
// has the syntax "START END". For example, to use {{ and }} as delimiters
// specify "{{ }}".
//
// For consistency with NewEscapeWriter, Escape will discard an unterminated escape
// code. For example, if delims is "{{ }}" and the string s is "hello {{world",
// the resulting string will be "hello ".
func Escape(s string, delims string, escape func(string) string) string {
	delim := strings.Split(delims, " ")
	found := false

	var build strings.Builder
	for "" != s {
		i := strings.Index(s, delim[0])
		if -1 == i {
			break
		}

		found = true
		build.WriteString(s[:i])
		s = s[i+len(delim[0]):]

		i = strings.Index(s, delim[1])
		if -1 == i {
			return build.String()
		}

		c := s[:i]
		build.WriteString(escape(c))
		s = s[i+len(delim[1]):]
	}

	if !found {
		return s
	}

	build.WriteString(s)
	return build.String()
}

type escapeWriter struct {
	writer io.Writer
	delims []string
	escape func(string) string
	state  int
	delim  string
	code   strings.Builder
}

const (
	escapeDelim0 = iota + 1
	escapeCode
	escapeDelim1

	escapeMaxLen = 128
)

func (self *escapeWriter) Write(buf []byte) (written int, err error) {
	var i, n int
	for i = 0; len(buf) > i; i++ {
		c := buf[i]
		switch self.state {
		case 0:
			if self.delims[0][0] != c {
				continue
			}

			n, err = self.writer.Write(buf[written:i])
			written += n
			if nil != err {
				return
			}

			self.state = escapeDelim0
			self.delim = self.delims[0]
			fallthrough

		case escapeDelim0:
			written++
			if self.delim[0] == c {
				self.delim = self.delim[1:]

				if "" == self.delim {
					self.state = escapeCode
					self.code.Reset()
				}
			} else {
				written--

				b := []byte(self.delims[0][:len(self.delims[0])-len(self.delim)])
				_, err = self.writer.Write(b)
				if nil != err {
					return
				}

				self.state = 0
			}

		case escapeCode:
			if self.delims[1][0] != c {
				self.code.WriteByte(c)
				written++

				if escapeMaxLen <= self.code.Len() {
					_, err = self.writer.Write([]byte(self.delims[0] + self.code.String()))
					if nil != err {
						return
					}

					self.state = 0
				}

				continue
			}

			self.state = escapeDelim1
			self.delim = self.delims[1]
			fallthrough

		case escapeDelim1:
			written++
			if self.delim[0] == c {
				self.delim = self.delim[1:]

				if "" == self.delim {
					_, err = self.writer.Write([]byte(self.escape(self.code.String())))
					if nil != err {
						return
					}

					self.state = 0
				}
			} else {
				self.code.WriteString(self.delims[1][:len(self.delims[1])-len(self.delim)])
				self.code.WriteByte(c)
				self.state = escapeCode
			}
		}
	}

	if 0 == self.state {
		n, err = self.writer.Write(buf[written:i])
		written += n
	}

	return
}

// NewEscapeWriter replaces escape code instances within a string. Escape codes
// must be delimited using the delimiters in the delims parameter, which
// has the syntax "START END". For example, to use {{ and }} as delimiters
// specify "{{ }}".
//
// Because NewEscapeWriter is an io.Writer it cannot know when the last Write
// will be received. For this reason it will discard an unterminated escape
// code. For example, if delims is "{{ }}" and the string s is "hello {{world",
// the resulting string will be "hello ".
func NewEscapeWriter(writer io.Writer, delims string, escape func(string) string) io.Writer {
	return &escapeWriter{
		writer: writer,
		delims: strings.Split(delims, " "),
		escape: escape,
	}
}
