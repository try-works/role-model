/*
 * terminal_windows.go
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
	"syscall"
	"unsafe"
)

const (
	_ENABLE_PROCESSED_INPUT        = 0x0001
	_ENABLE_LINE_INPUT             = 0x0002
	_ENABLE_ECHO_INPUT             = 0x0004
	_ENABLE_WINDOW_INPUT           = 0x0008
	_ENABLE_MOUSE_INPUT            = 0x0010
	_ENABLE_INSERT_MODE            = 0x0020
	_ENABLE_QUICK_EDIT_MODE        = 0x0040
	_ENABLE_EXTENDED_FLAGS         = 0x0080
	_ENABLE_VIRTUAL_TERMINAL_INPUT = 0x0200

	_ENABLE_PROCESSED_OUTPUT            = 0x0001
	_ENABLE_WRAP_AT_EOL_OUTPUT          = 0x0002
	_ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
	_DISABLE_NEWLINE_AUTO_RETURN        = 0x0008
	_ENABLE_LVB_GRID_WORLDWIDE          = 0x0010

	_KEY_EVENT                = 0x0001
	_MOUSE_EVENT              = 0x0002
	_WINDOW_BUFFER_SIZE_EVENT = 0x0004
	_MENU_EVENT               = 0x0008
	_FOCUS_EVENT              = 0x0010

	_RIGHT_ALT_PRESSED  = 0x0001
	_LEFT_ALT_PRESSED   = 0x0002
	_RIGHT_CTRL_PRESSED = 0x0004
	_LEFT_CTRL_PRESSED  = 0x0008
	_SHIFT_PRESSED      = 0x0010
	_NUMLOCK_ON         = 0x0020
	_SCROLLLOCK_ON      = 0x0040
	_CAPSLOCK_ON        = 0x0080
	_ENHANCED_KEY       = 0x0100
)

type (
	_COORD struct {
		X int16
		Y int16
	}
	_SMALL_RECT struct {
		Left   int16
		Top    int16
		Right  int16
		Bottom int16
	}
	_CONSOLE_SCREEN_BUFFER_INFO struct {
		Size              _COORD
		CursorPosition    _COORD
		Attributes        uint16
		Window            _SMALL_RECT
		MaximumWindowSize _COORD
	}

	_KEY_EVENT_RECORD struct {
		KeyDown         int32
		RepeatCount     uint16
		VirtualKeyCode  uint16
		VirtualScanCode uint16
		UnicodeChar     uint16
		ControlKeyState uint32
	}
	_INPUT_RECORD struct {
		EventType uint16
		KeyEvent  _KEY_EVENT_RECORD
	}
)

var (
	dll                        = syscall.NewLazyDLL("kernel32.dll")
	getConsoleMode             = dll.NewProc("GetConsoleMode")
	setConsoleMode             = dll.NewProc("SetConsoleMode")
	getConsoleScreenBufferInfo = dll.NewProc("GetConsoleScreenBufferInfo")
	readConsoleInput           = dll.NewProc("ReadConsoleInputW")
)

func isTerminal(fd uintptr) bool {
	var mode uint32
	res, _, _ := getConsoleMode.Call(fd, uintptr(unsafe.Pointer(&mode)))
	return 0 != res
}

func isAnsiTerminal(fd uintptr) bool {
	// This is a bit hacky. On Win10 (later versions) ANSI support exists,
	// but is disabled by default. So we enable it, when asked for it!

	var mode uint32
	res, _, _ := getConsoleMode.Call(fd, uintptr(unsafe.Pointer(&mode)))
	if 0 != res {
		if 0 != mode&_ENABLE_VIRTUAL_TERMINAL_PROCESSING {
			return true
		}

		mode |= _ENABLE_VIRTUAL_TERMINAL_PROCESSING
		res, _, _ := setConsoleMode.Call(fd, uintptr(mode))
		if 0 != res {
			res, _, _ := getConsoleMode.Call(fd, uintptr(unsafe.Pointer(&mode)))
			if 0 != res {
				return 0 != mode&_ENABLE_VIRTUAL_TERMINAL_PROCESSING
			}
		}
	}

	return false
}

type state struct {
	mode uint32
}

func getState(fd uintptr) (*state, error) {
	var s state
	res, _, err := getConsoleMode.Call(fd, uintptr(unsafe.Pointer(&s.mode)))
	if 0 == res {
		return nil, err
	}
	return &s, nil
}

func setState(fd uintptr, s *state) error {
	res, _, err := setConsoleMode.Call(fd, uintptr(s.mode))
	if 0 == res {
		return err
	}
	return nil
}

func makeRaw(fd uintptr) (*state, error) {
	olds, err := getState(fd)
	if nil != err {
		return nil, err
	}

	s := *olds
	s.mode &^= 0 |
		// CTRL+C is processed by the system and is not placed in the input buffer.
		// If the input buffer is being read by ReadFile or ReadConsole, other control
		// keys are processed by the system and are not returned in the ReadFile or
		// ReadConsole buffer. If the ENABLE_LINE_INPUT mode is also enabled, backspace,
		// carriage return, and line feed characters are handled by the system.
		_ENABLE_PROCESSED_INPUT |
		// The ReadFile or ReadConsole function returns only when a carriage return
		// character is read. If this mode is disabled, the functions return when one
		// or more characters are available.
		_ENABLE_LINE_INPUT |
		// Characters read by the ReadFile or ReadConsole function are written to the
		// active screen buffer as they are read. This mode can be used only if the
		// ENABLE_LINE_INPUT mode is also enabled.
		_ENABLE_ECHO_INPUT
	err = setState(fd, &s)
	if nil != err {
		return nil, err
	}

	return olds, nil
}

func getSize(fd uintptr) (int, int, error) {
	var info _CONSOLE_SCREEN_BUFFER_INFO
	res, _, err := getConsoleScreenBufferInfo.Call(fd, uintptr(unsafe.Pointer(&info)))
	if 0 == res {
		return 0, 0, err
	}
	return int(info.Size.X), int(info.Size.Y), nil
}
