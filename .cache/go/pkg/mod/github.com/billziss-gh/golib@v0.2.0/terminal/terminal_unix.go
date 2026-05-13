// +build darwin linux

/*
 * terminal_unix.go
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
	"os"
	"syscall"
	"unsafe"
)

func isTerminal(fd uintptr) bool {
	var termios syscall.Termios
	_, _, err := syscall.Syscall(syscall.SYS_IOCTL,
		fd, tcgetattr, uintptr(unsafe.Pointer(&termios)))
	return 0 == err
}

func isAnsiTerminal(fd uintptr) bool {
	return isTerminal(fd) && "dumb" != os.Getenv("TERM")
}

type state struct {
	termios syscall.Termios
}

func getState(fd uintptr) (*state, error) {
	var s state
	_, _, err := syscall.Syscall(syscall.SYS_IOCTL,
		fd, tcgetattr, uintptr(unsafe.Pointer(&s.termios)))
	if 0 != err {
		return nil, err
	}
	return &s, nil
}

func setState(fd uintptr, s *state) error {
	_, _, err := syscall.Syscall(syscall.SYS_IOCTL,
		fd, tcsetattr, uintptr(unsafe.Pointer(&s.termios)))
	if 0 != err {
		return err
	}
	return nil
}

func makeRaw(fd uintptr) (*state, error) {
	olds, err := getState(fd)
	if nil != err {
		return nil, err
	}

	// See cfmakeraw(3) at https://linux.die.net/man/3/cfmakeraw
	// Note that the behaviors described in the comments below are TURNED OFF (&^=).

	s := *olds
	s.termios.Iflag &^= 0 |
		// Ignore BREAK condition on input.
		syscall.IGNBRK |
		// If IGNBRK is set, a BREAK is ignored. If it is not set but BRKINT is set,
		// then a BREAK causes the input and output queues to be flushed, and if the
		// terminal is the controlling terminal of a foreground process group, it will
		// cause a SIGINT to be sent to this foreground process group. When neither
		// IGNBRK nor BRKINT are set, a BREAK reads as a null byte ('\0'), except when
		// PARMRK is set, in which case it reads as the sequence \377 \0 \0.
		syscall.BRKINT |
		// If IGNPAR is not set, prefix a character with a parity error or
		// framing error with \377 \0. If neither IGNPAR nor PARMRK is set,
		// read a character with a parity error or framing error as \0.
		syscall.PARMRK |
		// Strip off eighth bit.
		syscall.ISTRIP |
		// Translate NL to CR on input.
		syscall.INLCR |
		// Ignore carriage return on input.
		syscall.IGNCR |
		// Translate carriage return to newline on input (unless IGNCR is set).
		syscall.ICRNL |
		// Enable XON/XOFF flow control on output.
		syscall.IXON
	s.termios.Oflag &^= 0 |
		// Enable implementation-defined output processing.
		syscall.OPOST
	s.termios.Lflag &^= 0 |
		// Echo input characters.
		syscall.ECHO |
		// If ICANON is also set, echo the NL character even if ECHO is not set.
		syscall.ECHONL |
		// Enable canonical mode.
		syscall.ICANON |
		// When any of the characters INTR, QUIT, SUSP, or DSUSP are received,
		// generate the corresponding signal.
		syscall.ISIG |
		// Enable implementation-defined input processing. This flag, as well as
		// ICANON must be enabled for the special characters EOL2, LNEXT, REPRINT,
		// WERASE to be interpreted, and for the IUCLC flag to be effective.
		syscall.IEXTEN
	s.termios.Cflag &^= 0 |
		// Character size mask. Values are CS5, CS6, CS7, or CS8.
		syscall.CSIZE |
		// Enable parity generation on output and parity checking for input.
		syscall.PARENB
	s.termios.Cflag |= 0 |
		syscall.CS8
	// Minimum number of characters for noncanonical read (MIN).
	s.termios.Cc[syscall.VMIN] = 1
	// Timeout in deciseconds for noncanonical read (TIME).
	s.termios.Cc[syscall.VTIME] = 0
	err = setState(fd, &s)
	if nil != err {
		return nil, err
	}

	return olds, nil
}

func getSize(fd uintptr) (int, int, error) {
	var info struct {
		Row    uint16
		Col    uint16
		Xpixel uint16
		Ypixel uint16
	}
	_, _, err := syscall.Syscall(syscall.SYS_IOCTL,
		fd, syscall.TIOCGWINSZ, uintptr(unsafe.Pointer(&info)))
	if 0 != err {
		return 0, 0, err
	}
	return int(info.Col), int(info.Row), nil
}
