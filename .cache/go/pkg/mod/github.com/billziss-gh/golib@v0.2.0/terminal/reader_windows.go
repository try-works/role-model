/*
 * reader_windows.go
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
	"sync"
	"unicode/utf8"
	"unsafe"
)

type windowsReaderFd interface {
	Fd() uintptr
}

type windowsReader struct {
	fd  uintptr
	mux sync.Mutex
	key []byte
}

func (self *windowsReader) Read(buf []byte) (int, error) {
	if 0 == len(buf) {
		return 0, nil
	}

	self.mux.Lock()
	defer self.mux.Unlock()

	for 0 == len(self.key) {
		var rec _INPUT_RECORD
		var n uint32
		res, _, err := readConsoleInput.Call(self.fd,
			uintptr(unsafe.Pointer(&rec)), 1, uintptr(unsafe.Pointer(&n)))
		if 0 == res {
			return 0, err
		}
		if 0 == n {
			return 0, io.EOF
		}
		self.key = getKey(&rec)
	}

	buf[0] = self.key[0]
	self.key = self.key[1:]
	return 1, nil
}

var windowsVirtualKeyCodes = map[uint16][]byte{
	0x23: []byte{'\x1b', '[', 'F'}, // VK_END
	0x24: []byte{'\x1b', '[', 'H'}, // VK_HOME
	0x25: []byte{'\x1b', '[', 'D'}, // VK_LEFT
	0x26: []byte{'\x1b', '[', 'A'}, // VK_UP
	0x27: []byte{'\x1b', '[', 'C'}, // VK_RIGHT
	0x28: []byte{'\x1b', '[', 'B'}, // VK_DOWN
}

func getKey(rec *_INPUT_RECORD) []byte {
	// see Microsoft's _getch logic

	if _KEY_EVENT != rec.EventType || 0 == rec.KeyEvent.KeyDown {
		return nil
	}

	if 0 != rec.KeyEvent.UnicodeChar {
		var key [4]byte
		n := utf8.EncodeRune(key[:], rune(rec.KeyEvent.UnicodeChar))
		return key[:n]
	}

	if 0 != rec.KeyEvent.ControlKeyState&(_RIGHT_ALT_PRESSED|_LEFT_ALT_PRESSED) {
		return nil
	} else if 0 != rec.KeyEvent.ControlKeyState&(_RIGHT_CTRL_PRESSED|_LEFT_CTRL_PRESSED) {
		return nil
	} else if 0 != rec.KeyEvent.ControlKeyState&_SHIFT_PRESSED {
		return nil
	} else {
		return windowsVirtualKeyCodes[rec.KeyEvent.VirtualKeyCode]
	}
}

func newReader(r io.Reader) io.Reader {
	if f, ok := r.(windowsReaderFd); ok {
		fd := f.Fd()
		if isTerminal(fd) {
			return &windowsReader{
				fd: fd,
			}
		}
	}
	return r
}
