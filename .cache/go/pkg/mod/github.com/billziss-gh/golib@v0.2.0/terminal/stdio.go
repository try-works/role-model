/*
 * stdio.go
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
	"os"
)

var Stdout io.Writer
var Stderr io.Writer

func init() {
	if IsAnsiTerminal(os.Stdout.Fd()) {
		Stdout = NewEscapeWriter(os.Stdout, "{{ }}", AnsiEscapeCode)
	} else {
		Stdout = NewEscapeWriter(os.Stdout, "{{ }}", NullEscapeCode)
	}

	if IsAnsiTerminal(os.Stderr.Fd()) {
		Stderr = NewEscapeWriter(os.Stderr, "{{ }}", AnsiEscapeCode)
	} else {
		Stderr = NewEscapeWriter(os.Stderr, "{{ }}", NullEscapeCode)
	}
}
