/*
 * shlex.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package shlex is used for simple command line splitting.
//
// Both POSIX and Windows dialects are provided.
package shlex

import (
	"strings"
	"unicode/utf8"
)

const (
	Space       = rune(' ')
	Word        = rune('A')
	DoubleQuote = rune('"')
	SingleQuote = rune('\'')
	EmptyRune   = rune(-2)
	NoEscape    = rune(-1)
)

// Dialect represents a dialect of command line splitting.
type Dialect struct {
	IsSpace    func(r rune) bool
	IsQuote    func(r rune) bool
	Escape     func(s rune, r, r0 rune) rune
	LongEscape func(s rune, r rune, line string) ([]rune, string, rune, int)
}

// Posix is the POSIX dialect of command line splitting.
// See https://tinyurl.com/26man79 for guidelines.
var Posix = Dialect{
	IsSpace: func(r rune) bool {
		return ' ' == r || '\t' == r || '\n' == r
	},
	IsQuote: func(r rune) bool {
		return '"' == r || '\'' == r
	},
	Escape: func(s rune, r, r0 rune) rune {
		if '\\' != r {
			return NoEscape
		}
		switch s {
		case Space, Word:
			if '\n' == r0 || EmptyRune == r0 {
				return EmptyRune
			}
			return r0
		case DoubleQuote:
			if '\n' == r0 || EmptyRune == r0 {
				return EmptyRune
			}
			if '$' == r0 || '`' == r0 || '"' == r0 || '\\' == r0 {
				return r0
			}
			return NoEscape
		default:
			return NoEscape
		}
	},
}

// Windows is the Windows dialect of command line splitting.
// See https://tinyurl.com/ycdj5ghh for guidelines.
var Windows = Dialect{
	IsSpace: func(r rune) bool {
		return ' ' == r || '\t' == r || '\r' == r || '\n' == r
	},
	IsQuote: func(r rune) bool {
		return '"' == r
	},
	Escape: func(s rune, r, r0 rune) rune {
		switch s {
		case Space, Word:
			if '\\' == r && '"' == r0 {
				return r0
			}
			return NoEscape
		case DoubleQuote:
			if ('\\' == r || '"' == r) && '"' == r0 {
				return r0
			}
			return NoEscape
		default:
			return NoEscape
		}
	},
	LongEscape: func(s rune, r rune, line string) ([]rune, string, rune, int) {
		// support crazy Windows backslash logic:
		// - 2n backslashes followed by a '"' produce n backslashes + start/end double quoted part
		// - 2n+1 backslashes followed by a '"' produce n backslashes + a literal '"'
		// - n backslashes not followed by a '"' produce n backslashes

		// On entry:
		// - s: current parser state (Space, Word, DoubleQuote)
		// - r: current rune (must be \ for LongEscape sequence)
		//     - this has been already added to the current token
		// - line: remaining line after r

		if '\\' != r {
			return nil, "", 0, 0
		}

		var w int
		n := 0
		for {
			r, w = utf8.DecodeRuneInString(line[n:])
			n++
			if 0 == w || '\\' != r {
				break
			}
		}

		// n is count of \ including the one on entry to this function

		if 2 > n {
			return nil, "", 0, 0
		}

		if '"' != r {
			return []rune(strings.Repeat("\\", n-1)), line[n-1:], r, w
		} else if 0 == n&1 {
			return []rune(strings.Repeat("\\", n/2-1)), line[n-1:], '"', 1
		} else {
			return []rune(strings.Repeat("\\", n/2-1)), line[n-2:], '\\', 1
		}
	},
}

// Split splits a command line into tokens according to the chosen dialect.
func (dialect *Dialect) Split(line string) (tokens []string) {
	tokens = make([]string, 0, 8)

	var token []rune
	var state = []rune{' '}

	for r, w := utf8.DecodeRuneInString(line); 0 != w; {
		line = line[w:]
		r0, w0 := utf8.DecodeRuneInString(line)

		s := state[len(state)-1]
		var e rune
		if 0 != w0 {
			e = dialect.Escape(s, r, r0)
		} else {
			e = dialect.Escape(s, r, EmptyRune)
		}
		if NoEscape != e {
			if 0 != w0 {
				line = line[w0:]
				r0, w0 = utf8.DecodeRuneInString(line)
			}
			if EmptyRune == e {
				r, w = r0, w0
				continue
			}
		}

		switch s {
		case Space:
			switch {
			case NoEscape != e:
				state = append(state, Word)
				token = append(token, e)
			case dialect.IsQuote(r):
				state = append(state, Word, r)
				token = make([]rune, 0)
			case !dialect.IsSpace(r):
				state = append(state, Word)
				token = append(token, r)
			}
		case Word:
			switch {
			case NoEscape != e:
				token = append(token, e)
			case dialect.IsQuote(r):
				state = append(state, r)
			case dialect.IsSpace(r):
				state = state[:len(state)-1]
				tokens = append(tokens, string(token))
				token = nil
			default:
				token = append(token, r)
			}
		default: // quote
			switch {
			case NoEscape != e:
				token = append(token, e)
			case s == r:
				state = state[:len(state)-1]
			default:
				token = append(token, r)
			}
		}

		if NoEscape == e && nil != dialect.LongEscape {
			if er, line1, r1, w1 := dialect.LongEscape(s, r, line); nil != er {
				token = append(token, er...)
				line = line1
				r0 = r1
				w0 = w1
			}
		}

		r, w = r0, w0
	}

	if nil != token {
		tokens = append(tokens, string(token))
	}

	return
}
