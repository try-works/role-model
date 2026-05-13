/*
 * editor.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package editor

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"unicode/utf8"

	"github.com/billziss-gh/golib/terminal"
)

const (
	_Enter     = "\r"
	_Backspace = "\b"
	_Del       = "\x7f"
	_Tab       = "\t"
	_CtrlA     = "\x01"
	_CtrlB     = "\x02"
	_CtrlC     = "\x03"
	_CtrlD     = "\x04"
	_CtrlE     = "\x05"
	_CtrlF     = "\x06"
	_CtrlK     = "\x0b"
	_CtrlL     = "\x0c"
	_CtrlN     = "\x0e"
	_CtrlP     = "\x10"
	_CtrlT     = "\x14"
	_CtrlU     = "\x15"
	_CtrlW     = "\x17"
	_CtrlZ     = "\x1a"
	_Up        = "\x1b[A"
	_Down      = "\x1b[B"
	_Right     = "\x1b[C"
	_Left      = "\x1b[D"
	_Home      = "\x1b[H"
	_End       = "\x1b[F"
	_HomeAlt   = "\x1bOH"
	_EndAlt    = "\x1bOF"
	_EscRune   = '\x1b'
)

// Editor is a command line editor with history and completion handling.
type Editor struct {
	in      *bufio.Reader
	out     *os.File
	termfd  uintptr
	raw     bool
	handler func(line string) []string
	history *History
}

type editorState struct {
	pfx, pos, clr int
}

func (self *Editor) readKey() (rune, string, error) {
	r, _, err := self.in.ReadRune()
	if nil != err {
		return 0, "", err
	}

	if _EscRune != r {
		return r, string(r), nil
	}

	r0, _, err := self.in.ReadRune()
	if nil != err {
		return 0, "", err
	}

	r1, _, err := self.in.ReadRune()
	if nil != err {
		return 0, "", err
	}

	return r, string(r) + string(r0) + string(r1), nil
}

func cursorBackward(n int) string {
	// windows only
	return strings.Repeat("\b", n)
}

func cursorForward(n int) string {
	// unix only
	if 0 < n {
		return fmt.Sprintf("\x1b[%dC", n) // CUF
	} else {
		return ""
	}
}

func cursorCrAndUp(n int, mod int) string {
	// unix only
	s := ""
	if 0 == mod {
		s += " \r"
	} else {
		s += "\r"
	}
	s += strings.Repeat("\x1bM", n) // RI
	return s
}

func (self *Editor) redisplay(echo bool, runes []rune, pos int, state *editorState) {
	if !echo {
		return
	}

	var s string
	if "windows" == runtime.GOOS {
		s += cursorBackward(state.pos)
		s += string(runes)
		if len(runes) < state.clr {
			s += strings.Repeat(" ", state.clr-len(runes))
			s += cursorBackward(state.clr - pos)
		} else {
			s += cursorBackward(len(runes) - pos)
		}
	} else {
		col, _, err := terminal.GetSize(self.termfd)
		if nil != err {
			col = 80
		}

		s += cursorCrAndUp((state.pfx+state.pos)/col, (state.pfx+state.pos)%col)
		s += cursorForward(state.pfx)
		s += string(runes)
		if len(runes) < state.clr {
			s += strings.Repeat(" ", state.clr-len(runes))
			s += cursorCrAndUp((state.pfx+state.clr)/col-(state.pfx+pos)/col,
				(state.pfx+state.clr)%col)
		} else {
			s += cursorCrAndUp((state.pfx+len(runes))/col-(state.pfx+pos)/col,
				(state.pfx+len(runes))%col)
		}
		s += cursorForward((state.pfx + pos) % col)
	}

	self.out.WriteString(s)

	state.clr = len(runes)
	state.pos = pos
}

func (self *Editor) bell() {
	self.out.WriteString("\a")
}

func (self *Editor) cycleStrings(r rune, key string,
	prunes *[]rune, ppos *int, pstate *editorState,
	next func(r rune, key string) (bool, []rune, int)) (
	newr rune, newkey string, err error) {

	var runes []rune
	var pos int
	var state editorState
	var stop bool
	state = *pstate
	for {
		stop, runes, pos = next(r, key)
		self.redisplay(true, runes, pos, &state)
		if stop {
			*prunes = runes
			*ppos = pos
			*pstate = state
			newr = r
			newkey = key
			return
		}

		r, key, err = self.readKey()
		if nil != err {
			return
		}
	}
}

func (self *Editor) rawGetLine(echo bool, prompt string) (string, error) {
	s, err := terminal.MakeRaw(self.termfd)
	if nil != err {
		return "", err
	}
	defer terminal.SetState(self.termfd, s)

	self.out.WriteString(prompt)

	var runes []rune
	var pos int
	var state = editorState{
		pfx: utf8.RuneCountInString(prompt),
	}
	for {
		r, key, err := self.readKey()
		if nil != err {
			return string(runes), err
		}

	rekey:
		switch key {
		case _Enter:
			pos = len(runes)
			self.redisplay(echo, runes, pos, &state)
			self.out.WriteString("\r\n")
			return string(runes), nil
		case _Backspace, _Del: // delete backward
			if 0 < pos {
				pos--
				runes = append(runes[:pos], runes[pos+1:]...)
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlU: // delete to beginning of line
			if 0 < pos {
				runes = runes[pos:]
				pos = 0
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlW: // delete last word
			if 0 < pos {
				i := pos
				for ; 0 < i && ' ' == runes[i-1]; i-- {
				}
				for ; 0 < i && ' ' != runes[i-1]; i-- {
				}
				runes = append(runes[:i], runes[pos:]...)
				pos = i
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlD: // delete forward or EOF on UNIX
			if 0 == len(runes) && "windows" != runtime.GOOS {
				return "", io.EOF
			}
			if len(runes) > pos {
				runes = append(runes[:pos], runes[pos+1:]...)
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlZ: // EOF on Windows
			if 0 == len(runes) && "windows" == runtime.GOOS {
				return "", io.EOF
			}
		case _CtrlK: // delete to end of line
			if len(runes) > pos {
				runes = runes[:pos]
				self.redisplay(echo, runes, pos, &state)
			} else {
				// readline does not appear to bell on Ctrl-K
				//self.bell()
			}
		case _CtrlT: // transpose characters
			if 0 < pos && 2 <= len(runes) {
				if len(runes) == pos {
					pos--
				}
				runes[pos-1], runes[pos] = runes[pos], runes[pos-1]
				pos++
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlA, _Home, _HomeAlt: // move to beginning of line
			if 0 < pos {
				pos = 0
				self.redisplay(echo, runes, pos, &state)
			}
		case _CtrlE, _End, _EndAlt: // move to end of line
			if len(runes) > pos {
				pos = len(runes)
				self.redisplay(echo, runes, pos, &state)
			}
		case _CtrlB, _Left: // move left
			if 0 < pos {
				pos--
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlF, _Right: // move right
			if len(runes) > pos {
				pos++
				self.redisplay(echo, runes, pos, &state)
			} else {
				self.bell()
			}
		case _CtrlP, _CtrlN, _Up, _Down: // previous in history, next in history
			if echo {
				dir := 0
				r, key, err = self.cycleStrings(r, key, &runes, &pos, &state,
					func(r rune, key string) (stop bool, runes0 []rune, pos0 int) {
						switch key {
						case _CtrlP, _Up:
							dir--
						case _CtrlN, _Down:
							dir++
						default:
							stop = true
						}
						if 0 <= dir {
							if 0 < dir {
								self.bell()
								dir = 0
							}
							runes0 = runes
							pos0 = pos
						} else {
							if self.history.Len() < -dir {
								self.bell()
								dir = -self.history.Len()
							}
							_, line := self.history.Get(0, dir)
							runes0 = []rune(line)
							pos0 = len(runes0)
						}
						return
					})
				if nil != err {
					return string(runes), err
				}
				goto rekey
			}
		case _Tab: // completion
			if echo {
				var completions []string
				if nil != self.handler {
					completions = self.handler(string(runes[:pos]))
				}
				if 0 < len(completions) {
					i := len(completions)
					r, key, err = self.cycleStrings(r, key, &runes, &pos, &state,
						func(r rune, key string) (stop bool, runes0 []rune, pos0 int) {
							stop = true
							switch key {
							case _Tab:
								stop = false
								i = (i + 1) % (len(completions) + 1)
								if len(completions) == i {
									self.bell()
								}
								fallthrough
							default:
								if _EscRune == r || len(completions) == i {
									runes0 = runes
									pos0 = pos
									break
								}
								runes0 = []rune(completions[i])
								pos0 = len(runes0)
								runes0 = append(runes0, runes[pos:]...)
							}
							return
						})
					if nil != err {
						return string(runes), err
					}
					goto rekey
				} else {
					self.bell()
				}
			}
		case _CtrlC: // interrupt
			runes = []rune{'^', 'C'}
			pos = len(runes)
			self.redisplay(echo, runes, pos, &state)
			return "", io.ErrUnexpectedEOF
		default:
			if ' ' <= r {
				runes = append(runes, 0)
				copy(runes[pos+1:], runes[pos:])
				runes[pos] = r
				pos++
				self.redisplay(echo, runes, pos, &state)
			}
		}
	}
}

func (self *Editor) stdGetLine() (string, error) {
	line, err := self.in.ReadString('\n')
	if nil == err {
		line = line[:len(line)-1]
	}
	return line, err
}

// GetLine gets a line from the terminal.
func (self *Editor) GetLine(prompt string) (string, error) {
	if self.raw {
		return self.rawGetLine(true, prompt)
	} else {
		return self.stdGetLine()
	}
}

// GetPass gets a password from the terminal.
func (self *Editor) GetPass(prompt string) (string, error) {
	if self.raw {
		return self.rawGetLine(false, prompt)
	} else {
		return self.stdGetLine()
	}
}

// SetCompletionHandler sets a completion handler.
func (self *Editor) SetCompletionHandler(handler func(line string) []string) {
	self.handler = handler
}

// History returns the editor's command line history.
func (self *Editor) History() *History {
	return self.history
}

// NewEditor creates a new editor.
func NewEditor(in *os.File, out *os.File) *Editor {
	return &Editor{
		in:      bufio.NewReader(terminal.NewReader(in)),
		out:     out,
		termfd:  in.Fd(),
		raw:     terminal.IsTerminal(in.Fd()) && terminal.IsTerminal(out.Fd()),
		history: NewHistory(),
	}
}

// DefaultEditor is the default Editor.
var DefaultEditor = NewEditor(os.Stdin, os.Stdout)

// GetLine gets a line from the terminal.
func GetLine(prompt string) (string, error) {
	return DefaultEditor.GetLine(prompt)
}

// GetPass gets a password from the terminal.
func GetPass(prompt string) (string, error) {
	return DefaultEditor.GetPass(prompt)
}
