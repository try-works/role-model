/*
 * terminal.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package terminal provides functionality for terminals.
package terminal

// IsTerminal determines if the file descriptor describes a terminal.
func IsTerminal(fd uintptr) bool {
	return isTerminal(fd)
}

// IsAnsiTerminal determines if the file descriptor describes a terminal
// that has ANSI capabilities.
func IsAnsiTerminal(fd uintptr) bool {
	return isAnsiTerminal(fd)
}

type State *state

func GetState(fd uintptr) (State, error) {
	s, e := getState(fd)
	return State(s), e
}

func SetState(fd uintptr, s State) error {
	return setState(fd, s)
}

// MakeRaw puts the terminal in "raw" mode. In this mode the terminal performs
// minimal processing. The fd should be the file descriptor of the terminal input.
func MakeRaw(fd uintptr) (State, error) {
	s, e := makeRaw(fd)
	return State(s), e
}

// GetSize gets the terminal size (cols x rows).
func GetSize(fd uintptr) (int, int, error) {
	return getSize(fd)
}
